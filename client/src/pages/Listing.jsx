import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import SwiperCore from 'swiper';
import { useSelector } from 'react-redux';
import { Navigation } from 'swiper/modules';
import 'swiper/css/bundle';
import {
  FaBath,
  FaBed,
  FaChair,
  FaMapMarkerAlt,
  FaParking,
  FaShare,
} from 'react-icons/fa';
import Contact from '../components/Contact';

export default function Listing() {
  SwiperCore.use([Navigation]);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState(false);
  const params = useParams();
  const { currentUser } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/listing/get/${params.listingId}`);
        const text = await res.text();
        if (!res.ok) {
          try { const parsed = JSON.parse(text); console.error('Listing fetch error:', parsed); } catch (e) { console.error('Listing fetch error:', text); }
          setError(true);
          setLoading(false);
          return;
        }
        const data = text ? JSON.parse(text) : null;
        if (!data || typeof data !== 'object') {
          setError(true);
          setLoading(false);
          return;
        }
        setListing(data);
        setLoading(false);
        setError(false);
        try {
          const visited = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
          const updated = [data._id, ...visited.filter((id) => id !== data._id)];
          localStorage.setItem('recentlyViewed', JSON.stringify(updated.slice(0, 5)));
          window.dispatchEvent(new Event('recentlyViewedUpdated'));
        } catch (e) {
          // ignore storage errors
        }
      } catch (error) {
        console.error('Fetch listing error', error);
        setError(true);
        setLoading(false);
      }
    };
    fetchListing();
  }, [params.listingId]);

  return (
    <main className="bg-gradient-to-b from-blue-900 via-black to-blue-900 min-h-screen text-yellow-400">
      {loading && <p className="text-center my-7 text-2xl">Loading...</p>}
      {error && (
        <p className="text-center my-7 text-2xl text-red-500">Something went wrong!</p>
      )}
      {listing && !loading && !error && (
        <div>
          {/* Swiper Image Carousel */}
          <Swiper navigation>
            {(listing.imageUrls || []).map((url) => (
              <SwiperSlide key={url}>
                <div className="h-[550px] w-full flex justify-center items-center bg-black">
                  <img
                    src={url}
                    alt="Listing"
                    className="h-full w-full object-cover"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Share Button */}
          <div className="fixed top-[13%] right-[3%] z-10 border-2 border-yellow-400 rounded-full w-12 h-12 flex justify-center items-center bg-slate-100 cursor-pointer">
            <FaShare
              className="text-blue-900"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            />
          </div>

          {copied && (
            <p className="fixed top-[23%] right-[5%] z-10 rounded-md bg-slate-100 text-blue-900 p-2">
              Link copied!
            </p>
          )}

          {/* Listing Details */}
          <div className="flex flex-col max-w-4xl mx-auto p-3 my-7 gap-4">
            <p className="text-3xl font-bold text-yellow-300">
              {listing.name || 'Listing'} - ${' '}
              {(listing.offer ? (listing.discountPrice || listing.regularPrice) : listing.regularPrice || 0).toLocaleString('en-US')}
              {listing.type === 'rent' && ' / month'}
            </p>

            <p className="flex items-center mt-6 gap-2 text-yellow-100 text-sm">
              <FaMapMarkerAlt className="text-yellow-300" />
              {listing.address}
            </p>

            <div className="flex gap-4">
              <p className="bg-blue-950 border border-yellow-400 w-full max-w-[200px] text-yellow-300 text-center p-1 rounded-md">
                {listing.type === 'rent' ? 'For Rent' : 'For Sale'}
              </p>
              {listing.offer && (
                <p className="bg-yellow-500 w-full max-w-[200px] text-blue-900 text-center p-1 rounded-md font-bold">
                  ${+listing.regularPrice - +listing.discountPrice} OFF
                </p>
              )}
            </div>

            <p className="text-yellow-200">
              <span className="font-semibold text-yellow-300">Description - </span>
              {listing.description}
            </p>

            <ul className="text-yellow-300 font-semibold text-sm flex flex-wrap items-center gap-4 sm:gap-6">
              <li className="flex items-center gap-1 whitespace-nowrap">
                <FaBed className="text-lg" />
                  { (listing.bedrooms || 0) > 1
                    ? `${listing.bedrooms} beds`
                    : `${listing.bedrooms || 0} bed`}
              </li>
              <li className="flex items-center gap-1 whitespace-nowrap">
                <FaBath className="text-lg" />
                  { (listing.bathrooms || 0) > 1
                    ? `${listing.bathrooms} baths`
                    : `${listing.bathrooms || 0} bath`}
              </li>
              <li className="flex items-center gap-1 whitespace-nowrap">
                <FaParking className="text-lg" />
                {listing.parking ? 'Parking spot' : 'No Parking'}
              </li>
              <li className="flex items-center gap-1 whitespace-nowrap">
                <FaChair className="text-lg" />
                {listing.furnished ? 'Furnished' : 'Unfurnished'}
              </li>
              {listing.age !== undefined && (
                <li className="flex items-center gap-1 whitespace-nowrap">
                  <span className="text-lg">📅</span>
                  {listing.age > 1 ? `${listing.age} years old` : `${listing.age} year old`}
                </li>
              )}
            </ul>

            {currentUser && listing.userRef !== currentUser._id && !contact && (
              <button
                onClick={() => setContact(true)}
                className="bg-yellow-400 text-blue-900 rounded-lg uppercase hover:bg-yellow-300 p-3 font-bold"
              >
                Contact landlord
              </button>
            )}

            {contact && <Contact listing={listing} />}
          </div>
        </div>
      )}
    </main>
  );
}
