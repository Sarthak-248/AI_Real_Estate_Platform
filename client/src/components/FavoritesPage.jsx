import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function FavoriteListings() {
  const currentUser = useSelector((state) => state.user.currentUser);
  const location = useLocation();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hiddenRoutes = ['/sign-in', '/sign-up'];

  function addToRecentlyViewed(listing) {
    let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    recentlyViewed = recentlyViewed.filter(item => item._id !== listing._id);
    recentlyViewed.unshift(listing);
    if (recentlyViewed.length > 10) recentlyViewed.pop();
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
  }

  const fetchFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      let favoriteIds = [];
      
      if (currentUser) {
         favoriteIds = currentUser.favorites || [];
      } else {
         favoriteIds = JSON.parse(localStorage.getItem('favorites')) || [];
      }

      if (favoriteIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }
      
      const requests = favoriteIds.map(id => 
        axios.get(`/api/listing/get/${id}`).then(res => res.data).catch(err => {
             console.error(`❌ Failed to fetch listing ${id}:`, err.message);
             return null;
        })
      );

      const results = await Promise.all(requests);
      setFavorites(results.filter(valid => valid !== null));
    } catch (err) {
      setError('Failed to load favorite listings.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
    
    const handleFavoritesUpdated = () => fetchFavorites();
    const onStorageChange = (event) => {
      if (event.key === 'favorites') fetchFavorites();
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    window.addEventListener('storage', onStorageChange);

    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
      window.removeEventListener('storage', onStorageChange);
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="text-center text-white p-8 bg-gradient-to-b from-blue-950 via-black to-blue-950 min-h-screen flex items-center justify-center">
        Loading favorites...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center bg-gradient-to-b from-blue-950 via-black to-blue-950 min-h-screen p-8 flex items-center justify-center">
        {error}
      </div>
    );
  }

  // IF user NOT logged in OR on signin/signup page, show gradient + message
  if (!currentUser || hiddenRoutes.includes(location.pathname)) {
    return (
     <div className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-blue-950 via-black to-blue-950 px-4 text-center pt-20">
  <p className="text-yellow-400 mt-5 text-3xl font-extrabold max-w-md">
    Please Login first!!
  </p>
</div>

    );
  }

  // Otherwise show the favorite listings grid
  return (
    <div className="p-4 bg-gradient-to-b from-blue-950 via-black to-blue-950 min-h-screen">
      <h2 className="text-4xl mt-6 text-center text-yellow-400 font-bold mb-10">
        ★ Favourite Listings ★
      </h2>

      {favorites.length === 0 ? (
        <div className="p-6 mt-10 text-center">
          <p className="text-xl text-yellow-300 font-semibold">
            No favorite listings found.
          </p>
        </div>
      ) : (
        <div className="grid mt-10 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {favorites.map((listing) => (
            <Link
              to={`/listing/${listing._id}`}
              key={listing._id}
              onClick={() => addToRecentlyViewed(listing)}
            >
              <div className="bg-white rounded-xl p-4 transition-transform transform hover:scale-105 shadow-lg border-4 border-transparent hover:border-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 hover:border-opacity-100 hover:shadow-yellow-500/30">
                <h3 className="font-bold text-lg mb-2 text-blue-900">
                  {listing.name}
                </h3>
                <img
                  src={listing.imageUrls?.[0]}
                  alt="Listing"
                  className="w-full h-48 object-cover rounded-md mb-3 border border-yellow-300"
                />
                <p className="text-gray-600 mb-1">{listing.address}</p>
                <p className="text-sm text-slate-500">
                  ${listing.offer ? listing.discountPrice : listing.regularPrice}
                  {listing.type === 'rent' && ' / month'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
