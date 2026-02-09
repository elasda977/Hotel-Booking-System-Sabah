import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './BookingPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function BookingPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState(null);

  // Get room type and dates from URL parameters
  const roomType = searchParams.get('roomType');
  const urlCheckIn = searchParams.get('checkIn');
  const urlCheckOut = searchParams.get('checkOut');
  const urlGuests = searchParams.get('guests');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in: urlCheckIn || '',
    check_out: urlCheckOut || ''
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchRoom = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);

      // If roomType is provided, use it (new auto-assignment approach)
      // Otherwise fall back to roomId (legacy approach)
      let selectedRoom;
      if (roomType) {
        selectedRoom = response.data.find(r => r.room_type === roomType);
      } else if (roomId) {
        selectedRoom = response.data.find(r => r.id === parseInt(roomId));
      }

      setRoom(selectedRoom);
    } catch (error) {
      console.error('Error fetching room:', error);
    }
  }, [roomType, roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const [priceBreakdown, setPriceBreakdown] = useState(null);

  const calculateTotalPrice = useCallback(async () => {
    if (formData.check_in && formData.check_out && room) {
      const checkIn = new Date(formData.check_in);
      const checkOut = new Date(formData.check_out);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      if (nights > 0) {
        try {
          const res = await axios.post(`${API_URL}/bookings/calculate-price`, {
            check_in: formData.check_in,
            check_out: formData.check_out,
            room_price: room.price_per_night,
            room_type: room.room_type
          });
          setTotalPrice(res.data.total_price);
          setPriceBreakdown(res.data.breakdown);
          setError('');
        } catch (err) {
          if (err.response?.data?.error) {
            setError(err.response.data.error);
            setTotalPrice(0);
            setPriceBreakdown(null);
          } else {
            setTotalPrice(nights * room.price_per_night);
            setPriceBreakdown(null);
          }
        }
      } else {
        setTotalPrice(0);
        setPriceBreakdown(null);
      }
    }
  }, [formData.check_in, formData.check_out, room]);

  useEffect(() => {
    calculateTotalPrice();
  }, [calculateTotalPrice]);

  const handleChange = useCallback((e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }, [formData]);

  const openImageModal = useCallback((imageUrl) => {
    setSelectedImage(imageUrl);
  }, []);

  const closeImageModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.check_in || !formData.check_out) {
      setError('Please select check-in and check-out dates');
      setLoading(false);
      return;
    }

    const checkIn = new Date(formData.check_in);
    const checkOut = new Date(formData.check_out);

    if (checkOut <= checkIn) {
      setError('Check-out date must be after check-in date');
      setLoading(false);
      return;
    }

    try {
      // Build booking data with room_type (auto-assignment) or room_id (legacy)
      const bookingData = {
        ...formData,
        total_price: totalPrice
      };

      if (roomType) {
        bookingData.room_type = roomType;
      } else if (roomId) {
        // Check availability for specific room (legacy)
        const availabilityResponse = await axios.post(
          `${API_URL}/rooms/${roomId}/availability`,
          {
            check_in: formData.check_in,
            check_out: formData.check_out
          }
        );

        if (!availabilityResponse.data.available) {
          setError('Room is not available for selected dates');
          setLoading(false);
          return;
        }

        bookingData.room_id = parseInt(roomId);
      }

      const response = await axios.post(`${API_URL}/bookings`, bookingData);
      navigate(`/confirmation/${response.data.id}`);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create booking');
      setLoading(false);
    }
  }, [formData, totalPrice, roomType, roomId, navigate]);

  if (!room) {
    return <div className="container"><p>Loading...</p></div>;
  }

  return (
    <div className="container">
      <div className="booking-container">
        <div className="room-summary">
          {room.image_url && (
            <img
              src={room.image_url}
              alt={room.room_type}
              className="booking-room-image clickable"
              onClick={() => openImageModal(room.image_url)}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800';
              }}
            />
          )}
          <h2>{room.room_type}</h2>
          {!roomType && room.room_number && (
            <p className="room-number">Room {room.room_number}</p>
          )}
          <p className="description">{room.description}</p>

          {room.amenities && (
            <div className="booking-amenities">
              <h4>Room Amenities</h4>
              <div className="amenities-list">
                {room.amenities.split(',').map((amenity, index) => (
                  <span key={index} className="amenity-item">
                    ✓ {amenity.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="room-info">
            <p><strong>Capacity:</strong> {room.capacity} {room.capacity === 1 ? 'person' : 'people'}</p>
            <p><strong>Price:</strong> RM{room.price_per_night} / night</p>
          </div>
          {totalPrice > 0 && (
            <div className="price-summary">
              <h3>Total Price</h3>
              <p className="total-price">RM{totalPrice}</p>
              {priceBreakdown && priceBreakdown.some(n => n.notes !== 'Standard rate') && (
                <div className="price-breakdown">
                  <h4>Nightly Breakdown</h4>
                  {priceBreakdown.map((night, i) => (
                    <div key={i} className="breakdown-row">
                      <span>{new Date(night.date).toLocaleDateString('en-GB')}</span>
                      <span>RM{night.total} {night.notes !== 'Standard rate' ? `(${night.notes})` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="booking-form-container">
          <h2>Booking Details</h2>

          {urlCheckIn && urlCheckOut && (
            <div className="alert alert-info">
              Pre-filled with your search dates: {new Date(urlCheckIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })} - {new Date(urlCheckOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}
              {urlGuests && ` for ${urlGuests} guest${urlGuests > 1 ? 's' : ''}`}
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="customer_name">Full Name *</label>
              <input
                type="text"
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </div>

            <div className="form-group">
              <label htmlFor="customer_email">Email *</label>
              <input
                type="email"
                id="customer_email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </div>

            <div className="form-group">
              <label htmlFor="customer_phone">Phone Number *</label>
              <input
                type="tel"
                id="customer_phone"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                required
                aria-required="true"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="check_in">Check-in Date *</label>
                <input
                  type="date"
                  id="check_in"
                  name="check_in"
                  value={formData.check_in}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  aria-required="true"
                />
              </div>

              <div className="form-group">
                <label htmlFor="check_out">Check-out Date *</label>
                <input
                  type="date"
                  id="check_out"
                  name="check_out"
                  value={formData.check_out}
                  onChange={handleChange}
                  min={formData.check_in || new Date().toISOString().split('T')[0]}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success btn-block"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
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
            <img src={selectedImage} alt={`${room.room_type} room preview`} />
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingPage;
