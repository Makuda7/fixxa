import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfessionalCarousel from '../components/ProfessionalCarousel';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [featuredTitle, setFeaturedTitle] = useState('Top Rated Professionals');

  // Search form state
  const [searchForm, setSearchForm] = useState({
    service: '',
    province: '',
    availability: ''
  });

  useEffect(() => {
    // Check location permission
    const locationPermissionAsked = localStorage.getItem('locationPermissionAsked') === 'true';
    const savedLocation = sessionStorage.getItem('userLocation');
    const locationEnabled = localStorage.getItem('locationEnabled') === 'true';

    if (savedLocation && locationEnabled) {
      setUserLocation(JSON.parse(savedLocation));
    } else if (!locationPermissionAsked) {
      setTimeout(() => setShowLocationModal(true), 1500);
    }

    // Load featured professionals
    loadFeaturedPros();
  }, []);

  const requestLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setUserLocation(location);
      sessionStorage.setItem('userLocation', JSON.stringify(location));
      localStorage.setItem('locationEnabled', 'true');
      setShowLocationModal(false);
      loadFeaturedPros(location);
    } catch (error) {
      console.error('Location error:', error);
      setShowLocationModal(false);
      loadFeaturedPros();
    }
  };

  const handleLocationAllow = () => {
    localStorage.setItem('locationPermissionAsked', 'true');
    requestLocation();
  };

  const handleLocationDeny = () => {
    localStorage.setItem('locationPermissionAsked', 'true');
    setShowLocationModal(false);
    loadFeaturedPros();
  };

  const loadFeaturedPros = async (location = userLocation) => {
    setLoading(true);
    try {
      let response;

      if (location) {
        response = await fetch(
          `/workers/nearby?latitude=${location.latitude}&longitude=${location.longitude}&radius=50`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          console.warn('Nearby workers failed, falling back to all workers');
          response = await fetch('/workers', { credentials: 'include' });
        } else {
          setFeaturedTitle('Nearest Top Rated Professionals');
        }
      } else {
        response = await fetch('/workers', { credentials: 'include' });
        setFeaturedTitle('Top Rated Professionals');
      }

      let workersData = await response.json();

      // Ensure workers is an array
      if (!Array.isArray(workersData)) {
        console.error('Workers is not an array:', workersData);
        workersData = [];
      }

      // Sort by rating if not already sorted by distance
      if (!location || workersData.length === 0) {
        workersData.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
      }

      // Get top 3 workers with their actual review ratings
      const top3Workers = workersData.slice(0, 3);
      const workersWithReviews = await Promise.all(
        top3Workers.map(async (worker) => {
          try {
            const reviewsRes = await fetch(`/reviews?workerId=${worker.id}`, {
              credentials: 'include'
            });
            const reviews = await reviewsRes.json();

            let actualRating = 0;
            let reviewCount = 0;

            if (Array.isArray(reviews) && reviews.length > 0) {
              actualRating = reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length;
              reviewCount = reviews.length;
            }

            return { ...worker, actualRating, reviewCount };
          } catch (err) {
            console.error('Failed to fetch reviews for worker:', worker.id, err);
            return { ...worker, actualRating: 0, reviewCount: 0 };
          }
        })
      );

      setWorkers(workersWithReviews);
    } catch (error) {
      console.error('Failed to load featured professionals', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (searchForm.service) params.append('service', searchForm.service);
    if (searchForm.province) params.append('province', searchForm.province);
    if (searchForm.availability) params.append('availability', searchForm.availability);

    navigate(`/service?${params.toString()}`);
  };

  const handleInputChange = (e) => {
    setSearchForm({
      ...searchForm,
      [e.target.name]: e.target.value
    });
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  };

  return (
    <div className="home-page">
      {/* Location Permission Modal */}
      {showLocationModal && (
        <div className="location-modal-overlay">
          <div className="location-modal">
            <div className="location-modal-icon">
              <img src="/images/icons-fixxa/travel.png" alt="Location" style={{ width: '48px', height: '48px' }} />
            </div>
            <h3>Enable Location Services</h3>
            <p>Fixxa would like to access your location to show you the nearest professionals in your area.</p>
            <div className="location-modal-actions">
              <button className="location-btn-cancel" onClick={handleLocationDeny}>
                Not Now
              </button>
              <button className="location-btn-allow" onClick={handleLocationAllow}>
                Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section
        className="hero"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(/images/Home-Repairsbackground.jpg)'
        }}
      >
        <h1>Find trusted pros near you</h1>

        {/* Engaging Intro */}
        <div className="hero-intro">
          <p>
            <strong>No more dodgy contractors.</strong> Fixxa connects you with verified, rated professionals who actually show up and deliver quality work. Real reviews from real customers. Book with confidence.
          </p>
          <div className="hero-features">
            <div className="hero-feature">
              <div className="hero-feature-icon">✓</div>
              <div className="hero-feature-text">Verified Professionals</div>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-icon">⭐</div>
              <div className="hero-feature-text">Real Customer Reviews</div>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-icon">💬</div>
              <div className="hero-feature-text">Direct Communication</div>
            </div>
            <div className="hero-feature">
              <div className="hero-feature-icon">🔒</div>
              <div className="hero-feature-text">Secure Platform</div>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <select name="service" value={searchForm.service} onChange={handleInputChange}>
            <option value="">Service Type</option>
            <option value="Plumber">Plumber</option>
            <option value="Painter">Painter</option>
            <option value="Gardener">Gardener</option>
            <option value="Electrician">Electrician</option>
            <option value="Handyman">Handyman</option>
            <option value="Tree Feller">Tree Feller</option>
          </select>

          <select name="province" value={searchForm.province} onChange={handleInputChange}>
            <option value="">Province</option>
            <option value="Eastern Cape">Eastern Cape</option>
            <option value="Free State">Free State</option>
            <option value="Gauteng">Gauteng</option>
            <option value="KwaZulu-Natal">KwaZulu-Natal</option>
            <option value="Limpopo">Limpopo</option>
            <option value="Mpumalanga">Mpumalanga</option>
            <option value="Northern Cape">Northern Cape</option>
            <option value="North West">North West</option>
            <option value="Western Cape">Western Cape</option>
          </select>

          <select name="availability" value={searchForm.availability} onChange={handleInputChange}>
            <option value="">Professional's Schedule</option>
            <option value="Weekdays">Weekdays Only</option>
            <option value="Weekends">Weekends Only</option>
            <option value="Both">Weekdays & Weekends</option>
          </select>

          <button type="submit">Search</button>
        </form>
      </section>

      {/* Featured Professionals - 3D Carousel */}
      {loading ? (
        <section className="featured">
          <p className="loading-text">Loading...</p>
        </section>
      ) : workers.length === 0 ? (
        <section className="featured">
          <h2>{featuredTitle}</h2>
          <p className="no-results">No professionals available at the moment.</p>
        </section>
      ) : (
        <ProfessionalCarousel
          professionals={workers.map(worker => ({
            ...worker,
            profile_photo_url: worker.image || worker.profile_picture || '/images/default-profile.svg',
            avg_rating: worker.actualRating,
            review_count: worker.reviewCount,
            years_of_experience: worker.experience || worker.years_of_experience
          }))}
        />
      )}
    </div>
  );
};

export default Home;
