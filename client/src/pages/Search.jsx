import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ListingItem from '../components/ListingItem';
import Compare from '../components/Compare';

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebardata, setSidebardata] = useState({
    searchTerm: '',
    type: 'all',
    parking: false,
    furnished: false,
    offer: false,
    sort: 'created_at',
    order: 'desc',
    bedrooms: 'any',
    bathrooms: 'any',
    city: '',
    minBudget: '',
    maxBudget: '',
    minArea: '',
    maxArea: '',
  });

  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedListings, setSelectedListings] = useState([]);
  const [areaError, setAreaError] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const listingsPerPage = 4;

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const searchTermFromUrl = urlParams.get('searchTerm');
    const typeFromUrl = urlParams.get('type');
    const parkingFromUrl = urlParams.get('parking');
    const furnishedFromUrl = urlParams.get('furnished');
    const offerFromUrl = urlParams.get('offer');
    const sortFromUrl = urlParams.get('sort');
    const orderFromUrl = urlParams.get('order');
    const bedroomsFromUrl = urlParams.get('bedrooms');
    const bathroomsFromUrl = urlParams.get('bathrooms');

    if (
      searchTermFromUrl ||
      typeFromUrl ||
      parkingFromUrl ||
      furnishedFromUrl ||
      offerFromUrl ||
      sortFromUrl ||
      orderFromUrl ||
      bedroomsFromUrl ||
      bathroomsFromUrl ||
      urlParams.get('city') ||
      urlParams.get('minBudget') ||
      urlParams.get('maxBudget') ||
      urlParams.get('minArea') ||
      urlParams.get('maxArea')
    ) {
      setSidebardata({
        searchTerm: searchTermFromUrl || '',
        type: typeFromUrl || 'all',
        parking: parkingFromUrl === 'true',
        furnished: furnishedFromUrl === 'true',
        offer: offerFromUrl === 'true',
        sort: sortFromUrl || 'created_at',
        order: orderFromUrl || 'desc',
        bedrooms: bedroomsFromUrl || 'any',
        bathrooms: bathroomsFromUrl || 'any',
        city: urlParams.get('city') || '',
        minBudget: urlParams.get('minBudget') || '',
        maxBudget: urlParams.get('maxBudget') || '',
        minArea: urlParams.get('minArea') || '',
        maxArea: urlParams.get('maxArea') || '',
      });
    }

    const fetchListings = async () => {
      setLoading(true);
      const searchQuery = urlParams.toString();
      try {
        const res = await fetch(`/api/listing/get?${searchQuery}`);
        const text = await res.text();
        if (!res.ok) {
          let msg = `Request failed: ${res.status}`;
          try { const parsed = JSON.parse(text); msg = parsed.message || parsed.error || msg; } catch (e) {}
          throw new Error(msg);
        }
        const data = text ? JSON.parse(text) : [];
        setListings(data);
      } catch (err) {
        console.error('Failed to fetch listings:', err.message || err);
        setListings([]);
      }
      setLoading(false);
    };

    fetchListings();
  }, [location.search]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    // Handle basic inputs including area validation
    if (['type', 'searchTerm', 'bedrooms', 'bathrooms', 'city', 'minBudget', 'maxBudget', 'minArea', 'maxArea'].includes(id)) {
      const next = { ...sidebardata, [id]: value };
      setSidebardata(next);
      // Validate min/max area when either changes
      const min = next.minArea !== '' && next.minArea !== null ? Number(next.minArea) : null;
      const max = next.maxArea !== '' && next.maxArea !== null ? Number(next.maxArea) : null;
      if (min !== null && max !== null && !Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        setAreaError('Min area must be less than or equal to Max area');
      } else {
        setAreaError('');
      }
      return;
    }

    if (id === 'amenities') {
      const selected = value.split(',');
      setSidebardata({
        ...sidebardata,
        parking: selected.includes('parking'),
        furnished: selected.includes('furnished'),
      });
      return;
    }

    if (id === 'sort_order') {
      const [sort, order] = value.split('_');
      setSidebardata({ ...sidebardata, sort, order });
      return;
    }
  };
  const handleRemoveListing = (id) => {
  setSelectedListings((prev) => prev.filter((listing) => listing._id !== id));
};


  const handleSubmit = (e) => {
    e.preventDefault();
    // Prevent submission if area range is invalid
    const min = sidebardata.minArea !== '' && sidebardata.minArea !== null ? Number(sidebardata.minArea) : null;
    const max = sidebardata.maxArea !== '' && sidebardata.maxArea !== null ? Number(sidebardata.maxArea) : null;
    if (min !== null && max !== null && !Number.isNaN(min) && !Number.isNaN(max) && min > max) {
      setAreaError('Min area must be less than or equal to Max area');
      return;
    }
    const urlParams = new URLSearchParams();
    Object.entries(sidebardata).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') urlParams.set(key, value);
    });
    navigate(`/search?${urlParams.toString()}`);
    // Save lastSearch to localStorage for recommender usage
    const lastSearch = {
      budget: sidebardata.maxBudget ? Number(sidebardata.maxBudget) : (sidebardata.minBudget ? Number(sidebardata.minBudget) : null),
      city: sidebardata.city || null,
      bedrooms: sidebardata.bedrooms && sidebardata.bedrooms !== 'any' ? Number(sidebardata.bedrooms) : null,
      areaMin: sidebardata.minArea ? Number(sidebardata.minArea) : null,
      areaMax: sidebardata.maxArea ? Number(sidebardata.maxArea) : null,
    };
    try { localStorage.setItem('lastSearch', JSON.stringify(lastSearch)); } catch (err) { console.warn('Could not save lastSearch', err); }
    setCurrentPage(1); // Reset to first page
    // Notify other components that lastSearch changed
    try { window.dispatchEvent(new Event('lastSearchUpdated')); } catch (e) { /* ignore */ }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
  };

  const handleListingSelect = (listing) => {
    setSelectedListings((prev) => {
      const exists = prev.find((item) => item._id === listing._id);
      if (exists) return prev.filter((item) => item._id !== listing._id);
      if (prev.length >= 3) {
        alert('You can only compare up to 3 properties.');
        return prev;
      }
      return [...prev, listing];
    });
  };

  // Pagination logic
  const indexOfLastListing = currentPage * listingsPerPage;
  const indexOfFirstListing = indexOfLastListing - listingsPerPage;
  const currentListings = listings.slice(indexOfFirstListing, indexOfLastListing);
  const totalPages = Math.ceil(listings.length / listingsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col md:flex-row bg-gradient-to-br from-blue-950 via-black to-blue-900 min-h-screen text-yellow-200">
      {/* Sidebar */}
      <div
        className="p-7 border-b md:border-r border-transparent md:min-h-screen bg-black/20 backdrop-blur"
        style={{
          borderImage: 'linear-gradient(to bottom, #0000ff, #ffcc00) 1',
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <label className="font-semibold">Search:</label>
            <input
              type="text"
              id="searchTerm"
              placeholder="Search..."
              className="bg-transparent border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full placeholder-yellow-400"
              value={sidebardata.searchTerm}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Type:</label>
            <select
              id="type"
              value={sidebardata.type}
              onChange={handleChange}
              className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full"
            >
              <option value="all">All</option>
              <option value="rent">Rent</option>
              <option value="sale">Sale</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">City:</label>
            <input
              id="city"
              value={sidebardata.city}
              onChange={handleChange}
              placeholder="City name"
              className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-2">
              <label className="font-semibold">Min Budget ($):</label>
              <input id="minBudget" value={sidebardata.minBudget} onChange={handleChange} type="number" placeholder="Min" className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full" />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="font-semibold">Max Budget ($):</label>
              <input id="maxBudget" value={sidebardata.maxBudget} onChange={handleChange} type="number" placeholder="Max" className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-2">
              <label className="font-semibold">Min Area (sqft):</label>
              <input id="minArea" value={sidebardata.minArea} onChange={handleChange} type="number" placeholder="Min" className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full" />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="font-semibold">Max Area (sqft):</label>
              <input id="maxArea" value={sidebardata.maxArea} onChange={handleChange} type="number" placeholder="Max" className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full" />
            </div>
          </div>
          {areaError && (
            <p className="text-red-400 text-sm mt-1">{areaError}</p>
          )}

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Amenities:</label>
            <select
              id="amenities"
              value={[
                sidebardata.parking ? 'parking' : '',
                sidebardata.furnished ? 'furnished' : '',
              ]
                .filter(Boolean)
                .join(',')}
              onChange={handleChange}
              className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full"
            >
              <option value="">None</option>
              <option value="parking">Parking</option>
              <option value="furnished">Furnished</option>
              <option value="parking,furnished">Parking + Furnished</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Bedrooms:</label>
            <select
              id="bedrooms"
              value={sidebardata.bedrooms}
              onChange={handleChange}
              className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full"
            >
              <option value="any">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Bathrooms:</label>
            <select
              id="bathrooms"
              value={sidebardata.bathrooms}
              onChange={handleChange}
              className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full"
            >
              <option value="any">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold">Sort by:</label>
            <select
              id="sort_order"
              onChange={handleChange}
              value={`${sidebardata.sort}_${sidebardata.order}`}
              className="bg-[#1f1f1f] border border-yellow-500 text-yellow-200 rounded-lg p-3 w-full"
            >
              <option value="regularPrice_desc">Price high to low</option>
              <option value="regularPrice_asc">Price low to high</option>
              <option value="created_at_desc">Latest</option>
              <option value="created_at_asc">Oldest</option>
            </select>
          </div>

          <button className="bg-yellow-500 text-black font-bold p-3 rounded-lg uppercase hover:brightness-110 transition">
            Search
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={toggleCompareMode}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded-full shadow-lg transition mt-3 duration-300"
          >
            {compareMode ? 'Cancel Compare' : 'Compare Properties'}
          </button>
        </div>
      </div>

      {/* Listings Section */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold border-b border-yellow-600 p-4">
          Listing Results
        </h1>

        {compareMode ? (
<Compare selected={selectedListings} onRemove={handleRemoveListing} />
        ) : (
          <div className="p-7 flex flex-wrap gap-6 justify-center">
            {!loading && listings.length === 0 && (
              <p className="text-xl text-yellow-400">No listings found.</p>
            )}
            {loading && (
              <p className="text-xl text-yellow-400 text-center w-full">
                Loading...
              </p>
            )}
            {!loading &&
              currentListings.map((listing) => (
                <ListingItem
                  key={listing._id}
                  listing={listing}
                  onCompareSelect={handleListingSelect}
                  selectedList={selectedListings}
                />
              ))}
          </div>
        )}

        {/* Pagination */}
        {!compareMode && totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-6 mb-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded-full font-semibold ${
                  page === currentPage
                    ? 'bg-yellow-400 text-black shadow-lg'
                    : 'bg-yellow-200 text-black hover:bg-yellow-300'
                } transition duration-200`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
