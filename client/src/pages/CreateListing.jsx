import { useSelector } from 'react-redux';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function CreateListing() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isEditMode = queryParams.get('edit') === 'true';
  const previousListingId = queryParams.get('listingId');

  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    imageUrls: [],
    name: '',
    description: '',
    address: '',
    city: '',
    areaSqFt: '',
    age: '',
    type: 'rent',
    bedrooms: 0,
    bathrooms: 0,
    regularPrice: '',
    discountPrice: 0,
    offer: false,
    parking: false,
    furnished: false,
  });
  const [imageUploadError, setImageUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImageSubmit = () => {
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      for (let i = 0; i < files.length; i++) {
        promises.push(storeImage(files[i]));
      }
      Promise.all(promises)
        .then((urls) => {
          setFormData((prev) => ({
            ...prev,
            imageUrls: prev.imageUrls.concat(urls),
          }));
          setUploading(false);
        })
        .catch(() => {
          setImageUploadError('Image upload failed (2 MB max per image)');
          setUploading(false);
        });
    } else {
      setImageUploadError('You can only upload 6 images per listing');
      setUploading(false);
    }
  };

  const storeImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'sar_mor');
    formData.append('cloud_name', 'dypvyjfgk');

    try {
      const response = await axios.post('https://api.cloudinary.com/v1_1/dypvyjfgk/image/upload', formData);
      return response.data.secure_url;
    } catch {
      throw new Error('Cloudinary upload failed');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const handleChange = (e) => {
    if (e.target.id === 'sale' || e.target.id === 'rent') {
      setFormData({ ...formData, type: e.target.id });
    } else if (['parking', 'furnished', 'offer'].includes(e.target.id)) {
      setFormData({ ...formData, [e.target.id]: e.target.checked });
    } else {
      setFormData({ ...formData, [e.target.id]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.imageUrls.length < 1) return setError('You must upload at least one image');
    if (+formData.regularPrice < +formData.discountPrice) return setError('Discount price must be lower than regular price');

    try {
      setLoading(true);
      setError(false);

      const res = await fetch(`/api/listing/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, userRef: currentUser._id }),
      });

      const data = await res.json();
      if (data.success === false) {
        setError(data.message);
        setLoading(false);
        return;
      }

      if (isEditMode && previousListingId) {
        await fetch(`/api/listing/delete/${previousListingId}`, { method: 'DELETE' });
      }

      navigate(`/listing/${data._id}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-blue-950 to-black flex justify-center items-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 backdrop-blur-xl text-white p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-3xl space-y-6 border border-white/10"
      >
        <h1 className="text-4xl font-extrabold text-center text-[#FFEB3B] tracking-wide drop-shadow-lg">
          {isEditMode ? 'Update Listing' : 'Create a Listing'}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Property Name"
            className="w-full px-4 py-3 bg-white/20 rounded-lg placeholder-white focus:outline-none focus:ring-2 focus:ring-[#FFEB3B]"
          />
          <input
            type="text"
            id="address"
            required
            value={formData.address}
            onChange={handleChange}
            placeholder="Address"
            className="w-full px-4 py-3 bg-white/20 rounded-lg placeholder-white focus:outline-none focus:ring-2 focus:ring-[#FFEB3B]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="text"
            id="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            className="w-full px-4 py-3 bg-white/20 rounded-lg placeholder-white focus:outline-none focus:ring-2 focus:ring-[#FFEB3B]"
          />
          <input
            type="number"
            id="areaSqFt"
            value={formData.areaSqFt}
            onChange={handleChange}
            placeholder="Area (sqft)"
            className="w-full px-4 py-3 bg-white/20 rounded-lg placeholder-white focus:outline-none focus:ring-2 focus:ring-[#FFEB3B]"
          />
        </div>

        <textarea
          id="description"
          required
          value={formData.description}
          onChange={handleChange}
          placeholder="Description"
          className="w-full px-4 py-3 bg-white/20 rounded-lg placeholder-white focus:outline-none focus:ring-2 focus:ring-[#FFEB3B] min-h-[100px]"
        />

        <div className="flex flex-wrap gap-4 justify-between text-sm sm:text-base">
          {['sale', 'rent', 'parking', 'furnished', 'offer'].map((id) => (
            <label key={id} className="flex items-center gap-2 text-[#FFEB3B] font-medium">
              <input
                type="checkbox"
                id={id}
                onChange={handleChange}
                checked={formData[id] ?? formData.type === id}
                className="accent-[#FFD700] w-5 h-5"
              />
              <span className="capitalize">{id === 'sale' ? 'Sell' : id}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { id: 'bedrooms', label: 'Bedrooms' },
            { id: 'bathrooms', label: 'Bathrooms' },
            { id: 'regularPrice', label: 'Regular Price ($)' },
          ].map(({ id, label }) => (
            <input
              key={id}
              type="number"
              id={id}
              value={formData[id]}
              onChange={handleChange}
              placeholder={label}
              className="px-4 py-3 bg-white/20 rounded-lg placeholder-white focus:outline-none focus:ring-2 focus:ring-[#FFEB3B]"
            />
          ))}
          {formData.offer && (
            <input
              type="number"
              id="discountPrice"
              value={formData.discountPrice}
              onChange={handleChange}
              placeholder="Discount Price ($)"
              className="px-4 py-3 bg-white/20 rounded-lg placeholder-white focus:outline-none focus:ring-2 focus:ring-[#FFEB3B]"
            />
          )}
          <input
            type="number"
            id="age"
            value={formData.age}
            onChange={handleChange}
            min="0"
            max="200"
            placeholder="Property Age (years)"
            className="px-4 py-3 bg-white/20 rounded-lg placeholder-white focus:outline-none focus:ring-2 focus:ring-[#FFEB3B]"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-[#FFD700]">Upload Images (max 6):</p>
          <div className="flex flex-wrap items-center gap-4">
            <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} className="text-white" />
            <button
              type="button"
              onClick={handleImageSubmit}
              disabled={uploading}
              className="bg-[#FFEB3B] text-black font-bold px-5 py-2 rounded-lg hover:bg-[#FFF000] transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          {imageUploadError && <p className="text-red-400 text-sm">{imageUploadError}</p>}

          {/* Image Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
            {formData.imageUrls.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt={`img-${i}`} className="rounded-lg object-cover w-full h-32" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          disabled={loading || uploading}
          className="w-full bg-[#FFEB3B] hover:bg-[#FFF000] text-black font-bold py-3 rounded-lg shadow-lg transition duration-300"
        >
          {loading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Listing' : 'Create Listing'}
        </button>

        {error && <p className="text-red-500 text-center">{error}</p>}
      </form>
    </main>
  );
}
