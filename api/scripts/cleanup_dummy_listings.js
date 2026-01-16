import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Listing from '../models/listing.model.js';

// Load root .env to get MONGO
dotenv.config({ path: 'c:/sarthak_project/.env' });

const MONGO = process.env.MONGO;
if (!MONGO) {
  console.error('MONGO env var not set');
  process.exit(1);
}

async function cleanup() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB for cleanup');

  const res = await Listing.deleteMany({ name: { $regex: '^DUMMY_' } });
  console.log('Deleted count:', res.deletedCount);

  await mongoose.disconnect();
  console.log('Disconnected');
}

cleanup().catch((err) => {
  console.error('Cleanup error', err);
  process.exit(1);
});
