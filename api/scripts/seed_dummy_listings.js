import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Listing from '../models/listing.model.js';

// Load project root .env explicitly to ensure MONGO is available
dotenv.config({ path: 'c:/sarthak_project/.env' });

const MONGO = process.env.MONGO;

if (!MONGO) {
  console.error('MONGO env var not set');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB for seeding');

  // Remove previous dummy entries with name starting with DUMMY_
  await Listing.deleteMany({ name: { $regex: '^DUMMY_' } });

  const listings = [
    {
      name: 'DUMMY_Modern Apartment - CityA',
      description: 'A modern apartment in CityA',
      address: '101 Main St, CityA, State',
      regularPrice: 1200,
      discountPrice: 0,
      bathrooms: 1,
      bedrooms: 1,
      furnished: true,
      parking: false,
      type: 'rent',
      offer: false,
      imageUrls: [],
      userRef: 'seed',
    },
    {
      name: 'DUMMY_Spacious House - CityB',
      description: 'Family house in CityB',
      address: '22 Oak Ave, Neighborhood, CityB',
      regularPrice: 250000,
      discountPrice: 0,
      bathrooms: 2,
      bedrooms: 4,
      furnished: false,
      parking: true,
      type: 'sale',
      offer: false,
      imageUrls: [],
      userRef: 'seed',
    },
    {
      name: 'DUMMY_Cozy Studio - CityA',
      description: 'Cozy studio near downtown CityA',
      address: '5 Market Rd, CityA',
      regularPrice: 900,
      discountPrice: 0,
      bathrooms: 1,
      bedrooms: 1,
      furnished: true,
      parking: false,
      type: 'rent',
      offer: false,
      imageUrls: [],
      userRef: 'seed',
    },
    {
      name: 'DUMMY_Lux Condo - CityC',
      description: 'Luxury condo with great views',
      address: '200 Lakeview Dr, CityC',
      regularPrice: 450000,
      discountPrice: 420000,
      bathrooms: 3,
      bedrooms: 3,
      furnished: true,
      parking: true,
      type: 'sale',
      offer: true,
      imageUrls: [],
      userRef: 'seed',
    },
    {
      name: 'DUMMY_Suburban Home - CityB',
      description: 'Comfortable suburban home',
      address: '77 Pine St, CityB',
      regularPrice: 180000,
      discountPrice: 0,
      bathrooms: 2,
      bedrooms: 3,
      furnished: false,
      parking: true,
      type: 'sale',
      offer: false,
      imageUrls: [],
      userRef: 'seed',
    },
    {
      name: 'DUMMY_Penthouse - CityA',
      description: 'Penthouse with skyline view',
      address: '1 Skyline Blvd, CityA',
      regularPrice: 3200,
      discountPrice: 3000,
      bathrooms: 2,
      bedrooms: 2,
      furnished: true,
      parking: true,
      type: 'rent',
      offer: true,
      imageUrls: [],
      userRef: 'seed',
    },
  ];

  const created = await Listing.insertMany(listings);
  console.log('Inserted dummy listings:');
  created.forEach((c) => console.log(String(c._id), '-', c.name));

  await mongoose.disconnect();
  console.log('Disconnected');
}

seed().catch((err) => {
  console.error('Seeding error', err);
  process.exit(1);
});
