import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AgentBookingPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function AgentBookingPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [loading, setLoading] = useState(false);

  const [bookingData, setBookingData] = useState({
    room_type: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in: '',
    check_out: '',
    guests: 1
  });

  useEffect(() => {
    fetchAgents();
    fetchRoomTypes();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_URL}/agents`);
      // Only show approved agents
      const approvedAgents = response.data.filter(agent => agent.status === 'approved');
      setAgents(approvedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      setRoomTypes(response.data.map(cat => cat.name));
    } catch (error) {
      // Fallback to room-based types if categories API fails
      try {
        const roomResponse = await axios.get(`${API_URL}/rooms`);
        const types = [...new Set(roomResponse.data.map(room => room.room_type))];
        setRoomTypes(types);
      } catch (err) {
        console.error('Error fetching room types:', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAgent) {
      alert('Please select an agent');
      return;
    }

    setLoading(true);

    try {
      // Get room price for the selected type
      const roomResponse = await axios.get(`${API_URL}/rooms`);
      const room = roomResponse.data.find(r => r.room_type === bookingData.room_type);

      if (!room) {
        alert('Selected room type not available');
        setLoading(false);
        return;
      }

      // Use server-side price calculation
      let totalPrice;
      try {
        const priceRes = await axios.post(`${API_URL}/bookings/calculate-price`, {
          check_in: bookingData.check_in,
          check_out: bookingData.check_out,
          room_price: room.price_per_night,
          room_type: bookingData.room_type
        });
        totalPrice = priceRes.data.total_price;
      } catch (priceErr) {
        if (priceErr.response?.data?.error) {
          alert(priceErr.response.data.error);
          setLoading(false);
          return;
        }
        // Fallback to simple calculation
        const checkIn = new Date(bookingData.check_in);
        const checkOut = new Date(bookingData.check_out);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        totalPrice = room.price_per_night * nights;
      }

      const bookingPayload = {
        ...bookingData,
        total_price: totalPrice,
        agent_id: parseInt(selectedAgent)
      };

      const response = await axios.post(`${API_URL}/bookings`, bookingPayload);

      alert('Booking created successfully! Awaiting approval and payment receipt upload.');
      navigate(`/upload-receipt/${response.data.id}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(error.response?.data?.error || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectedAgentData = agents.find(a => a.id === parseInt(selectedAgent));

  return (
    <div className="agent-booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <h1>Agent Booking Portal</h1>
          <p className="subtitle">Book rooms on behalf of your clients</p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          {/* Agent Selection Section */}
          <div className="form-section agent-section">
            <h2>Agent Information</h2>
            <div className="form-group">
              <label htmlFor="agent-select">Select Agent *</label>
              <select
                id="agent-select"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                required
                aria-required="true"
                className="agent-select"
              >
                <option value="">-- Select Agent --</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} - {agent.company || 'Independent'} ({agent.email})
                  </option>
                ))}
              </select>
            </div>
            {selectedAgentData && (
              <div className="agent-info-display">
                <p><strong>Agent:</strong> {selectedAgentData.name}</p>
                <p><strong>Email:</strong> {selectedAgentData.email}</p>
                <p><strong>Phone:</strong> {selectedAgentData.phone}</p>
                {selectedAgentData.company && (
                  <p><strong>Company:</strong> {selectedAgentData.company}</p>
                )}
              </div>
            )}
          </div>

          {/* Guest Information Section */}
          <div className="form-section">
            <h2>Guest Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="agent-customer-name">Guest Full Name *</label>
                <input
                  type="text"
                  id="agent-customer-name"
                  name="customer_name"
                  value={bookingData.customer_name}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  placeholder="John Doe"
                />
              </div>
              <div className="form-group">
                <label htmlFor="agent-customer-email">Guest Email *</label>
                <input
                  type="email"
                  id="agent-customer-email"
                  name="customer_email"
                  value={bookingData.customer_email}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  placeholder="guest@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="agent-customer-phone">Guest Phone *</label>
                <input
                  type="tel"
                  id="agent-customer-phone"
                  name="customer_phone"
                  value={bookingData.customer_phone}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  placeholder="+60123456789"
                />
              </div>
            </div>
          </div>

          {/* Room & Date Selection */}
          <div className="form-section">
            <h2>Booking Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="agent-room-type">Room Type *</label>
                <select
                  id="agent-room-type"
                  name="room_type"
                  value={bookingData.room_type}
                  onChange={handleChange}
                  required
                  aria-required="true"
                >
                  <option value="">-- Select Room Type --</option>
                  {roomTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="agent-guests">Number of Guests *</label>
                <input
                  type="number"
                  id="agent-guests"
                  name="guests"
                  value={bookingData.guests}
                  onChange={handleChange}
                  min="1"
                  max="10"
                  required
                  aria-required="true"
                />
              </div>
              <div className="form-group">
                <label htmlFor="agent-check-in">Check-in Date *</label>
                <input
                  type="date"
                  id="agent-check-in"
                  name="check_in"
                  value={bookingData.check_in}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  aria-required="true"
                />
              </div>
              <div className="form-group">
                <label htmlFor="agent-check-out">Check-out Date *</label>
                <input
                  type="date"
                  id="agent-check-out"
                  name="check_out"
                  value={bookingData.check_out}
                  onChange={handleChange}
                  min={bookingData.check_in || new Date().toISOString().split('T')[0]}
                  required
                  aria-required="true"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || !selectedAgent}
            >
              {loading ? 'Processing...' : 'Create Booking'}
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
          </div>

          <div className="booking-note">
            <strong>Note:</strong> After creating the booking, you will be redirected to upload the payment receipt.
            The booking will be pending approval until the receipt is verified by hotel staff.
          </div>
        </form>
      </div>
    </div>
  );
}

export default AgentBookingPage;
