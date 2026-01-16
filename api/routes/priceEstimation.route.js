/**
 * Price Estimation Routes
 * 
 * API endpoints for AI-powered property price estimation.
 */

import express from 'express';
import {
  predictPrice,
  trainModel,
  healthCheck,
} from '../controllers/priceEstimation.controller.js';

const router = express.Router();

console.log('[priceEstimation.route] Router initialized');

/**
 * POST /api/price-estimate/predict
 * Predict price for a property
 */
router.post('/predict', (req, res, next) => {
  console.log('[priceEstimation.route] POST /predict received');
  predictPrice(req, res, next);
});

/**
 * POST /api/price-estimate/train
 * Train/retrain the model with historical data
 */
router.post('/train', trainModel);

/**
 * GET /api/price-estimate/health
 * Check AI service health and model status
 */
router.get('/health', healthCheck);

export default router;
