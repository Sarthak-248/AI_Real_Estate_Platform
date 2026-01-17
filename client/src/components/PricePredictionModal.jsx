import { useState, useCallback } from 'react';
import { FaTimesCircle, FaSpinner, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';

export default function PricePredictionModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    areaSqFt: '',
    bedrooms: 1,
    bathrooms: 1,
    city: 'mumbai',
    type: 'rent',
    age: 0,
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cities = ['mumbai', 'delhi', 'bangalore', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata', 'surat', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'pimpri-chinchwad', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'kalyan-dombivli', 'vasai-virar', 'varanasi'];
  const types = ['rent', 'sale'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'areaSqFt' || name === 'bedrooms' || name === 'bathrooms' || name === 'age' 
        ? parseFloat(value) || ''
        : value,
    }));
  };

  const handlePredict = useCallback(async (arg = 0) => {
    // If called from UI event, arg is an event object. If recursive retry, it's a number.
    const retryCount = typeof arg === 'number' ? arg : 0;
    const MAX_RETRIES = 60; // Increased to 60 (5 minutes coverage) for extremely slow free tier starts

    // Validate inputs only on first attempt
    if (retryCount === 0) {
        if (!formData.areaSqFt || formData.areaSqFt <= 0) {
        setError('Please enter valid area (sq ft)');
        return;
        }
        if (formData.bedrooms < 1 || formData.bedrooms > 10) {
        setError('Bedrooms should be between 1 and 10');
        return;
        }
        if (formData.bathrooms < 1 || formData.bathrooms > 10) {
        setError('Bathrooms should be between 1 and 10');
        return;
        }

        setLoading(true);
        setError('');
        setPrediction(null);
    }

    try {
      console.log(`[PriceModal] Requesting prediction (Attempt ${retryCount + 1})...`);
      const response = await axios.post('/api/price-estimate/predict', {
        areaSqFt: formData.areaSqFt,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        city: formData.city,
        type: formData.type,
        age: formData.age,
      }, {
        timeout: 60000 // 60s timeout
      });

      // Handle Success
      if (response.data.success && response.data.predicted_price) {
        setPrediction(response.data);
        setLoading(false);
      } 
      // Handle "Waking Up" signal (status 202) OR explicit waking_up status
      else if (response.status === 202 || response.data.status === 'waking_up') {
          if (retryCount < MAX_RETRIES) {
              console.log(`[PriceModal] Service waking up. Retrying in 5s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
              setTimeout(() => handlePredict(retryCount + 1), 5000);
          } else {
              setError('AI Service is taking longer than expected to start. Please try again in a minute.');
              setLoading(false);
          }
      }
      // Handle other errors
      else {
        setError(response.data.message || 'Failed to predict price');
        setLoading(false);
      }

    } catch (err) {
      console.error('[PriceModal] Error:', err);
      
      // If network error (connection closed) or timeout, assume waking up and retry
      if (retryCount < MAX_RETRIES && (err.code === 'ECONNABORTED' || err.message.includes('Network Error'))) {
           console.log('[PriceModal] Network timeout (likely waking up). Retrying in 5s...');
           setTimeout(() => handlePredict(retryCount + 1), 5000);
           return;
      }

      setError(
        err.response?.data?.message ||
        'Failed to predict price. Please try again.'
      );
      setLoading(false);
    }
  }, [formData]);

  const handleReset = () => {
    setFormData({
      areaSqFt: '',
      bedrooms: 1,
      bathrooms: 1,
      city: 'mumbai',
      type: 'rent',
      age: 0,
    });
    setPrediction(null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-900 to-blue-950">
          <h2 className="text-xl font-bold text-white">Predict Property Price</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl transition"
          >
            <FaTimesCircle />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!prediction ? (
            <>
              {/* Input Form */}
              <div className="space-y-4">
                {/* Area */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Area (sq ft) *
                  </label>
                  <input
                    type="number"
                    name="areaSqFt"
                    value={formData.areaSqFt}
                    onChange={handleChange}
                    placeholder="e.g., 2500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    City
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city.charAt(0).toUpperCase() + city.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Property Age (years)
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="0"
                    placeholder="e.g., 5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handlePredict}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 font-bold py-2 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Predicting...
                      </>
                    ) : (
                      'Predict Price'
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="flex-1 bg-blue-950 text-yellow-400 font-bold py-2 rounded-lg hover:bg-blue-900 transition disabled:opacity-50 border-2 border-yellow-400"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Prediction Result */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <FaCheckCircle className="text-2xl" />
                  <span className="text-lg font-semibold">Prediction Ready</span>
                </div>

                {/* Predicted Price */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-400">
                  <p className="text-gray-600 text-sm mb-1">Estimated Price</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {prediction.predicted_price
                      ? `₹ ${parseInt(prediction.predicted_price).toLocaleString()}`
                      : 'N/A'}
                  </p>
                </div>

                {/* Price Range */}
                {prediction.price_range && prediction.price_range.min && prediction.price_range.max && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-900">
                    <p className="text-gray-600 text-sm mb-2">Price Range</p>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Min</p>
                        <p className="text-lg font-bold text-blue-900">
                          ₹ {parseInt(prediction.price_range.min).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Max</p>
                        <p className="text-lg font-bold text-blue-900">
                          ₹ {parseInt(prediction.price_range.max).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confidence */}
                {prediction.confidence_score !== undefined && (
                  <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-4 rounded-lg border-2 border-yellow-400">
                    <p className="text-yellow-400 text-sm mb-2 font-semibold">AI Confidence</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-yellow-400 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-yellow-300 h-full transition-all"
                          style={{
                            width: `${(prediction.confidence_score || 0) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-lg font-bold text-yellow-400">
                        {((prediction.confidence_score || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Model Info */}
                {prediction.model && (
                  <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 border border-gray-200">
                    <p>
                      <strong>Model:</strong> {prediction.model}
                    </p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="bg-yellow-50 p-3 rounded-lg text-xs text-gray-600 border border-yellow-200">
                  <p>
                    ⚠️ <strong>Disclaimer:</strong> This is an AI-based estimate. Actual prices may vary based on market conditions, property condition, and other factors.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 font-bold py-2 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition"
                  >
                    Try Another
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-blue-950 text-yellow-400 font-bold py-2 rounded-lg hover:bg-blue-900 transition border-2 border-yellow-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
