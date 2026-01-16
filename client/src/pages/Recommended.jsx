import RecommendedProperties from '../components/RecommendedProperties';

export default function Recommended() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-950 via-black to-black text-yellow-200 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-yellow-200 mb-6">Recommended for You</h1>
        <RecommendedProperties topN={6} />
      </div>
    </main>
  );
}
