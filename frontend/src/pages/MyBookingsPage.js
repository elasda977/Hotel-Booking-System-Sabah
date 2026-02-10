import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authAxios from '../utils/auth';
import './MyBookingsPage.css';

function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await authAxios.get('/my-bookings');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  if (loading) {
    return <div className="container"><p>Loading your bookings...</p></div>;
  }

  return (
    <div className="my-bookings-page">
      <div className="container">
        <div className="page-header">
          <h1>My Bookings</h1>
          <Link to="/" className="btn-book-new">Book a Room</Link>
        </div>

        <div className="filter-bar">
          {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="filter-count">
                  ({bookings.filter(b => b.status === f).length})
                </span>
              )}
              {f === 'all' && (
                <span className="filter-count">({bookings.length})</span>
              )}
            </button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <h3>No bookings found</h3>
            <p>{filter === 'all' ? "You haven't made any bookings yet." : `No ${filter} bookings.`}</p>
            <Link to="/" className="btn-book-new">Browse Rooms</Link>
          </div>
        ) : (
          <div className="bookings-list">
            {filteredBookings.map(booking => (
              <div key={booking.id} className="booking-card">
                <div className="booking-card-header">
                  <div>
                    <h3>{booking.room_type}</h3>
                    <p className="booking-room">Room {booking.room_number}</p>
                  </div>
                  <span className={`booking-status ${getStatusClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="booking-card-body">
                  <div className="booking-detail">
                    <span className="detail-label">Check-in</span>
                    <span>{new Date(booking.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="booking-detail">
                    <span className="detail-label">Check-out</span>
                    <span>{new Date(booking.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="booking-detail">
                    <span className="detail-label">Total</span>
                    <span className="booking-price">RM{booking.total_price}</span>
                  </div>
                  <div className="booking-detail">
                    <span className="detail-label">Booked on</span>
                    <span>{new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                {booking.status === 'pending' && !booking.receipt_url && (
                  <div className="booking-card-footer">
                    <Link to={`/upload-receipt/${booking.id}`} className="btn-upload">
                      Upload Receipt
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBookingsPage;
