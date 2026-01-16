import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ListingItem from './ListingItem';

export default function RecommendedProperties({ topN = 5 }) {
  const { currentUser } = useSelector((state) => state.user);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRecommendations() {
      setLoading(true);
      setError(null);

      try {
        let favoriteIds = [];
        if (currentUser) {
            favoriteIds = currentUser.favorites || [];
        } else {
            favoriteIds = JSON.parse(localStorage.getItem('favorites')) || [];
        }

        const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
        const lastSearch = JSON.parse(localStorage.getItem('lastSearch') || 'null');

        const params = new URLSearchParams();
        if (favoriteIds.length) params.set('favorites', favoriteIds.join(','));
        if (recentlyViewed.length) params.set('recentlyViewed', recentlyViewed.map((l) => l._id || l).join(','));
        if (lastSearch) params.set('lastSearch', JSON.stringify(lastSearch));
        params.set('topN', String(topN));

        const userId = currentUser?._id || 'guest';
        const res = await fetch(`/api/recommendations/${userId}?${params.toString()}`);
        // Protect against empty or non-JSON responses
        const text = await res.text();
        if (!res.ok) {
          let msg = `Request failed: ${res.status}`;
          try { const parsed = JSON.parse(text); msg = parsed.message || parsed.error || msg; } catch (e) {}
          throw new Error(msg);
        }
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { throw new Error('Invalid JSON from recommendations service'); }
        setListings((data && data.recommendations) || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
    // Re-fetch when user updates favorites, recently viewed, or lastSearch in this tab
    const rerender = () => fetchRecommendations();
    window.addEventListener('favoritesUpdated', rerender);
    window.addEventListener('recentlyViewedUpdated', rerender);
    window.addEventListener('lastSearchUpdated', rerender);
    // Also listen to storage events (other tabs)
    const onStorage = (e) => {
      if (e.key === 'favorites' || e.key === 'recentlyViewed' || e.key === 'lastSearch') fetchRecommendations();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('favoritesUpdated', rerender);
      window.removeEventListener('recentlyViewedUpdated', rerender);
      window.removeEventListener('lastSearchUpdated', rerender);
      window.removeEventListener('storage', onStorage);
    };
  }, [currentUser, topN]);

  if (loading) return <div className="p-4">Loading recommendations...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;
  if (!listings || listings.length === 0) return <div className="p-4">No recommendations yet.</div>;

  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold text-yellow-200 mb-4">Recommended for You</h2>
      <div className="flex flex-wrap gap-6">
        {listings.map((l) => (
          <ListingItem key={l._id} listing={l} />
        ))}
      </div>
    </section>
  );
}
