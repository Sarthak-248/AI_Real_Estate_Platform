/**
 * Price Estimation Controller
 * 
 * Handles HTTP requests for price prediction and model training.
 * Acts as a bridge between frontend requests and the PriceEstimationService.
 */

import PriceEstimationService from '../services/priceEstimation.service.js';

/**
 * POST /api/price-estimate/predict
 * 
 * Predicts fair market price for a property based on its attributes.
 * 
 * Request body:
 * {
 *   "areaSqFt": 2500,
 *   "bedrooms": 3,
 *   "bathrooms": 2,
 *   "address": "123 Main St, Denver, CO",
 *   "type": "sale",
 *   "createdAt": "2024-01-01T00:00:00Z" (optional)
 * }
 * 
 * Response on success (200):
 * {
 *   "success": true,
 *   "predicted_price": 450000,
 *   "price_range": { "min": 382500, "max": 517500 },
 *   "confidence": 0.8
 * }
 * 
 * Response on error (400/500):
 * {
 *   "success": false,
 *   "statusCode": 400,
 *   "message": "Error details here"
 * }
 */
export async function predictPrice(req, res, next) {
  try {
    console.log('[predictPrice] Request received');
    const propertyData = req.body;
    console.log('[predictPrice] Property data:', propertyData);

    // Validate that property data exists
    if (!propertyData || Object.keys(propertyData).length === 0) {
      console.log('[predictPrice] Empty property data');
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Property data is required',
      });
    }

    console.log('[predictPrice] Calling service.predictPrice');

    // Call service to predict price
    const prediction = await PriceEstimationService.predictPrice(propertyData);

    console.log('[predictPrice] Got prediction:', prediction);

    return res.status(200).json({
      success: true,
      ...prediction,
    });
  } catch (error) {
    console.error('[predictPrice error]:', error.message);
    console.error('[predictPrice stack]:', error.stack);

    // Return user-friendly error messages
    const statusCode = error.message.includes('Missing required field') ? 400 : 503;
    const message =
      statusCode === 400
        ? error.message
        : 'AI service unavailable. Please try again later.';

    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
    });
  }
}

/**
 * POST /api/price-estimate/train
 * 
 * Trains the price estimation model using historical listings.
 * Should be called periodically to keep the model fresh.
 * 
 * Response on success (200):
 * {
 *   "success": true,
 *   "message": "Model trained successfully",
 *   "metrics": { "samples_trained": 500, "r2_score": 0.82, ... }
 * }
 * 
 * Response on error (400/500):
 * {
 *   "success": false,
 *   "statusCode": 400,
 *   "message": "Error details here"
 * }
 */
export async function trainModel(req, res, next) {
  try {
    console.log('[Controller] START: trainModel called');
    const result = await PriceEstimationService.trainModel();
    console.log('[Controller] SUCCESS: Training completed', result);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Controller] ERROR: trainModel caught error');
    console.error('[Controller] Error name:', error.name);
    console.error('[Controller] Error message:', error.message);
    console.error('[Controller] Error stack:', error.stack);

    return res.status(503).json({
      success: false,
      statusCode: 503,
      message: `Model training failed: ${error.message}`,
    });
  }
}

/**
 * GET /api/price-estimate/health
 * 
 * Health check endpoint to verify AI service connectivity
 * and model training status.
 * 
 * Response (200):
 * {
 *   "service_healthy": true,
 *   "model_trained": true,
 *   "model_type": "Linear Regression",
 *   "features": ["normalized_area_sqft", "bedrooms", ...]
 * }
 * 
 * Response if service down (503):
 * {
 *   "service_healthy": false,
 *   "error": "Connection refused"
 * }
 */
export async function healthCheck(req, res, next) {
  try {
    const status = await PriceEstimationService.healthCheck();

    const statusCode = status.service_healthy ? 200 : 503;

    return res.status(statusCode).json(status);
  } catch (error) {
    console.error('healthCheck error:', error);

    return res.status(503).json({
      service_healthy: false,
      error: error.message,
    });
  }
}
