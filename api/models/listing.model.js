import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: false,
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    areaSqFt: {
      type: Number,
      required: false,
    },
    discountPrice: {
      type: Number,
      required: false,
      default: 0,
    },
    bathrooms: {
      type: Number,
      required: false,
      default: 0,
    },
    bedrooms: {
      type: Number,
      required: false,
      default: 0,
    },
    furnished: {
      type: Boolean,
      required: true,
    },
    parking: {
      type: Boolean,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    offer: {
      type: Boolean,
      required: true,
    },
    imageUrls: {
      type: Array,
      required: true,
    },
    userRef: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  { timestamps: true }
);

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
