import express from 'express';
import { getRecommendations } from '../controllers/recommendation.controller.js';

const router = express.Router();

// GET /api/recommendations/:userId
router.get('/:userId', getRecommendations);

export default router;
