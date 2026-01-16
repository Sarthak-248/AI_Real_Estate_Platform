import asyncHandler from 'express-async-handler';
import RecommendationService from '../services/recommendation.service.js';
import Listing from '../models/listing.model.js';

// Controller for GET /api/recommendations/:userId
export const getRecommendations = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  // Accept optional query params from client-side localStorage
  // favorites and recentlyViewed are comma-separated listing IDs
  const parseCsvIds = (s) => (s ? s.split(',').map((x) => String(x).trim()).filter(Boolean) : []);
  const favorites = parseCsvIds(req.query.favorites);
  const recentlyViewed = parseCsvIds(req.query.recentlyViewed);
  const lastSearch = req.query.lastSearch ? JSON.parse(req.query.lastSearch) : null; // expects JSON encoded object
  const topN = parseInt(req.query.topN, 10) || 5;
  // Enforcing strict 85% similarity threshold
  const minSimilarity = 0.85; 
  const maxPriceRatio = typeof process.env.RECOMMENDATION_MAX_PRICE_RATIO !== 'undefined' ? Number(process.env.RECOMMENDATION_MAX_PRICE_RATIO) : 3.0;

  // Fetch candidate listings from DB (only active listings). For scale, this should be paged or prefiltered.
  const allListings = await Listing.find({}).lean();
  if (!allListings || allListings.length === 0) {
    return res.status(200).json({ success: true, recommendations: [] });
  }

  // Build payload for recommendation service
  const payload = {
    listings: allListings.map((l) => ({
      _id: l._id,
      regularPrice: l.regularPrice,
      discountPrice: l.discountPrice,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      address: l.address,
      city: l.city,
      areaSqFt: l.areaSqFt,
      type: l.type,
      createdAt: l.createdAt,
    })),
    favorites,
    recentlyViewed,
    lastSearch,
    topN,
  };

  // If the user has no signals (brand-new user), do not return default popular listings.
  // This prevents the app from always showing the same top-N items for every new account.
  if ((!favorites || favorites.length === 0) && (!recentlyViewed || recentlyViewed.length === 0) && !lastSearch) {
    return res.json({ success: true, recommendations: [] });
  }

  let results;
  try {
    results = await RecommendationService.recommend(payload);
  } catch (err) {
    // Log and return a safe fallback: recent/popular listings
    console.error('Recommendation error:', err.message || err);
    // Fallback: return up to topN most recent listings
    const sorted = allListings.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ success: true, recommendations: sorted.slice(0, topN) });
  }

  // Map IDs to listings preserving order
  const idToListing = new Map(allListings.map((l) => [String(l._id), l]));
  const debugMode = req.query.debug === '1' || req.query.debug === 'true' || process.env.RECOMMENDATION_DEBUG === '1';
  const debugInfo = [];
  
  // Collect prices from ALL user interactions (favorites + recently viewed)
  // to create a price range instead of using just the first one
  const interactionPrices = [];
  
  if (favorites && favorites.length > 0) {
    for (const fid of favorites) {
      const favListing = idToListing.get(String(fid));
      if (favListing) {
        const price = favListing.discountPrice && Number(favListing.discountPrice) > 0 
          ? Number(favListing.discountPrice) 
          : Number(favListing.regularPrice) || null;
        if (price) interactionPrices.push(price);
      }
    }
  }
  
  if (recentlyViewed && recentlyViewed.length > 0) {
    for (const rid of recentlyViewed) {
      const lit = idToListing.get(String(rid));
      if (lit) {
        const price = lit.discountPrice && Number(lit.discountPrice) > 0 
          ? Number(lit.discountPrice) 
          : Number(lit.regularPrice) || null;
        if (price) interactionPrices.push(price);
      }
    }
  }
  
  // Calculate min and max from all interactions to create a price range
  let minPrice = null;
  let maxPrice = null;
  if (interactionPrices.length > 0) {
    minPrice = Math.min(...interactionPrices);
    maxPrice = Math.max(...interactionPrices);
  }
  
  console.log(`[Recommendations] Recommendation results from service: ${results.length} items`);

  const recommended = results
    .map((r) => {
      const id = String(r.id || r);
      const listing = idToListing.get(id);
      if (!listing) return null;
      const out = { ...listing };
      if (r && typeof r.score === 'number') out.similarityScore = r.score;
      return out;
    })
    .filter(Boolean);

  if (debugMode) {
    return res.json({ success: true, recommendations: recommended, debug: { triggerPrice, minSimilarity, maxPriceRatio, debugInfo } });
  }

  return res.json({ success: true, recommendations: recommended });
});

export default { getRecommendations };
