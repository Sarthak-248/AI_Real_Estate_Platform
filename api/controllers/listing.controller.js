import Listing from '../models/listing.model.js';
import { errorHandler } from '../utils/error.js';
import uploadToCloudinary from '../utils/uploadToCloudinary.js';
import PriceEstimationService from '../services/priceEstimation.service.js';

export const createListing = async (req, res, next) => {
  try {
    const listing = await Listing.create(req.body);

    // Check if model needs retraining
    // We don't await this to keep the response fast
    PriceEstimationService.checkAndRetainIfNeeded()
      .catch(err => console.error('Background retraining check failed:', err));

    return res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};


export const createL = async (req, res) => {
  try {
    const imageUrl = await uploadToCloudinary(req.file.path);

    // now save imageUrl in your DB with other listing info
    const listing = {
      title: req.body.title,
      description: req.body.description,
      image: imageUrl,
      // other fields...
    };

    // save to DB
    res.status(201).json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteListing = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    return next(errorHandler(404, 'Listing not found!'));
  }

  if (req.user.id !== listing.userRef) {
    return next(errorHandler(401, 'You can only delete your own listings!'));
  }

  try {
    await Listing.findByIdAndDelete(req.params.id);
    res.status(200).json('Listing has been deleted!');
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return next(errorHandler(404, 'Listing not found!'));
  }
  if (req.user.id !== listing.userRef) {
    return next(errorHandler(401, 'You can only update your own listings!'));
  }

  try {
    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedListing);
  } catch (error) {
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found!'));
    }
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

export const getListings = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 9;
    const startIndex = parseInt(req.query.startIndex) || 0;
    let offer = req.query.offer;

    if (offer === undefined || offer === 'false') {
      offer = { $in: [false, true] };
    }

    let furnished = req.query.furnished;

    if (furnished === undefined || furnished === 'false') {
      furnished = { $in: [false, true] };
    }

    let parking = req.query.parking;

    if (parking === undefined || parking === 'false') {
      parking = { $in: [false, true] };
    }

    let type = req.query.type;

    if (type === undefined || type === 'all') {
      type = { $in: ['sale', 'rent'] };
    }

    const searchTerm = req.query.searchTerm || '';
    const city = req.query.city || '';
    const minBudget = req.query.minBudget ? Number(req.query.minBudget) : null;
    const maxBudget = req.query.maxBudget ? Number(req.query.maxBudget) : null;
    const minArea = req.query.minArea ? Number(req.query.minArea) : null;
    const maxArea = req.query.maxArea ? Number(req.query.maxArea) : null;

    const sort = req.query.sort || 'createdAt';

    const order = req.query.order || 'desc';

    // Map common frontend sort keys to DB fields
    const sortFieldMap = {
      created_at: 'createdAt',
      createdAt: 'createdAt',
      regularPrice: 'regularPrice',
      price: 'regularPrice',
    };
    const sortField = sortFieldMap[sort] || sort;

    // Build dynamic query
    const query = {
      name: { $regex: searchTerm, $options: 'i' },
      offer,
      furnished,
      parking,
      type,
    };

    if (city) query.city = { $regex: city, $options: 'i' };
    if (minBudget !== null || maxBudget !== null) {
      query.regularPrice = {};
      if (minBudget !== null) query.regularPrice.$gte = minBudget;
      if (maxBudget !== null) query.regularPrice.$lte = maxBudget;
    }
    if (minArea !== null || maxArea !== null) {
      query.areaSqFt = {};
      if (minArea !== null) query.areaSqFt.$gte = minArea;
      if (maxArea !== null) query.areaSqFt.$lte = maxArea;
    }

    const listings = await Listing.find(query).sort({ [sortField]: order }).limit(limit).skip(startIndex);

    return res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};
