import fetch from 'node-fetch';

const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 3000;
const AI_REQUEST_RETRIES = Number(process.env.AI_REQUEST_RETRIES) || 2;

// Parse and format the AI Service URL
let AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
if (!AI_SERVICE_URL.startsWith('http')) {
  AI_SERVICE_URL = `https://${AI_SERVICE_URL}`;
}

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

function extractCity(address) {
  if (!address || typeof address !== 'string') return 'unknown';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return 'unknown';
  return parts.length === 1 ? parts[0] : parts[parts.length - 2] || parts[parts.length - 1];
}

function areaFromListing(listing) {
  if (listing.areaSqFt && !isNaN(Number(listing.areaSqFt))) return Number(listing.areaSqFt);
  // fallback heuristic: assume 400 sqft per bedroom
  return (Number(listing.bedrooms) || 1) * 400;
}

class RecommendationService {
  // Build feature vectors and call AI microservice
  static async recommend({ listings, favorites = [], recentlyViewed = [], lastSearch = null, topN = 5 }) {
    // Compute base numeric fields
    const prices = listings.map((l) => (l.discountPrice && l.discountPrice > 0 ? l.discountPrice : l.regularPrice || 0));
    const areas = listings.map((l) => areaFromListing(l));
    const bathroomsArr = listings.map((l) => Number(l.bathrooms) || 0);
    const bedroomsArr = listings.map((l) => Number(l.bedrooms) || 0);

    const normPrices = normalize(prices);
    const normAreas = normalize(areas);
    const normBathrooms = normalize(bathroomsArr);
    const normBedrooms = normalize(bedroomsArr);

    // Build encodings for city and property type
    const cities = Array.from(new Set(listings.map((l) => extractCity(l.address).toLowerCase())));
    const types = Array.from(new Set(listings.map((l) => (l.type || 'unknown').toLowerCase())));

    const cityIndex = (city) => Math.max(0, cities.indexOf((city || 'unknown').toLowerCase())); // 0-based
    const typeIndex = (t) => Math.max(0, types.indexOf((t || 'unknown').toLowerCase()));

    // Normalize categorical indices into [0,1]
    const citiesCount = Math.max(1, cities.length - 1);
    const typesCount = Math.max(1, types.length - 1);

    // Weight priorities (higher = more important)
    // Updated based on user feedback: PRICE > LOCATION > AREA > BATH/BED
    const WEIGHTS = {
      price: 15.0,     // Doubled priority
      city: 12.0,      // High priority (location)
      area: 8.0,       // Medium-High priority
      bathrooms: 4.0,  // Lower priority
      bedrooms: 4.0,   // Lower priority
      type: 2.0,       // Lowest
    };

    const features = listings.map((l, idx) => {
      const cityIdx = cityIndex(l.city || extractCity(l.address));
      const typeIdx = typeIndex(l.type);
      const cityNorm = cities.length > 1 ? cityIdx / citiesCount : 0;
      const typeNorm = types.length > 1 ? typeIdx / typesCount : 0;

      // base vector (normalized numeric + normalized categorical)
      const baseVec = [
        normPrices[idx],
        cityNorm,
        normAreas[idx],
        normBedrooms[idx],
        normBathrooms[idx],
        typeNorm,
      ];

      // apply weights to emphasize priority: price > city > area > bedrooms > bathrooms > type
      const weighted = [
        baseVec[0] * WEIGHTS.price,
        baseVec[1] * WEIGHTS.city,
        baseVec[2] * WEIGHTS.area,
        baseVec[3] * WEIGHTS.bedrooms,
        baseVec[4] * WEIGHTS.bathrooms,
        baseVec[5] * WEIGHTS.type,
      ];

      return {
        id: String(l._id),
        vector: weighted,
        createdAt: l.createdAt,
      };
    });

    const idToFeature = new Map(features.map((f) => [String(f.id), f]));

    // Strategy: Collect unfiltered recommendation candidates from each interaction source (Favorites & RecentlyViewed).
    // Then merge them using a Round-Robin strategy to ensure diversity.
    const collectedRecsGroups = []; // Array of { sourceId, recs: [] }
    const seenIds = new Set();
    
    // Convert favorites and recentlyViewed to Set of string IDs for efficient lookup
    const favSet = new Set(favorites.map(String));
    const viewedSet = new Set(recentlyViewed.map(String));
    const userInteractionSet = new Set([...favSet, ...viewedSet]);

    console.log(`[Recommendations] Starting accumulation: ${favSet.size} liked, ${viewedSet.size} viewed`);

    // Helper to process a source list and gather candidates
    const processSourceList = async (sourceIds, label) => {
        if (!sourceIds || sourceIds.length === 0) return;
        console.log(`[Recommendations] Processing ${sourceIds.length} ${label} properties...`);
        
        for (const srcId of sourceIds) {
            const feature = idToFeature.get(String(srcId));
            if (!feature) continue;

            try {
                // Fetch ample candidates
                const recs = await RecommendationService.callAiService({ 
                    features, 
                    userVector: feature.vector, 
                    topN: Math.max(topN * 5, 20) 
                });
                
                const validRecs = [];
                const interactionListing = listings.find(l => String(l._id) === String(srcId));
                
                if (!interactionListing) console.warn(`[Recommendations] WARNING: Source listing ${srcId} not found.`);

                for (const rec of recs) {
                    const recListing = listings.find(l => String(l._id) === rec.id);
                    if (!recListing) continue;

                    // Hard Price Constraint
                    if (interactionListing) {
                         const intPrice = interactionListing.discountPrice > 0 ? interactionListing.discountPrice : interactionListing.regularPrice || 0;
                         const recPrice = recListing.discountPrice > 0 ? recListing.discountPrice : recListing.regularPrice || 0;
                         if (intPrice > 0 && recPrice > 0) {
                             const ratio = recPrice / intPrice;
                             if (ratio < 0.5 || ratio > 2.0) continue;
                         }
                    }

                    // Similarity Threshold
                    if (rec.score < 0.85) continue;

                    // Skip self and already interacted
                    if (userInteractionSet.has(rec.id)) continue;

                    validRecs.push(rec);
                }

                if (validRecs.length > 0) {
                    collectedRecsGroups.push(validRecs);
                }
            } catch (err) {
                console.error(`[Recommendations] Error processing ${label} ${srcId}:`, err.message);
            }
        }
    };

    // 1) Process Favorites
    await processSourceList(favorites, 'liked');
    
    // 2) Process Recently Viewed
    await processSourceList(recentlyViewed, 'viewed');

    // 3) Round-Robin Merge
    const allRecs = [];
    let activeGenerators = collectedRecsGroups.map(group => group[Symbol.iterator]());
    
    while (activeGenerators.length > 0) {
        const nextGenList = [];
        for (const gen of activeGenerators) {
            let found = false;
            // Try to find next unseen item from this group
            let nextVal = gen.next();
            while (!nextVal.done) {
                const rec = nextVal.value;
                if (!seenIds.has(rec.id)) {
                    allRecs.push(rec);
                    seenIds.add(rec.id);
                    found = true;
                    // Keep this generator alive for next round
                    nextGenList.push(gen); 
                    break; // Move to next group after taking one
                }
                nextVal = gen.next();
            }
            // If generator finished or yielded only seen items, it's dropped from nextGenList
            if (!found && !nextVal.done) {
                 // We didn't pick anything but it's not done?
                 // That means all remaining items in this group were seen.
                 // We can drop it.
            }
        }
        activeGenerators = nextGenList;
    }

    console.log(`[Recommendations] Final accumulated count: ${allRecs.length}`);
    
    // 4) Return topN
    if (allRecs.length > 0) {
      return allRecs.slice(0, topN);
    }

    // 5) Fallback: lastSearch derived vector

    // 4) Fallback: lastSearch derived vector
    if (lastSearch) {
      const searchBase = [0, 0, 0, 0, 0, 0];
      if (lastSearch.budget) {
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices) || minP || 1;
        const p = Number(lastSearch.budget);
        searchBase[0] = maxP === minP ? 0.5 : (p - minP) / (maxP - minP);
      }
      if (lastSearch.city) {
        const ci = cityIndex(lastSearch.city);
        searchBase[1] = cities.length > 1 ? ci / citiesCount : 0;
      }
      if (lastSearch.areaMin || lastSearch.areaMax) {
        const minA = lastSearch.areaMin || lastSearch.areaMax || 0;
        const maxA = lastSearch.areaMax || lastSearch.areaMin || 0;
        const a = (Number(minA) + Number(maxA)) / (minA && maxA ? 2 : 1);
        const minArea = Math.min(...areas);
        const maxArea = Math.max(...areas) || minArea || 1;
        searchBase[2] = maxArea === minArea ? 0.5 : (a - minArea) / (maxArea - minArea);
      }
      if (lastSearch.bedrooms) searchBase[3] = Number(lastSearch.bedrooms) || 0;

      const searchWeighted = [
        searchBase[0] * WEIGHTS.price,
        searchBase[1] * WEIGHTS.city,
        searchBase[2] * WEIGHTS.area,
        searchBase[3] * WEIGHTS.bedrooms,
        searchBase[4] * WEIGHTS.bathrooms,
        searchBase[5] * WEIGHTS.type,
      ];

      return RecommendationService.callAiService({ features, userVector: searchWeighted, topN });
    }

