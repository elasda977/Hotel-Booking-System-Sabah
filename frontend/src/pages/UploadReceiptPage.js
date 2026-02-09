import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UploadReceiptPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function UploadReceiptPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings/${bookingId}`);
      setBooking(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError('Failed to load booking details');
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid file (PNG, JPG, or PDF)');
        setSelectedFile(null);
        return;
      }

      // Validate file size (max 16MB)
      if (file.size > 16 * 1024 * 1024) {
        setError('File size must be less than 16MB');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('receipt', selectedFile);

      await axios.post(`${API_URL}/bookings/${bookingId}/upload-receipt`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadSuccess(true);
      setUploading(false);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      setError('Failed to upload receipt. Please try again.');
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="container"><p className="loading">Loading...</p></div>;
  }

  if (!booking) {
    return <div className="container"><p className="error">Booking not found</p></div>;
  }

  if (uploadSuccess) {
    return (
      <div className="upload-receipt-page">
        <div className="container">
          <div className="success-card">
            <div className="success-icon" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" role="img" aria-label="Upload successful">
                <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
                <path d="M8 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2>Receipt Uploaded Successfully!</h2>
            <p>Your payment receipt has been uploaded. Our team will verify it shortly and send you a confirmation email.</p>
            <div className="success-actions">
              <button className="btn-primary" onClick={() => navigate('/')}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-receipt-page">
      <div className="container">
        <h1>Upload Payment Receipt</h1>
        <p className="subtitle">Please upload your payment receipt to complete your booking</p>

        <div className="content-grid">
          <div className="booking-details-card">
            <h2>Booking Details</h2>
            <dl className="detail-list">
              <div className="detail-row">
                <dt className="detail-label">Booking ID:</dt>
                <dd className="detail-value">#{booking.id}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-label">Room:</dt>
                <dd className="detail-value">{booking.room_type} - {booking.room_number}</dd>
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
                <dt className="detail-label">Check-in:</dt>
                <dd className="detail-value">
                  {new Date(booking.check_in).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </dd>
              </div>
              <div className="detail-row">
                <dt className="detail-label">Check-out:</dt>
                <dd className="detail-value">
                  {new Date(booking.check_out).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </dd>
              </div>
              <div className="detail-row total-row">
                <dt className="detail-label">Total Amount:</dt>
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

          <div className="upload-form-card">
            <h2>Upload Receipt</h2>
            <p className="info-text">
              Please upload a clear copy of your payment receipt. Accepted formats: PNG, JPG, PDF (max 16MB)
            </p>

            {error && <div className="alert alert-error" role="alert">{error}</div>}

            <form onSubmit={handleUpload}>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="receipt-file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="receipt-file" className="file-input-label" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('receipt-file').click(); } }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {selectedFile ? selectedFile.name : 'Choose file'}
                </label>
              </div>

              <button
                type="submit"
                className="btn-submit"
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Receipt'}
              </button>
            </form>

            <div className="help-text">
              <h3>Payment Instructions:</h3>
              <ol>
                <li>Transfer the total amount to our bank account</li>
                <li>Take a screenshot or photo of the receipt</li>
                <li>Upload it using the form above</li>
                <li>Wait for confirmation email from our team</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadReceiptPage;
