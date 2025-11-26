import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import './Service.css';

const Service = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search form state
  const [filters, setFilters] = useState({
    service: searchParams.get('service') || '',
    suburb: searchParams.get('suburb') || '',
    province: searchParams.get('province') || '',
    availability: searchParams.get('availability') || ''
  });

  // Suburbs list
  const [suburbs, setSuburbs] = useState([]);
  const [filteredSuburbs, setFilteredSuburbs] = useState([]);
  const [suburbSearch, setSuburbSearch] = useState('');
  const [showSuburbDropdown, setShowSuburbDropdown] = useState(false);

  // Specialties from database
  const [specialties, setSpecialties] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);

  // Sort state
  const [sortBy, setSortBy] = useState('rating');

  // User location for distance sorting
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    fetchWorkers();
    fetchSuburbs();
    fetchSpecialties();
    getUserLocation();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    setFilters({
      service: params.get('service') || '',
      suburb: params.get('suburb') || '',
      province: params.get('province') || '',
      availability: params.get('availability') || ''
    });
    fetchWorkers();
  }, [searchParams]);

  const fetchSuburbs = async () => {
    try {
      const response = await fetch('/suburbs', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSuburbs(data.suburbs || []);
      }
    } catch (err) {
      console.error('Failed to fetch suburbs:', err);
    }
  };

  const fetchSpecialties = async () => {
    setLoadingSpecialties(true);
    try {
      const response = await fetch('/api/specialties', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSpecialties(data.specialties || []);
      } else {
        // Fallback to hardcoded list if API fails
        setSpecialties([
          'Plumber', 'Painter', 'Gardener', 'Electrician',
          'Handyman', 'Tree Feller', 'Cleaner', 'Carpenter'
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch specialties:', err);
      // Fallback to hardcoded list
      setSpecialties([
        'Plumber', 'Painter', 'Gardener', 'Electrician',
        'Handyman', 'Tree Feller', 'Cleaner', 'Carpenter'
      ]);
    } finally {
      setLoadingSpecialties(false);
    }
  };

  const getUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
        }
      );
    }
  };

  const fetchWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchParams.get('service')) params.append('speciality', searchParams.get('service'));
      if (searchParams.get('suburb')) params.append('suburb', searchParams.get('suburb'));
      if (searchParams.get('province')) params.append('province', searchParams.get('province'));
      if (searchParams.get('availability')) params.append('availability', searchParams.get('availability'));

      const response = await fetch(`/search/workers?${params.toString()}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      setWorkers(data.workers || []);
    } catch (err) {
      console.error('Failed to load workers:', err);
      setError('Unable to load professionals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));

    if (name === 'suburb' && value) {
      setSuburbSearch(value);
      const filtered = suburbs.filter(s =>
        s.suburb.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuburbs(filtered);
      setShowSuburbDropdown(true);
    } else if (name === 'suburb' && !value) {
      setShowSuburbDropdown(false);
    }
  };

  const selectSuburb = (suburb) => {
    setFilters(prev => ({ ...prev, suburb: suburb.suburb, province: suburb.province }));
    setSuburbSearch(suburb.suburb);
    setShowSuburbDropdown(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filters.service) params.append('service', filters.service);
    if (filters.suburb) params.append('suburb', filters.suburb);
    if (filters.province && !filters.suburb) params.append('province', filters.province);
    if (filters.availability) params.append('availability', filters.availability);

    navigate(`/service?${params.toString()}`);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula to calculate distance in km
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleSort = (sortType) => {
    setSortBy(sortType);
    const sorted = [...workers].sort((a, b) => {
      if (sortType === 'rating') {
        return (parseFloat(b.avg_rating) || 0) - (parseFloat(a.avg_rating) || 0);
      } else if (sortType === 'experience') {
        const expA = parseInt(a.experience) || 0;
        const expB = parseInt(b.experience) || 0;
        return expB - expA;
      } else if (sortType === 'reviews') {
        return (b.review_count || 0) - (a.review_count || 0);
      } else if (sortType === 'distance' && userLocation) {
        // Sort by distance if user location is available
        const distA = (a.latitude && a.longitude)
          ? calculateDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude)
          : Infinity;
        const distB = (b.latitude && b.longitude)
          ? calculateDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
          : Infinity;
        return distA - distB;
      }
      return 0;
    });
    setWorkers(sorted);
  };

  const shareWorker = async (worker) => {
    const shareData = {
      title: `${worker.name} - ${worker.speciality}`,
      text: `Check out ${worker.name}, a verified ${worker.speciality} on Fixxa!`,
      url: `${window.location.origin}/profile?id=${worker.id}`
    };

    try {
      if (navigator.share) {
        // Use Web Share API if available
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(shareData.url);
          alert('Link copied to clipboard!');
        } catch (clipboardError) {
          console.error('Failed to share:', clipboardError);
        }
      }
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
  };

  const getResultsTitle = () => {
    const filterCount = [filters.service, filters.suburb || filters.province].filter(v => v).length;
    if (filterCount > 0) {
      const locationText = filters.suburb ? `in ${filters.suburb}` : (filters.province ? `in ${filters.province}` : '');
      return `Found ${workers.length} Professional${workers.length !== 1 ? 's' : ''} ${locationText}`;
    }
    return 'All Professionals';
  };

  return (
    <div className="service-page">
      {/* Search Section */}
      <section className="search-section">
        <h1>Find Your Professional</h1>
        <form className="search-form" onSubmit={handleSearch}>
          <select
            name="service"
            value={filters.service}
            onChange={handleFilterChange}
            disabled={loadingSpecialties}
          >
            <option value="">{loadingSpecialties ? 'Loading...' : 'Service Type'}</option>
            {specialties.map((specialty, idx) => (
              <option key={idx} value={typeof specialty === 'string' ? specialty : specialty.name}>
                {typeof specialty === 'string' ? specialty : specialty.name}
              </option>
            ))}
          </select>

          <div className="suburb-input-container">
            <input
              type="text"
              name="suburb"
              placeholder="Search by suburb..."
              value={suburbSearch || filters.suburb}
              onChange={handleFilterChange}
              onFocus={() => setShowSuburbDropdown(true)}
            />
            {showSuburbDropdown && filteredSuburbs.length > 0 && (
              <div className="suburb-dropdown">
                {filteredSuburbs.slice(0, 10).map((suburb, idx) => (
                  <div
                    key={idx}
                    className="suburb-option"
                    onClick={() => selectSuburb(suburb)}
                  >
                    {suburb.suburb}, {suburb.province}
                  </div>
                ))}
              </div>
            )}
          </div>

          <select
            name="province"
            value={filters.province}
            onChange={handleFilterChange}
            disabled={filters.suburb}
          >
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

          <select
            name="availability"
            value={filters.availability}
            onChange={handleFilterChange}
          >
            <option value="">Professional's Schedule</option>
            <option value="Weekdays">Weekdays Only</option>
            <option value="Weekends">Weekends Only</option>
            <option value="Both">Weekdays & Weekends</option>
          </select>

          <button type="submit">Search</button>
        </form>
      </section>

      {/* Results Section */}
      <section className="results-section">
        <div className="results-header">
          <h2>{getResultsTitle()}</h2>
          <div className="sort-controls">
            <label>Sort by:</label>
            <button
              className={sortBy === 'rating' ? 'active' : ''}
              onClick={() => handleSort('rating')}
            >
              ⭐ Rating
            </button>
            <button
              className={sortBy === 'experience' ? 'active' : ''}
              onClick={() => handleSort('experience')}
            >
              💼 Experience
            </button>
            <button
              className={sortBy === 'reviews' ? 'active' : ''}
              onClick={() => handleSort('reviews')}
            >
              💬 Reviews
            </button>
            {userLocation && (
              <button
                className={sortBy === 'distance' ? 'active' : ''}
                onClick={() => handleSort('distance')}
                title="Sort by distance from your location"
              >
                📍 Distance
              </button>
            )}
          </div>
        </div>

        {loading && <div className="loading">Loading professionals...</div>}

        {error && <div className="error-message">{error}</div>}

        {!loading && !error && (
          <div className="workers-grid">
            {workers.length === 0 ? (
              <p className="no-results">No professionals found matching your criteria.</p>
            ) : (
              workers.map((worker) => {
                const rating = parseFloat(worker.avg_rating) || 0;
                const stars = rating > 0 ? renderStars(rating) : '☆☆☆☆☆';
                const verifiedBadge = worker.id_verified ? (
                  <span className="verified-badge">✓ Verified</span>
                ) : null;
                const certifiedBadge = worker.approved_cert_count > 0 ? (
                  <span className="verified-badge certified-badge">🎓 Certified</span>
                ) : null;

                const location = worker.primary_suburb && worker.province
                  ? `${worker.primary_suburb}, ${worker.province}`
                  : worker.area || 'Location not set';

                const isPending = worker.approval_status === 'pending' || worker.is_pending;

                // Calculate distance if user location and worker location are available
                let distance = null;
                if (userLocation && worker.latitude && worker.longitude) {
                  distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    worker.latitude,
                    worker.longitude
                  );
                }

                return (
                  <div key={worker.id} className={`worker-card-wrapper ${isPending ? 'pending' : ''}`}>
                    {isPending && (
                      <div className="coming-soon-overlay">
                        <div className="coming-soon-content">
                          <div className="coming-soon-icon">⏳</div>
                          <h4>Coming Soon!</h4>
                          <p>{worker.name} will be available shortly</p>
                          <small>Currently under review</small>
                        </div>
                      </div>
                    )}
                    <Link
                      to={`/profile?id=${worker.id}`}
                      className="worker-card"
                      style={{ opacity: isPending ? 0.6 : 1 }}
                    >
                      <img
                        src={worker.profile_picture || '/images/default-profile.svg'}
                        alt={worker.name}
                      />
                      <h3>
                        {worker.name} {verifiedBadge} {certifiedBadge}
                      </h3>
                      <p>{worker.speciality} • {location}</p>
                      {distance && sortBy === 'distance' && (
                        <p className="distance-text">
                          📍 {distance.toFixed(1)} km away
                        </p>
                      )}
                      <p className="experience-text">
                        {worker.experience || 'N/A'} years experience
                      </p>
                      {rating > 0 ? (
                        <div className="rating-display">
                          <span className="rating-number">{rating.toFixed(1)}</span>
                          <span className="rating-stars">{stars}</span>
                          <span className="review-count">({worker.review_count || 0})</span>
                        </div>
                      ) : (
                        <div className="no-reviews">No reviews yet</div>
                      )}
                    </Link>
                    {!isPending && (
                      <button
                        className="share-worker-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          shareWorker(worker);
                        }}
                        title="Share this professional"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        Share
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default Service;
