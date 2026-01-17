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
  // User requested clearing DB, but let's stick to cleaning DUMMY_ or just everything if they want
  // Since user said "I deleted previous every lisitng", the DB is likely empty.
  // We will delete any residual DUMMY_ items just in case.
  await Listing.deleteMany({ name: { $regex: '^DUMMY_' } });

  const cities = [
    'mumbai', 'delhi', 'bangalore', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata', 'surat', 'pune', 'jaipur', 
    'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'pimpri-chinchwad', 'patna', 
    'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'kalyan-dombivli', 
    'vasai-virar', 'varanasi'
  ];
  const types = ['rent', 'sale'];
  
  // Base rates per sqft for sales (approx INR)
  const cityRates = {
    'mumbai': { sale: 28000, rent: 70 },    
    'delhi': { sale: 15000, rent: 40 },
    'bangalore': { sale: 10000, rent: 35 },
    'pune': { sale: 9000, rent: 30 },
    'chennai': { sale: 8000, rent: 25 },
    'hyderabad': { sale: 8500, rent: 28 },
    'ahmedabad': { sale: 6000, rent: 20 },
    'kolkata': { sale: 6500, rent: 22 },
    'thane': { sale: 15000, rent: 40 },
    'gurgaon': { sale: 12000, rent: 35 },
    'noida': { sale: 8000, rent: 25 },
    // Defaults for Tier 2 cities
    'default': { sale: 5000, rent: 15 }
  };

  const listings = [];

  // Generate 300 realistic dummy listings
  for (let i = 0; i < 300; i++) {
     const city = cities[Math.floor(Math.random() * cities.length)];
     const type = types[Math.floor(Math.random() * types.length)];
     
     // Weighted random for bedrooms (mostly 1, 2, 3 BHK)
     const bhkRand = Math.random();
     let bedrooms;
     if (bhkRand < 0.3) bedrooms = 1;
     else if (bhkRand < 0.6) bedrooms = 2;
     else if (bhkRand < 0.85) bedrooms = 3;
     else bedrooms = 4;

     // Area calculation based on BHK (approx 400-600 sqft per room + hall/kitchen)
     const baseArea = bedrooms * 400; 
     const variance = Math.floor(Math.random() * 400); 
     const area = baseArea + variance;
     
     // Calculate price with some randomness (+/- 15%)
     const rates = cityRates[city] || cityRates['default'];
     const baseRate = rates[type];
     const randomness = 0.85 + (Math.random() * 0.3); 
     
     let price = Math.floor(area * baseRate * randomness);
     
     // Round price to nice numbers
     if (type === 'sale') {
        // Round to nearest Lakh (100,000)
        price = Math.round(price / 100000) * 100000;
     } else {
        // Round to nearest 500
        price = Math.round(price / 500) * 500;
     }

     const discountPrice = (type === 'sale' && Math.random() > 0.8) ? Math.floor(price * 0.95) : 0;

     listings.push({
        name: `DUMMY_${bedrooms} BHK ${type === 'rent' ? 'Apartment' : 'Flat'} in ${city.charAt(0).toUpperCase() + city.slice(1)}`,
        description: `A lovely ${area} sqft property located in the prime area of ${city}. Features ${bedrooms} bedrooms and ${Math.ceil(bedrooms * 0.8)} bathrooms. ${Math.random() > 0.5 ? 'Close to metro station.' : 'Peaceful surroundings.'}`,
        address: `${Math.floor(Math.random() * 100) + 1}, Some Street, ${city}`,
        regularPrice: price,
        discountPrice: discountPrice,
        bathrooms: Math.ceil(bedrooms * 0.8),
        bedrooms: bedrooms,
        furnished: Math.random() > 0.5,
        parking: Math.random() > 0.5,
        type: type,
        offer: discountPrice > 0,
        imageUrls: ['https://firebasestorage.googleapis.com/v0/b/mern-estate-98e38.appspot.com/o/1699948602239home3.jpg?alt=media&token=8eb21511-9a99-4702-8693-018241477755'],
        userRef: 'seed_bot_300'
     });
  }

  await Listing.insertMany(listings);
  console.log(`Database seeded with ${listings.length} entries.`);

  await mongoose.disconnect();
  console.log('Disconnected');
}

seed().catch((err) => {
  console.error('Seeding error', err);
  process.exit(1);
});