    // 5) Cold start
    try {
      const HOURS = 24;
      const cutoff = Date.now() - HOURS * 60 * 60 * 1000;
      const filtered = features.filter((f) => {
        const t = f.createdAt ? new Date(f.createdAt).getTime() : 0;
        return t <= cutoff;
      });

      const candidateFeatures = filtered.length > 0 ? filtered : features;
      return RecommendationService.callAiService({ features: candidateFeatures, userVector: null, topN });
    } catch (err) {
      return RecommendationService.callAiService({ features, userVector: null, topN });
    }
  }

  static async callAiService({ features, userVector = null, topN = 5 }) {
    const url = `${AI_SERVICE_URL.replace(/\/$/, '')}/recommend`;
    const body = { properties: features, user_vector: userVector, top_n: topN };
    console.log(`[AI Service] POST ${url}`);
    console.log(`[AI Service] userVector:`, userVector ? `[${userVector.length} features]` : 'null');
    console.log(`[AI Service] features count:`, features.length);

    // Helper to perform fetch with timeout using AbortController
    const doFetch = async (signal) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI service error: ${res.status} ${text}`);
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.recommendations)) {
        throw new Error('AI service returned invalid payload');
      }

      // Normalize recommendations to array of { id, score }
      const recs = data.recommendations;
      if (recs.length === 0) return [];
      if (typeof recs[0] === 'string') {
        return recs.map((id) => ({ id, score: null }));
      }
      if (typeof recs[0] === 'object' && recs[0].id) {
        return recs.map((r) => ({ id: String(r.id), score: typeof r.score === 'number' ? r.score : null }));
      }

      throw new Error('AI service returned recommendations in unknown format');
    };

    // Retry with exponential backoff
    let attempt = 0;
    let lastErr = null;
    while (attempt <= AI_REQUEST_RETRIES) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
      try {
        console.log(`[AI Service] Attempt ${attempt + 1}/${AI_REQUEST_RETRIES + 1}...`);
        const res = await doFetch(controller.signal);
        clearTimeout(timer);
        console.log(`[AI Service] Success! Returned ${res.length} recommendations.`);
        return res;
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        console.error(`[AI Service] Attempt ${attempt + 1} failed:`, err.message);
        // If aborted due to timeout, mark as retriable
        if (err.name === 'AbortError' || /timeout/i.test(err.message) || /ECONNRESET|ECONNREFUSED/.test(err.message)) {
          attempt += 1;
          const backoff = 100 * Math.pow(2, attempt);
          console.log(`[AI Service] Retrying in ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        // Non-retriable error: break
        console.error(`[AI Service] Non-retriable error, giving up.`);
        throw err;
      }
    }

    console.error(`[AI Service] All attempts failed.`);
    throw new Error(`AI service unavailable after ${AI_REQUEST_RETRIES + 1} attempts: ${lastErr?.message}`);
  }
}

export default RecommendationService;
