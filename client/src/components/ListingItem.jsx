import { Link } from 'react-router-dom';
import { MdLocationOn } from 'react-icons/md';
import { useState, useEffect } from 'react';
import { FaHeart } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { updateUserSuccess } from '../redux/user/userSlice';

export default function ListingItem({ listing, onCompareSelect, selectedList }) {
  const { currentUser } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [isFavorite, setIsFavorite] = useState(false);
  const isChecked = selectedList?.some((p) => p._id === listing?._id);

  useEffect(() => {
    try {
      if (currentUser) {
         // Server-side favorites logic
         setIsFavorite(currentUser.favorites?.includes(listing._id) || false);
      } else {
         // LocalStorage favorites logic
         const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
         if (listing && listing._id && favorites.includes(listing._id)) {
           setIsFavorite(true);
         } else {
           setIsFavorite(false);
         }
      }
    } catch (e) {
      setIsFavorite(false);
    }
  }, [listing, currentUser]);

  const toggleFavorite = async () => {
    try {
      if (currentUser) {
        // Authenticated: Call API
        const res = await fetch(`/api/user/favorites/${listing._id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        if (data.success === false) {
          console.log(data.message);
          return;
        }
        // Update Redux state
        dispatch(updateUserSuccess(data));
        // State update happens via useEffect when currentUser changes
      } else {
         // Unauthenticated: LocalStorage
          const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
          let updatedFavorites;

          if (isFavorite) {
            updatedFavorites = favorites.filter((id) => id !== listing._id);
          } else {
            updatedFavorites = [...favorites, listing._id];
          }

          localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
          setIsFavorite(!isFavorite);
          window.dispatchEvent(new Event('favoritesUpdated'));
      }
    } catch (e) {
      console.warn('Could not update favorites', e);
    }
  };

  const handleView = () => {
    try {
      const visited = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
      const updated = [listing._id, ...visited.filter((id) => id !== listing._id)];
      localStorage.setItem('recentlyViewed', JSON.stringify(updated.slice(0, 5)));
      window.dispatchEvent(new Event('recentlyViewedUpdated'));
    } catch (e) {
      // ignore
    }
  };

  if (!listing || typeof listing !== 'object') {
    return (
      <div className="relative bg-white shadow-md overflow-hidden rounded-lg w-full sm:w-[330px] h-[200px] flex items-center justify-center">
        <p className="text-sm text-gray-600">Invalid listing data</p>
      </div>
    );
  }

  const cover = listing.imageUrls?.[0] || 'https://53.fs1.hubspotusercontent-na1.net/hub/53/hubfs/Sales_Blog/real-estate-business-compressor.jpg?width=595&height=400&name=real-estate-business-compressor.jpg';
  const bedrooms = Number(listing.bedrooms) || 0;
  const bathrooms = Number(listing.bathrooms) || 0;
  const price = listing.offer ? (listing.discountPrice || listing.regularPrice) : (listing.regularPrice || 0);

  return (
    <div className="relative bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden rounded-lg w-full sm:w-[330px] h-[420px] flex flex-col justify-between">
      <Link to={`/listing/${listing._id}`} className="block flex-grow" onClick={handleView}>
        <img src={cover} alt={listing.name || 'listing cover'} className="h-[220px] w-full object-cover hover:scale-105 transition-transform duration-300" />
        <div className="p-3 flex flex-col gap-2 w-full flex-grow">
          <p className="truncate text-lg font-semibold text-slate-700">{listing.name || 'Unnamed Listing'}</p>
          <div className="flex items-center gap-1">
            <MdLocationOn className="h-4 w-4 text-green-700" />
            <p className="text-sm text-gray-600 truncate w-full">{listing.city || listing.address || 'No address provided'}</p>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 flex-grow">{listing.description || 'No description available'}</p>
          <p className="text-slate-500 mt-2 font-semibold">${price.toLocaleString('en-US')}{listing.type === 'rent' && ' / month'}</p>
          <div className="text-slate-700 flex gap-4">
            <div className="font-bold text-xs">{bedrooms > 1 ? `${bedrooms} beds` : `${bedrooms} bed`}</div>
            <div className="font-bold text-xs">{bathrooms > 1 ? `${bathrooms} baths` : `${bathrooms} bath`}</div>
            <div className="font-bold text-xs">{listing.areaSqFt ? `${listing.areaSqFt} sqft` : 'Area N/A'}</div>
            {listing.age !== undefined && <div className="font-bold text-xs text-blue-600">{listing.age} years old</div>}
          </div>
        </div>
      </Link>

      <div onClick={toggleFavorite} className={`absolute top-2 right-2 cursor-pointer text-xl p-2 rounded-full z-10 transition-all duration-300 ease-in-out ${isFavorite ? 'text-red-500 bg-white shadow-lg scale-110' : 'text-gray-300 bg-white hover:text-red-400 hover:scale-110 shadow'}`} aria-label="Toggle Favorite">
        <FaHeart />
      </div>

      {onCompareSelect && selectedList && (
        <div className="absolute bottom-2 right-2 z-10">
          <label title="Compare this property" className="bg-blue-950 text-blue-400 p-1 rounded-full shadow-md cursor-pointer">
            <input type="checkbox" checked={isChecked} onChange={() => onCompareSelect(listing)} className="w-5 h-5 accent-blue-400 cursor-pointer" />
          </label>
        </div>
      )}
    </div>
  );
}
