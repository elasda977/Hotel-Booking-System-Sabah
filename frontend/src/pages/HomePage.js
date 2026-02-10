import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/Toast/ToastContext';
import './HomePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function HomePage() {
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]); // Store all rooms for comparison
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedAmenities, setExpandedAmenities] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  // Search filters
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      const allRoomsData = response.data;

      // Always check availability for today onwards to show accurate room counts
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      try {
        const availableResponse = await axios.get(`${API_URL}/rooms/available`, {
          params: {
            check_in: today,
            check_out: tomorrowStr
          }
        });

        const availableRoomIds = new Set(availableResponse.data.map(r => r.id));

        // Mark rooms with current availability status
        const roomsWithAvailability = allRoomsData.map(room => ({
          ...room,
          isAvailable: availableRoomIds.has(room.id)
        }));

        setRooms(roomsWithAvailability);
        setAllRooms(roomsWithAvailability);
      } catch (availError) {
        console.error('Error checking availability:', availError);
        // Fallback to showing all rooms if availability check fails
        setRooms(allRoomsData);
        setAllRooms(allRoomsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSearch = useCallback(async () => {
    // Validate dates only if both are provided
    if (checkIn && checkOut && new Date(checkIn) >= new Date(checkOut)) {
      toast.warning('Check-out date must be after check-in date');
      return;
    }

    try {
      setLoading(true);

      // If no dates selected, show all rooms
      if (!checkIn || !checkOut) {
        let filteredRooms = allRooms;
        if (guests) {
          filteredRooms = allRooms.filter(room => room.capacity >= guests);
        }
        setRooms(filteredRooms);
        setIsSearchActive(false);
        setLoading(false);
        return;
      }

      // If dates are selected, fetch available rooms and merge with all rooms
      const availableResponse = await axios.get(`${API_URL}/rooms/available`, {
        params: {
          check_in: checkIn,
          check_out: checkOut,
          capacity: guests
        }
      });

      const availableRoomIds = new Set(availableResponse.data.map(r => r.id));

      // Create a merged list: available rooms + unavailable rooms (marked)
      let filteredAllRooms = allRooms;
      if (guests) {
        filteredAllRooms = allRooms.filter(room => room.capacity >= guests);
      }

      // Mark rooms as available or not
      const roomsWithAvailability = filteredAllRooms.map(room => ({
        ...room,
        isAvailable: availableRoomIds.has(room.id)
      }));

      setRooms(roomsWithAvailability);
      setIsSearchActive(true);
      setLoading(false);
    } catch (error) {
      console.error('Error searching rooms:', error);
      toast.error('Error searching for available rooms. Please try again.');
      setLoading(false);
    }
  }, [allRooms, checkIn, checkOut, guests]);

  const clearSearch = useCallback(() => {
    setCheckIn('');
    setCheckOut('');
    setGuests(2);
    setIsSearchActive(false);
    fetchRooms();
  }, [fetchRooms]);

  const handleBookRoom = useCallback((roomType) => {
    // Pass search dates to booking page with room type for auto-assignment
    if (isSearchActive && checkIn && checkOut) {
      navigate(`/booking?roomType=${encodeURIComponent(roomType)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
    } else {
      navigate(`/booking?roomType=${encodeURIComponent(roomType)}`);
    }
  }, [isSearchActive, checkIn, checkOut, guests, navigate]);

  const toggleAmenities = useCallback((roomType) => {
    setExpandedAmenities(prev => ({
      ...prev,
      [roomType]: !prev[roomType]
    }));
  }, []);

  const openImageModal = useCallback((imageUrl) => {
    setSelectedImage(imageUrl);
  }, []);

  const closeImageModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Group rooms by room type - memoized for performance
  const groupRoomsByType = useCallback((roomsList) => {
    const grouped = {};
    roomsList.forEach(room => {
      if (!grouped[room.room_type]) {
        grouped[room.room_type] = {
          room_type: room.room_type,
          description: room.description,
          price_per_night: room.price_per_night,
          capacity: room.capacity,
          amenities: room.amenities,
          image_url: room.image_url,
          rooms: []
        };
      }
      // Only add room to available list if it's marked as available (or not marked at all for non-search mode)
      if (room.isAvailable !== false) {
        grouped[room.room_type].rooms.push(room);
      }
    });
    return Object.values(grouped);
  }, []);

  // Group rooms by capacity - memoized for performance
  const groupedRooms = useMemo(() => ({
    2: rooms.filter(room => room.capacity === 2 && room.room_type !== 'Presidential Suite'),
    4: rooms.filter(room => room.capacity === 4),
    8: rooms.filter(room => room.capacity === 8),
    luxury: rooms.filter(room => room.room_type === 'Presidential Suite')
  }), [rooms]);

  const categories = useMemo(() => [
    { id: 'all', label: 'All Rooms', count: Object.keys(groupRoomsByType(rooms)).length },
    { id: '2', label: 'Deluxe Rooms (2 Guests)', count: Object.keys(groupRoomsByType(groupedRooms[2])).length },
    { id: '4', label: 'Family Rooms (4 Guests)', count: Object.keys(groupRoomsByType(groupedRooms[4])).length },
    { id: '8', label: 'Group Suites (8 Guests)', count: Object.keys(groupRoomsByType(groupedRooms[8])).length },
    { id: 'luxury', label: 'Presidential Suites', count: Object.keys(groupRoomsByType(groupedRooms.luxury)).length }
  ], [rooms, groupedRooms, groupRoomsByType]);

  const getFilteredRooms = useCallback(() => {
    if (selectedCategory === 'all') return groupRoomsByType(rooms);
    if (selectedCategory === 'luxury') return groupRoomsByType(groupedRooms.luxury);
    return groupRoomsByType(groupedRooms[selectedCategory]);
  }, [selectedCategory, rooms, groupedRooms, groupRoomsByType]);

  if (loading) {
    return (
      <div className="container">
        <p className="loading" role="status" aria-live="polite">Loading rooms...</p>
      </div>
    );
  }

  return (
    <div className="homepage">
      <a href="#main-content" className="skip-to-content">Skip to room listings</a>
      <div className="hero-section">
        <div className="hero-content">
          <h1>Find Your Perfect Stay</h1>
          <p>Discover comfortable rooms and luxurious suites for every occasion</p>

          <div className="search-bar" role="search" aria-label="Room search form">
            <div className="search-field date-range-field">
              <label htmlFor="check-in-date">Check-in — Check-out</label>
              <div className="date-range-inputs">
                <input
                  id="check-in-date"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  aria-label="Select check-in date"
                  aria-required="true"
                />
                <span className="date-separator">—</span>
                <input
                  id="check-out-date"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  aria-label="Select check-out date"
                  aria-required="true"
                />
              </div>
            </div>

            <div className="search-field">
              <label htmlFor="guest-count">Guests</label>
              <select
                id="guest-count"
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value))}
                aria-label="Select number of guests"
              >
                <option value={1}>1 Guest</option>
                <option value={2}>2 Guests</option>
                <option value={3}>3 Guests</option>
                <option value={4}>4 Guests</option>
                <option value={5}>5 Guests</option>
                <option value={6}>6 Guests</option>
                <option value={7}>7 Guests</option>
                <option value={8}>8 Guests</option>
              </select>
            </div>

            <div className="search-actions">
              <button
                className="btn-search"
                onClick={handleSearch}
                disabled={loading}
                aria-label="Search available rooms"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              {isSearchActive && (
                <button
                  className="btn-clear"
                  onClick={clearSearch}
                  aria-label="Clear search filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container" id="main-content">
        {isSearchActive && (
          <div className="search-results-info" role="status" aria-live="polite">
            <p>
              Showing available rooms for {guests} guest{guests > 1 ? 's' : ''} from{' '}
              <strong>{new Date(checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}</strong> to{' '}
              <strong>{new Date(checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}</strong>
            </p>
            <p className="results-count">{getFilteredRooms().length} room type{getFilteredRooms().length !== 1 ? 's' : ''} available</p>
          </div>
        )}

        <div className="category-filter">
          {categories.map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
              <span className="count">({category.count})</span>
            </button>
          ))}
        </div>

        <div className="rooms-grid">
          {getFilteredRooms().map(roomGroup => (
            <div key={roomGroup.room_type} className="room-card-modern">
              <div className="room-image-container">
                <img
                  src={roomGroup.image_url}
                  alt={`${roomGroup.room_type} - ${roomGroup.description}`}
                  className="room-image"
                  onClick={() => openImageModal(roomGroup.image_url)}
                  onKeyDown={(e) => e.key === 'Enter' && openImageModal(roomGroup.image_url)}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800';
                  }}
                  loading="lazy"
                  role="button"
                  tabIndex={0}
                  aria-label={`View larger image of ${roomGroup.room_type}`}
                />
                <span className="room-badge" aria-label={`Capacity: ${roomGroup.capacity} guests`}>{roomGroup.capacity} Guests</span>
                <span className="room-count-badge" aria-label={`${roomGroup.rooms.length} rooms available`}>{roomGroup.rooms.length} Rooms Available</span>
              </div>

              <div className="room-content">
                <div className="room-header-modern">
                  <div>
                    <h3 className="room-title">{roomGroup.room_type}</h3>
                  </div>
                  <div className="room-price-tag">
                    <span className="price-amount">RM{roomGroup.price_per_night}</span>
                    <span className="price-period">/night</span>
                  </div>
                </div>

                <p className="room-description">{roomGroup.description}</p>

                {roomGroup.amenities && (
                  <div className="amenities">
                    {expandedAmenities[roomGroup.room_type]
                      ? roomGroup.amenities.split(',').map((amenity, index) => (
                          <span key={index} className="amenity-tag">
                            {amenity.trim()}
                          </span>
                        ))
                      : roomGroup.amenities.split(',').slice(0, 4).map((amenity, index) => (
                          <span key={index} className="amenity-tag">
                            {amenity.trim()}
                          </span>
                        ))
                    }
                    {roomGroup.amenities.split(',').length > 4 && (
                      <button
                        type="button"
                        className="amenity-tag more clickable"
                        onClick={() => toggleAmenities(roomGroup.room_type)}
                        aria-expanded={expandedAmenities[roomGroup.room_type] || false}
                        aria-label={expandedAmenities[roomGroup.room_type]
                          ? 'Show fewer amenities'
                          : `Show ${roomGroup.amenities.split(',').length - 4} more amenities`
                        }
                      >
                        {expandedAmenities[roomGroup.room_type]
                          ? 'Show less'
                          : `+${roomGroup.amenities.split(',').length - 4} more`
                        }
                      </button>
                    )}
                  </div>
                )}

                <div className={`available-rooms-section ${roomGroup.rooms.length === 0 ? 'fully-booked' : ''}`}>
                  <button
                    className={`btn-book-now ${roomGroup.rooms.length === 0 ? 'disabled' : ''}`}
                    onClick={() => handleBookRoom(roomGroup.room_type)}
                    disabled={roomGroup.rooms.length === 0}
                  >
                    {roomGroup.rooms.length > 0 ? 'Book Now' : 'Fully Booked'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {getFilteredRooms().length === 0 && (
          <div className="no-rooms" role="alert">
            <p>
              {isSearchActive
                ? 'No rooms available for your selected dates and guest count. Please try different dates or adjust your search criteria.'
                : 'No rooms available in this category'}
            </p>
            {isSearchActive && (
              <button className="btn-search" onClick={clearSearch} style={{ marginTop: '1rem' }}>
                View All Rooms
              </button>
            )}
          </div>
        )}
      </div>

      {selectedImage && (
        <div
          className="image-modal"
          onClick={closeImageModal}
          onKeyDown={(e) => e.key === 'Escape' && closeImageModal()}
          role="dialog"
          aria-modal="true"
          aria-label="Room image preview"
        >
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="image-modal-close"
              onClick={closeImageModal}
              aria-label="Close image preview"
              autoFocus
            >
              &times;
            </button>
            <img src={selectedImage} alt="Room preview" />
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
