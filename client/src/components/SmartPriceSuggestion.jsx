/**
 * Smart Price Suggestion Component
 * 
 * Displays AI-estimated property price with confidence range.
 * Integrated into the CreateListing/UpdateListing flow.
 * 
 * Features:
 * - Real-time price prediction as user fills form
 * - Loading and error states
 * - Non-blocking (form submission works even if AI fails)
 * - Explainable results with confidence indicators
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SmartPriceSuggestion({ formData }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce timer for API calls
  const [debounceTimer, setDebounceTimer] = useState(null);

  /**
   * Validate that we have minimum required data to make a prediction
   */
  const hasRequiredFields = () => {
    return (
      formData.areaSqFt &&
      formData.bedrooms > 0 &&
      formData.bathrooms > 0 &&
      formData.address &&
      formData.type
    );
  };

  /**
   * Fetch price prediction from backend with Polling/Retry logic
   */
  const fetchPricePrediction = async (retryCount = 0) => {
    const MAX_RETRIES = 10;
    
    try {
      if (retryCount === 0) {
          setError(null);
          setLoading(true);
      }

      const propertyData = {
        areaSqFt: Number(formData.areaSqFt) || 1000,
        bedrooms: Number(formData.bedrooms) || 1,
        bathrooms: Number(formData.bathrooms) || 1,
        address: formData.address,
        type: formData.type,
        city: formData.city,
      };

      console.log(`[SmartPrice] Requesting prediction (Attempt ${retryCount + 1})...`);
      const response = await axios.post('/api/price-estimate/predict', propertyData, {
        timeout: 60000, // 60s timeout for frontend
      });

      // Handle Success
      if (response.data.success) {
        console.log('[SmartPrice] Prediction success:', response.data);
        setPrediction(response.data);
        setLoading(false);
      } 
      // Handle "Waking Up" signal (status 202) OR explicit waking_up status
      else if (response.status === 202 || response.data.status === 'waking_up') {
          if (retryCount < MAX_RETRIES) {
              console.log('[SmartPrice] Service waking up. Retrying in 5s...');
              setTimeout(() => fetchPricePrediction(retryCount + 1), 5000);
          } else {
              setError('AI Service is taking too long to wake up. Please try again later.');
              setLoading(false);
          }
      }
      // Handle other errors
      else {
        setError(response.data.message || 'Failed to predict price');
        setLoading(false);
      }
    } catch (err) {
      console.error('Price prediction error:', err);
      
      // If network error (connection closed) or timeout, assume waking up and retry
      if (retryCount < MAX_RETRIES && (err.code === 'ECONNABORTED' || err.message.includes('Network Error'))) {
           console.log('[SmartPrice] Network timeout (likely waking up). Retrying in 5s...');
           setTimeout(() => fetchPricePrediction(retryCount + 1), 5000);
           return;
      }

      // Non-blocking error - don't prevent form submission
      setError('Could not estimate price. AI service unavailable.');
      setLoading(false);
    }
  };

  /**
   * Debounced effect: trigger prediction when form data changes
   * Wait 500ms after user stops typing before making API call
   */
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Don't call API if we don't have required fields
    if (!hasRequiredFields()) {
      setPrediction(null);
      return;
    }

    // Set new timer
    const timer = setTimeout(() => {
      fetchPricePrediction();
    }, 500);

    setDebounceTimer(timer);

    // Cleanup on unmount
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [
    formData.areaSqFt,
    formData.bedrooms,
    formData.bathrooms,
    formData.address,
    formData.type,
  ]);

  /**
   * Format currency for display
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Render component
   */
  return (
    <div className='mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-800 flex items-center gap-2'>
          <span className='text-xl'>🤖</span>
          Smart Price Suggestion
        </h3>
        {loading && (
          <div className='animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full'></div>
        )}
      </div>

      {error && (
        <div className='mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700'>
          ⚠️ {error}
        </div>
      )}

      {!hasRequiredFields() && !prediction && (
        <p className='text-sm text-gray-600 italic'>
          Fill in property details (area, bedrooms, bathrooms, address) to get an AI price estimate.
        </p>
      )}

      {prediction && (
        <div className='space-y-4'>
          {/* Main Prediction */}
          <div className='bg-white p-4 rounded-lg border border-blue-200'>
            <p className='text-sm text-gray-600 mb-1'>Estimated Market Price</p>
            <p className='text-3xl font-bold text-indigo-600'>
              {formatCurrency(prediction.predicted_price)}
            </p>
          </div>

          {/* Price Range */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-white p-3 rounded-lg border border-blue-200'>
              <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Min Price</p>
              <p className='text-xl font-semibold text-gray-700'>
                {formatCurrency(prediction.price_range.min)}
              </p>
            </div>
            <div className='bg-white p-3 rounded-lg border border-blue-200'>
              <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Max Price</p>
              <p className='text-xl font-semibold text-gray-700'>
                {formatCurrency(prediction.price_range.max)}
              </p>
            </div>
          </div>

          {/* Confidence & Disclaimer */}
          <div className='flex items-start gap-2 text-xs text-gray-600'>
            <span className='text-lg'>ℹ️</span>
            <p>
              This is an AI-estimated price based on property features and market data.
              Actual price may vary. Use as a reference only.
            </p>
          </div>

          {/* Confidence Score */}
          <div className='flex items-center gap-2'>
            <span className='text-xs font-medium text-gray-600'>Model Confidence:</span>
            <div className='flex-1 h-2 bg-gray-200 rounded-full overflow-hidden'>
              <div
                className='h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full'
                style={{ width: `${Math.round(prediction.confidence * 100)}%` }}
              ></div>
            </div>
            <span className='text-xs font-semibold text-gray-700'>
              {Math.round(prediction.confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {loading && !prediction && (
        <div className='flex items-center gap-3 text-sm text-gray-600'>
          <div className='animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full'></div>
          <span>Analyzing property data...</span>
        </div>
      )}
    </div>
  );
}
