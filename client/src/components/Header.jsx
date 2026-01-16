import { FaCalculator, FaHeart, FaClock } from 'react-icons/fa';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import Logo from '../assets/images/Logo.png'; // ✅ Import the logo image
import PricePredictionModal from './PricePredictionModal';

export default function Header() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [localFavorites, setLocalFavorites] = useState([]);

  useEffect(() => {
     const updateLocalFavs = () => {
         setLocalFavorites(JSON.parse(localStorage.getItem('favorites')) || []);
     };
     updateLocalFavs();
     window.addEventListener('favoritesUpdated', updateLocalFavs);
     return () => window.removeEventListener('favoritesUpdated', updateLocalFavs);
  }, []);

  const favoriteCount = currentUser ? (currentUser.favorites?.length || 0) : localFavorites.length;

  const handlePricePrediction = () => {
    setIsPredictionModalOpen(true);
  };

  return (
    <>
      <style>{`
        @keyframes continuousPump {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .continuous-pump {
          animation: continuousPump 2s ease-in-out infinite;
          color: white;
          transition: color 0.3s ease;
        }
        .group:hover .continuous-pump {
          color: red;
        }
      `}</style>

      <header className="bg-gradient-to-r from-black via-blue-950 to-blue-950 text-yellow-300 shadow-md sticky top-0 z-50">
        <div className="flex justify-between items-center max-w-6xl mx-auto p-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={Logo} alt="Logo" className="h-8 sm:h-10 object-contain" />
            <h1 className="font-extrabold text-lg sm:text-2xl tracking-wide drop-shadow-lg">
              <span className="text-yellow-300">Sarthak </span>
              <span className="text-yellow-500">Heights</span>
            </h1>
          </Link>

          {/* Price Prediction Button */}
          <button
            onClick={handlePricePrediction}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black rounded-full shadow-lg hover:from-yellow-300 hover:to-yellow-400 transition font-semibold"
            title="Predict Property Price"
          >
            <FaCalculator className="text-black" />
            <span>Predict Price</span>
          </button>

          {/* Navigation Items */}
          <ul className="flex gap-4 items-center">
            <Link to="/">
              <li className="hidden sm:inline text-yellow-300 hover:text-yellow-100 transition font-medium">
                Home
              </li>
            </Link>
            <Link to="/about">
              <li className="hidden sm:inline text-yellow-300 hover:text-yellow-100 transition font-medium">
                About
              </li>
            </Link>

            {/* Price Prediction Button (Mobile) */}
            <button
              onClick={handlePricePrediction}
              className="md:hidden flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 rounded-full shadow hover:from-yellow-300 hover:to-yellow-400 transition font-bold"
              title="Predict Property Price"
            >
              <FaCalculator className="text-blue-950 text-sm" />
            </button>

            {/* Recently Viewed Button */}
            <Link to="/recently-visited">
              <li className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-black rounded-full shadow hover:bg-yellow-400 transition font-semibold">
                <FaClock className="text-black" />
                <span className="hidden sm:inline">Recently Viewed</span>
              </li>
            </Link>

            {/* Recommended Button */}
            <Link to="/recommended">
              <li className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-black rounded-full shadow hover:bg-yellow-400 transition font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L3 5v6c0 5.25 3.58 9.86 8.5 11 4.92-1.14 8.5-5.75 8.5-11V5l-9-3zM12 13.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                </svg>
                <span className="hidden sm:inline">Recommended</span>
              </li>
            </Link>

            {/* Favorites Button */}
            <Link to="/favorites">
              <li className="relative group transition cursor-pointer">
                <div className="flex items-center gap-1 font-medium transition-all duration-300 scale-100">
                  <FaHeart
                    className="text-white text-xl continuous-pump"
                  />
                  <span className="hidden sm:inline text-yellow-300 group-hover:text-yellow-100 transition">
                    Favorites
                  </span>
                </div>
                {/* You can enable count badge if you want */}
                {/* {favoriteCount > 0 && (
                  <span
                    className={`absolute -top-2 -right-2 bg-yellow-500 text-black rounded-full px-2 py-0.5 text-xs font-bold shadow`}
                  >
                    {favoriteCount}
                  </span>
                )} */}
              </li>
            </Link>

            {/* Profile / Sign In */}
            <Link to="/profile">
              {currentUser ? (
                <img
                  className="rounded-full h-8 w-8 object-cover border-2 border-yellow-500 shadow"
                  src={currentUser.avatar}
                  alt="profile"
                />
              ) : (
                <li className="text-yellow-300 hover:text-yellow-100 transition font-medium">
                  Sign in
                </li>
              )}
            </Link>
          </ul>
        </div>
      </header>

      {/* Price Prediction Modal */}
      <PricePredictionModal 
        isOpen={isPredictionModalOpen} 
        onClose={() => setIsPredictionModalOpen(false)} 
      />
    </>
  );
}
