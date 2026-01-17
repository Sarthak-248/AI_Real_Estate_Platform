import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import listingRouter from './routes/listing.route.js';
import recommendationRouter from './routes/recommendation.route.js';
import priceEstimationRouter from './routes/priceEstimation.route.js';
import contactRouter from './routes/contact.route.js';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dir = path.dirname(__filename);
const projectRoot = path.resolve(__dir, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log('Connected to MongoDB!');
  })
  .catch((err) => {
    console.log(err);
  });

const __dirname = path.resolve();
const app = express();

// ✅ Add global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
});

app.use(express.json());
app.use(cookieParser());

// ✅ Allow CORS for all origins (with credentials)
app.use(cors({
  origin: true,           // dynamically reflects the request origin
  credentials: true,      // allows cookies, Authorization headers
}));

// ✅ API routes
console.log('[API] Setting up routes...');
app.use('/api/user', userRouter);
console.log('[API] /api/user route registered');
app.use('/api/auth', authRouter);
console.log('[API] /api/auth route registered');
app.use('/api/listing', listingRouter);
console.log('[API] /api/listing route registered');
app.use('/api/recommendations', recommendationRouter);
console.log('[API] /api/recommendations route registered');
app.use('/api/price-estimate', priceEstimationRouter);
console.log('[API] /api/price-estimate route registered');
app.use('/api/contact', contactRouter);
console.log('[API] /api/contact route registered');
console.log('[API] All routes registered successfully');

// ✅ Serve static files from ../client/dist
app.use(express.static(path.join(__dirname, '/client/dist')));

// ✅ Send index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});


// ✅ Error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  // Log full error for debugging
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

// ✅ Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}!`);
});

server.on('error', (error) => {
  console.error('[ERROR] Server error:', error);
});

// ✅ Handle uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  process.exit(1);
});
