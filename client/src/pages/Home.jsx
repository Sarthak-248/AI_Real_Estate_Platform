import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import ReviewSlider from '../components/ReviewSlider';
import { Navigation } from 'swiper/modules';
import Footer from '../components/Footer';
import SwiperCore from 'swiper';
import 'swiper/css/bundle';
import ListingItem from '../components/ListingItem';
import HowItWorks from '../components/HowItWorks';

SwiperCore.use([Navigation]);

export default function Home() {
  const [offerListings, setOfferListings] = useState([]);
  const [saleListings, setSaleListings] = useState([]);
  const [rentListings, setRentListings] = useState([]);

  useEffect(() => {
    // Persistent Warm-up: Keep pinging until it wakes up
    const warmUpAiService = async () => {
      let attempts = 0;
      const maxAttempts = 20; // Try for ~3 minutes in background

      const ping = async () => {
        try {
          console.log(`[Home] Warm-up ping ${attempts + 1}...`);
          const res = await fetch('/api/price-estimate/health');
          if (res.ok) {
            console.log('[Home] AI Service is READY!');
            return true; // Stop
          } else {
             console.log('[Home] AI Service asleep (503/202).');
             return false; // Continue
          }
        } catch (err) {
           console.log('[Home] Warm-up failed (network).');
           return false;
        }
      };

      // Loop
      while (attempts < maxAttempts) {
        const success = await ping();
        if (success) break;
        attempts++;
        await new Promise(r => setTimeout(r, 10000)); // Wait 10s between pings
      }
    };
    
    warmUpAiService();

    const fetchOfferListings = async () => {
      try {
        const res = await fetch(`/api/listing/get?offer=true&limit=4`);
        const data = await res.json();
        setOfferListings(data);
        fetchRentListings();
      } catch (error) {
        console.log(error);
      }
    };
    const fetchRentListings = async () => {
      try {
        const res = await fetch(`/api/listing/get?type=rent&limit=4`);
        const data = await res.json();
        setRentListings(data);
        fetchSaleListings();
      } catch (error) {
        console.log(error);
      }
    };
    const fetchSaleListings = async () => {
      try {
        const res = await fetch(`/api/listing/get?type=sale&limit=4`);
        const data = await res.json();
        setSaleListings(data);
      } catch (error) {
        console.log(error);
      }
    };
    fetchOfferListings();
  }, []);

  return (
    <div className="bg-gradient-to-b from-blue-950 via-black to-black min-h-screen text-yellow-400">
      {/* Hero Section */}
      <div className="flex flex-col gap-6 py-20 px-4 sm:px-8 max-w-6xl mx-auto text-center">
        <h1 className="text-yellow-300 mt-16 font-extrabold text-4xl sm:text-5xl lg:text-6xl drop-shadow-lg leading-tight">
          Find your <span className="typing-wrapper text-yellow-500">perfect place!</span>
        </h1>
        <p className="text-yellow-200 mt-4 text-sm sm:text-base">
          Sarthak Heights guides you to your ideal home. Explore a diverse selection<br /> of properties,
          thoughtfully curated to meet your unique needs.
        </p>
        <Link
          to="/search"
          className="bg-yellow-400 mt-8 hover:bg-yellow-300 text-black font-bold text-sm sm:text-base px-6 py-3 rounded-full transition duration-300 w-fit mx-auto shadow-lg"
        >
          Let’s get started
        </Link>
      </div>

      {/* How It Works */}
      <div className="mt-24 bg-black mb-20 px-4">
        <HowItWorks />
      </div>

      {/* Review Slider Section - Background Change Applied Here */}
      <div className="bg-blue-950 py-8 px-4 sm:px-6 mb-20">
        <div className="max-w-6xl mx-auto rounded-xl shadow-xl py-6 px-4">
          <h2 className="text-center text-6xl sm:text-4xl font-extrabold text-yellow-400 mb-6">
  Trusted By Our Clients
</h2>

          <div className="h-[160px] sm:h-[180px]">
            <ReviewSlider />
          </div>
        </div>
      </div>

      {/* Swiper Section - Featured Listings */}
      {/* {offerListings?.length > 0 && (
        <div className="bg-black px-4">
          <Swiper navigation className="w-full max-w-6xl bg-black mx-auto">
            {offerListings.map((listing) => (
              <SwiperSlide key={listing._id}>
                <div
                  style={{
                    background: `url(${listing.imageUrls[0]}) center no-repeat`,
                    backgroundSize: 'cover',
                  }}
                  className="h-[400px] bg-violet-950 sm:h-[500px] w-full rounded-xl shadow-xl"
                ></div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )} */}

      {/* Footer */}
      <div className="bg-gradient-to-b from-black via-blue-950 to-black mt-32">
        <Footer />
      </div>
    </div>
  );
}
