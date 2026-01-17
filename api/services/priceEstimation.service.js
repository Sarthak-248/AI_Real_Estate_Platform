/**
 * PriceEstimationService
 * 
 * Handles all business logic for AI-powered property price prediction.
 * Responsibilities:
 * - Fetch historical listings from MongoDB
 * - Convert listings into ML-ready feature vectors
 * - Manage feature encoding (city, type) and normalization
 * - Interface with FastAPI microservice for training and predictions
 * - Implement retry logic and error handling
 */

import fetch from 'node-fetch';
import Listing from '../models/listing.model.js';

let AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
if (!AI_SERVICE_URL.startsWith('http')) {
  AI_SERVICE_URL = `https://${AI_SERVICE_URL}`;
}

const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 120000; // 120s
const AI_REQUEST_RETRIES = Number(process.env.AI_REQUEST_RETRIES) || 5;

// ============================================================================
// ======================== UTILITY FUNCTIONS ================================
// ============================================================================

/**
 * Extract city name from address string.
 * Expected format: "street, city, state"
 * Falls back to address if parsing fails.
 */
function extractCity(address) {
  if (!address || typeof address !== 'string') return 'unknown';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return 'unknown';
  // Return second-to-last part (typically city)
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

/**
 * Normalize array of values to [0, 1] range.
 * Handles edge case where all values are identical.
 */
function normalize(values) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

/**
 * Calculate property age in years from createdAt timestamp.
 */
function calculatePropertyAge(createdAtDate) {
  if (!createdAtDate) return 0;
  const now = new Date();
  const createdDate = new Date(createdAtDate);
  const ageMs = now.getTime() - createdDate.getTime();
  return Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * Fetch with automatic retry on network failure or 503s.
 * Uses exponential backoff with a higher base to handle cold starts.
 */
async function fetchWithRetry(url, options = {}, retries = AI_REQUEST_RETRIES) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If service is unavailable (503) or request failed, throw to trigger retry
      if (!response.ok) {
        // Special handling for 503 (Service Unavailable) which often means "waking up"
        if (response.status === 503) {
           throw new Error(`Service waking up (503)`);
        }
        throw new Error(`AI Service returned ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      // On last attempt, throw the error
      if (attempt === retries - 1) {
        throw new Error(
          `AI Service request failed after ${retries} attempts: ${error.message}`
        );
      }

      console.log(`[PriceService] Attempt ${attempt + 1}/${retries} failed: ${error.message}. Retrying...`);

      // Aggressive backoff for cold starts: 2s, 4s, 8s, 10s...
      // Cap at 10 seconds to avoid overly long waits
      const backoffMs = Math.min(Math.pow(2, attempt) * 2000, 10000);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

// ============================================================================
// ======================== MAIN SERVICE CLASS ================================
// ============================================================================

class PriceEstimationService {
  /**
   * Check if the model is trained and ready for predictions.
   * 
   * Returns model status from the AI service.
   */
  static async checkModelStatus() {
    try {
      const response = await fetchWithRetry(`${AI_SERVICE_URL}/model-status`, {
        method: 'GET',
      });
      return await response.json();
    } catch (error) {
      console.error('[PriceEstimationService] Status check error:', error.message);
      return { is_trained: false };
    }
  }

  /**
   * Check if model needs retraining based on new listings.
   * Retrains if 5+ new listings have been added since last training.
   */
  static async checkAndRetainIfNeeded() {
    try {
      const status = await this.checkModelStatus();
      
      if (!status.is_trained) {
        console.log('[PriceEstimationService] Model not trained, initiating initial training...');
        await this.trainModel();
        return { needsRetraining: true, reason: 'Model not trained (initial)' };
      }

      // Get current listings count
      const currentCount = await Listing.countDocuments({
        regularPrice: { $exists: true, $gt: 0 },
        bedrooms: { $exists: true, $gt: 0 },
        bathrooms: { $exists: true, $gt: 0 },
      });

      // Model stores training count - we check if 5+ new listings added
      const trainingCount = status.training_count || currentCount;
      const newListingsCount = currentCount - trainingCount;

      if (newListingsCount >= 5) {
        console.log(
          `[PriceEstimationService] Detected ${newListingsCount} new listings. Retraining model...`
        );
        await this.trainModel();
        return { needsRetraining: false, message: 'Model retrained successfully', newListingsCount };
      }

      return { needsRetraining: false, message: 'Model is up to date', newListingsCount };
    } catch (error) {
      console.error('[PriceEstimationService] Retraining check error:', error.message);
      return { needsRetraining: false, error: error.message };
    }
  }

  /**
   * Train price estimation model using historical listings.
   * 
   * This method:
   * 1. Fetches all historical listings from MongoDB
   * 2. Filters for valid data (must have price, area, bedrooms, bathrooms)
   * 3. Sends training data to FastAPI service
   * 4. Caches model in AI service
   */
  static async trainModel() {
    try {
      console.log('[PriceEstimationService] Fetching historical listings...');

      // Fetch all listings with required fields
      const listings = await Listing.find({
        regularPrice: { $exists: true, $gt: 0 },
        bedrooms: { $exists: true, $gt: 0 },
        bathrooms: { $exists: true, $gt: 0 },
      }); // Removed limit to train on full dataset

      if (listings.length < 5) {
        throw new Error(
          `Insufficient data: need at least 5 listings, found ${listings.length}`
        );
      }

      console.log(
        `[PriceEstimationService] Preparing ${listings.length} listings for training...`
      );

      // Convert listings to ML-ready format
      const properties = listings.map((listing) => ({
        area_sqft: listing.areaSqFt || 1000,
        bedrooms: Number(listing.bedrooms) || 1,
        bathrooms: Number(listing.bathrooms) || 1,
        city: extractCity(listing.address),
        type: (listing.type || 'unknown').toLowerCase(),
        age_years: calculatePropertyAge(listing.createdAt),
        price: Number(listing.regularPrice) || 0,
      }));

      // Send to AI service for training
      console.log('[PriceEstimationService] Sending data to AI service for training...');

      const response = await fetchWithRetry(`${AI_SERVICE_URL}/train-price-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties }),
      });

      const result = await response.json();

      console.log('[PriceEstimationService] Model trained successfully:', result);

      return {
        success: true,
        message: 'Model trained successfully',
        metrics: result,
      };
    } catch (error) {
      console.error('[PriceEstimationService] Training error:', error.message);
      throw new Error(`Failed to train price model: ${error.message}`);
    }
  }

  /**
   * Predict price for a single property.
   * 
   * This method:
   * 1. Validates input property data
   * 2. Normalizes and encodes features
   * 3. Calls FastAPI /predict-price endpoint
   * 4. Returns predicted price with confidence range
   */
  static async predictPrice(propertyData) {
    try {
      // Validate required fields
      const requiredFields = [
        'areaSqFt',
        'bedrooms',
        'bathrooms',
        'type',
      ];

      for (const field of requiredFields) {
        if (!(field in propertyData) || propertyData[field] === null) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Extract city - either from direct city field or from address
      let city = propertyData.city;
      if (!city && propertyData.address) {
        city = extractCity(propertyData.address);
      }
      if (!city) {
        city = 'mumbai'; // Default city
      }

      // Normalize area (0-10000 sqft as reasonable bounds)
      const areaSqFt = Number(propertyData.areaSqFt) || 1000;
      const normalizedArea = Math.min(1, Math.max(0, areaSqFt / 10000));

      // Extract bedroom/bathroom counts
      const bedrooms = parseInt(propertyData.bedrooms) || 1;
      const bathrooms = parseInt(propertyData.bathrooms) || 1;

      // Create simple hash-based encoding for city and type
      // This ensures consistency across calls
      const cityCode = this._encodeCategory(city);
      
      // Explicit encoding for type to ensure "drastic" distinction
      // rent = 0, sale = 1. This helps the model split the population immediately.
      let typeCode = 0.5;
      const typeStr = (propertyData.type || 'unknown').toLowerCase();
      if (typeStr === 'rent') typeCode = 0.0;
      else if (typeStr === 'sale') typeCode = 1.0;

      // Calculate property age (default 0 for new listings)
      // Check if helper exists, if not define it inline or ensure it's imported
      // In this file scope, calculatePropertyAge function is defined at the top.
      const propertyAge = calculatePropertyAge(propertyData.createdAt || null);

      // Build feature vector matching ML service expectations
      const features = {
        normalized_area_sqft: parseFloat(normalizedArea),
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        normalized_city_code: parseFloat(cityCode),
        normalized_type_code: parseFloat(typeCode),
        property_age_years: propertyAge,
      };

      console.log('[PriceEstimationService] Predicting price with features:', features);

      let response;
      try {
        // Call AI service
        response = await fetchWithRetry(`${AI_SERVICE_URL}/predict-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features }),
        });
      } catch (error) {
        // Check if error is due to model not being trained
        const status = await this.checkModelStatus();
        if (status && !status.is_trained) {
           console.log('[PriceEstimationService] Model not trained (caught error). Training now...');
           await this.trainModel();
           // Retry prediction
           response = await fetchWithRetry(`${AI_SERVICE_URL}/predict-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ features }),
          });
        } else {
          throw error;
        }
      }

      const prediction = await response.json();

      // Validate response structure
      if (!prediction.predicted_price || !prediction.price_range) {
        throw new Error('Invalid response from AI service');
      }

      return {
        success: true,
        predicted_price: Math.round(prediction.predicted_price),
        price_range: {
          min: Math.round(prediction.price_range.min),
          max: Math.round(prediction.price_range.max),
        },
        confidence: prediction.confidence_score,
      };
    } catch (error) {
      console.error('[PriceEstimationService] Prediction error:', error.message);
      throw new Error(`Price prediction failed: ${error.message}`);
    }
  }

  /**
   * Simple consistent encoding for categorical values.
   * Matches Python implementation exactly.
   */
  static _encodeCategory(category) {
    if (!category) return 0.5;
    
    // Simple sum hash
    let sum = 0;
    for (let i = 0; i < category.length; i++) {
        sum += category.charCodeAt(i);
    }

    // Normalize to [0, 1]
    return (sum % 100) / 100.0;
  }

  /**
   * Check if AI service is healthy and model is trained.
   */
  static async healthCheck() {
    try {
      const response = await fetchWithRetry(`${AI_SERVICE_URL}/model-status`, {
        method: 'GET',
      });

      const status = await response.json();

      return {
        service_healthy: true,
        model_trained: status.is_trained,
        model_type: status.model_type,
        features: status.feature_names,
      };
    } catch (error) {
      console.error('[PriceEstimationService] Health check failed:', error.message);
      return {
        service_healthy: false,
        error: error.message,
      };
    }
  }
}

export default PriceEstimationService;
