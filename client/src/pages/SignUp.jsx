import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';


export default function SignUp() {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      console.log(data);
      if (data.success === false) {
        setLoading(false);
        setError(data.message);
        return;
      }
      setLoading(false);
      setError(null);
      // Clear client-side signals for a fresh account session
      try {
        localStorage.removeItem('favorites');
        localStorage.removeItem('recentlyViewed');
        localStorage.removeItem('lastSearch');
      } catch (e) {
        console.warn('Could not clear localStorage on signup', e);
      }
      navigate('/sign-in');
    } catch (error) {
      setLoading(false);
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-800 via-black to-blue-900 flex items-center justify-center">
      <div className="p-8 sm:p-10 max-w-lg w-full bg-gradient-to-r from-blue-800 via-black to-blue-900 bg-opacity-90 rounded-2xl shadow-2xl">
        <h1 className="text-4xl text-center font-semibold text-yellow-400 my-5">Sign Up</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <input
            type="text"
            placeholder="Username"
            className="border-2 border-yellow-500 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white bg-transparent"
            id="username"
            onChange={handleChange}
          />
          <input
            type="email"
            placeholder="Email"
            className="border-2 border-yellow-500 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white bg-transparent"
            id="email"
            onChange={handleChange}
          />
          <input
            type="password"
            placeholder="Password"
            className="border-2 border-yellow-500 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-white bg-transparent"
            id="password"
            onChange={handleChange}
          />
          <button
            disabled={loading}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black p-3 rounded-lg uppercase hover:bg-yellow-300 transition-all duration-300 disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Sign Up'}
          </button>

          {/* OAuth Component handles Google Sign In */}
        
        </form>
        <div className="flex gap-2 mt-5 justify-center">
          <p className="text-white">Already have an account?</p>
          <Link to="/sign-in">
            <span className="text-yellow-300 hover:text-yellow-400 cursor-pointer">Sign In</span>
          </Link>
        </div>
        {error && <p className="text-red-500 mt-5 text-center">{error}</p>}
      </div>
    </div>
  );
}
