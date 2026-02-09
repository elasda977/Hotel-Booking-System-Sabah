import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ConfirmationPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function ConfirmationPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings/${bookingId}`);
      setBooking(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching booking:', error);
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  if (loading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  if (!booking) {
    return (
      <div className="container">
        <div className="card">
          <h2>Booking not found</h2>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="confirmation-container">
        <div className="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" role="img" aria-label="Booking confirmed">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1>Booking Confirmed!</h1>
        <p className="confirmation-message">
          Thank you for your booking. A confirmation email has been sent to {booking.customer_email}
        </p>

        <div className="booking-details-card">
          <h2>Booking Details</h2>

          <dl className="detail-list">
            <div className="detail-row">
              <dt className="detail-label">Booking ID:</dt>
              <dd className="detail-value">#{booking.id}</dd>
            </div>

            <div className="detail-row">
              <dt className="detail-label">Room:</dt>
              <dd className="detail-value">{booking.room_type} - Room {booking.room_number}</dd>
            </div>

            <div className="detail-row">
              <dt className="detail-label">Guest Name:</dt>
              <dd className="detail-value">{booking.customer_name}</dd>
            </div>

            <div className="detail-row">
              <dt className="detail-label">Email:</dt>
              <dd className="detail-value">{booking.customer_email}</dd>
            </div>

            <div className="detail-row">
              <dt className="detail-label">Phone:</dt>
              <dd className="detail-value">{booking.customer_phone}</dd>
            </div>

            <div className="detail-row">
              <dt className="detail-label">Check-in:</dt>
              <dd className="detail-value">{new Date(booking.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}</dd>
            </div>

            <div className="detail-row">
              <dt className="detail-label">Check-out:</dt>
              <dd className="detail-value">{new Date(booking.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}</dd>
            </div>

            <div className="detail-row total-row">
              <dt className="detail-label">Total Price:</dt>
              <dd className="detail-value total-price">RM{booking.total_price}</dd>
            </div>

            <div className="detail-row">
              <dt className="detail-label">Status:</dt>
              <dd className={`status-badge status-${booking.status}`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="action-buttons">
          {booking.status === 'pending' && (
            <button
              onClick={() => navigate(`/upload-receipt/${booking.id}`)}
              className="btn btn-primary"
              style={{ marginRight: '1rem' }}
            >
              Upload Payment Receipt
            </button>
          )}
          <Link to="/" className="btn btn-secondary">Book Another Room</Link>
        </div>

        <div className="info-box">
          <h3>What's Next?</h3>
          <ul>
            {booking.status === 'pending' && (
              <li><strong>Please upload your payment receipt to confirm your booking</strong></li>
            )}
            <li>You will receive a confirmation email shortly</li>
            <li>Please arrive at the hotel after 2:00 PM on your check-in date</li>
            <li>Check-out time is 11:00 AM</li>
            <li>For any changes or cancellations, please contact us directly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationPage;
