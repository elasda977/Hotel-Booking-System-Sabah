import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/Toast/ToastContext';
import { getUser, isAgent, getToken } from '../utils/auth';
import './AgentBookingPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function AgentBookingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const currentUser = getUser();
  const loggedInAsAgent = isAgent();

  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(loggedInAsAgent ? String(currentUser.id) : '');
  const [loading, setLoading] = useState(false);

  const [bookingData, setBookingData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in: '',
    check_out: '',
    guests: 1
  });

  // Room selection modal state
  // roomSelections: { categoryName: { qty, check_in, check_out } }
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomSelections, setRoomSelections] = useState({});
  const [categoryAvailability, setCategoryAvailability] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState({});

  useEffect(() => {
    if (!loggedInAsAgent) {
      fetchAgents();
    }
    fetchCategoriesAndRooms();
  }, [loggedInAsAgent]);

  // Fetch availability for global dates (used as default)
  useEffect(() => {
    if (bookingData.check_in && bookingData.check_out && bookingData.check_in < bookingData.check_out) {
      fetchCategoryAvailabilityFor('__global__', bookingData.check_in, bookingData.check_out);
    }
  }, [bookingData.check_in, bookingData.check_out]);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_URL}/agents`);
      const approvedAgents = response.data.filter(agent => agent.status === 'approved');
      setAgents(approvedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchCategoriesAndRooms = async () => {
    try {
      const [catRes, roomRes] = await Promise.all([
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/rooms`)
      ]);
      setCategories(catRes.data);
      setRooms(roomRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchCategoryAvailabilityFor = async (key, checkIn, checkOut) => {
    setAvailabilityLoading(prev => ({ ...prev, [key]: true }));
    try {
      const response = await axios.get(`${API_URL}/rooms/category-availability`, {
        params: { check_in: checkIn, check_out: checkOut }
      });
      setCategoryAvailability(prev => ({ ...prev, [key]: response.data }));
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setAvailabilityLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Get the effective dates for a category (per-category override or global)
  const getCategoryDates = (categoryName) => {
    const sel = roomSelections[categoryName];
    if (sel && sel.check_in && sel.check_out) {
      return { check_in: sel.check_in, check_out: sel.check_out };
    }
    return { check_in: bookingData.check_in, check_out: bookingData.check_out };
  };

  // Get availability key for a category
  const getAvailKey = (categoryName) => {
    const sel = roomSelections[categoryName];
    if (sel && sel.check_in && sel.check_out) return categoryName;
    return '__global__';
  };

  // Count available rooms per category - uses date-filtered data
  const getAvailableCount = (categoryName) => {
    const key = getAvailKey(categoryName);
    const availData = categoryAvailability[key];
    if (availData) {
      const avail = availData.find(a => a.category === categoryName);
      if (avail) return avail.available_rooms;
    }
    return rooms.filter(r => r.room_type === categoryName && r.maintenance_status === 'operational').length;
  };

  // Get fully booked dates for a category
  const getFullyBookedDates = (categoryName) => {
    const key = getAvailKey(categoryName);
    const availData = categoryAvailability[key];
    if (availData) {
      const avail = availData.find(a => a.category === categoryName);
      return avail ? avail.fully_booked_dates || [] : [];
    }
    return [];
  };

  const handleRoomQuantityChange = (categoryName, quantity) => {
    const maxAvailable = getAvailableCount(categoryName);
    const val = Math.max(0, Math.min(parseInt(quantity) || 0, maxAvailable));
    setRoomSelections(prev => {
      const updated = { ...prev };
      if (val === 0) {
        delete updated[categoryName];
      } else {
        const existing = updated[categoryName] || {};
        updated[categoryName] = { ...existing, qty: val };
      }
      return updated;
    });
  };

  const handleRoomDateChange = (categoryName, field, value) => {
    setRoomSelections(prev => {
      const updated = { ...prev };
      const existing = updated[categoryName] || { qty: 0 };
      updated[categoryName] = { ...existing, [field]: value };
      return updated;
    });

    // After updating, fetch availability for this category's custom dates
    const sel = { ...roomSelections[categoryName], [field]: value };
    const checkIn = field === 'check_in' ? value : (sel.check_in || bookingData.check_in);
    const checkOut = field === 'check_out' ? value : (sel.check_out || bookingData.check_out);
    if (checkIn && checkOut && checkIn < checkOut) {
      fetchCategoryAvailabilityFor(categoryName, checkIn, checkOut);
    }
  };

  const totalRoomsSelected = Object.values(roomSelections).reduce((sum, sel) => sum + (sel.qty || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!loggedInAsAgent && !selectedAgent) {
      toast.warning('Please select an agent');
      return;
    }

    if (totalRoomsSelected === 0) {
      toast.warning('Please select at least one room');
      return;
    }

    setLoading(true);

    try {
      const agentId = loggedInAsAgent ? currentUser.id : parseInt(selectedAgent);

      const roomsPayload = Object.entries(roomSelections).map(([room_type, sel]) => ({
        room_type,
        quantity: sel.qty,
        check_in: sel.check_in || bookingData.check_in,
        check_out: sel.check_out || bookingData.check_out
      }));

      const headers = {};
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(`${API_URL}/bookings/multi`, {
        rooms: roomsPayload,
        customer_name: bookingData.customer_name,
        customer_email: bookingData.customer_email,
        customer_phone: bookingData.customer_phone,
        check_in: bookingData.check_in,
        check_out: bookingData.check_out,
        agent_id: agentId,
        guests: bookingData.guests
      }, { headers });

      const count = response.data.bookings.length;
      toast.info(`${count} booking${count > 1 ? 's' : ''} created successfully! Awaiting approval and payment receipt upload.`);
      navigate(`/upload-receipt/${response.data.first_booking_id}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.error || 'Failed to create booking. Please try again.');
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

  const selectedAgentData = loggedInAsAgent
    ? currentUser
    : agents.find(a => a.id === parseInt(selectedAgent));

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
            {loggedInAsAgent ? (
              <div className="agent-info-display">
                <p><strong>Agent:</strong> {currentUser.name}</p>
                <p><strong>Email:</strong> {currentUser.email}</p>
                {currentUser.company && (
                  <p><strong>Company:</strong> {currentUser.company}</p>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Person In Charge Details */}
          <div className="form-section">
            <h2>Person In Charge Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="agent-customer-name">PIC Full Name *</label>
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
                <label htmlFor="agent-customer-email">PIC Email *</label>
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
                <label htmlFor="agent-customer-phone">PIC Phone *</label>
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

          {/* Check-in / Check-out Dates */}
          <div className="form-section">
            <h2>Stay Dates</h2>
            <div className="form-grid">
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
            </div>
          </div>

          {/* Room Selection */}
          <div className="form-section">
            <h2>Room Selection</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Rooms *</label>
                <button
                  type="button"
                  className="btn-select-rooms"
                  onClick={() => setShowRoomModal(true)}
                >
                  {totalRoomsSelected > 0
                    ? `${totalRoomsSelected} room${totalRoomsSelected > 1 ? 's' : ''} selected`
                    : 'Select Rooms'}
                </button>
                {totalRoomsSelected > 0 && (
                  <div className="selected-rooms-summary">
                    {Object.entries(roomSelections).filter(([, sel]) => sel.qty > 0).map(([type, sel]) => (
                      <span key={type} className="room-selection-badge">
                        {type} x{sel.qty}
                        {(sel.check_in || sel.check_out) && (
                          <small style={{ display: 'block', fontSize: '0.75em', opacity: 0.8 }}>
                            {sel.check_in || bookingData.check_in} - {sel.check_out || bookingData.check_out}
                          </small>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || (!loggedInAsAgent && !selectedAgent) || totalRoomsSelected === 0}
            >
              {loading ? 'Processing...' : 'Create Booking'}
            </button>
          </div>

          <aside className="booking-note" role="note">
            <strong>Note:</strong> After creating the booking, you will be redirected to upload the payment receipt.
            The booking will be pending approval until the receipt is verified by hotel staff.
          </aside>
        </form>
      </div>

      {/* Room Selection Modal */}
      {showRoomModal && (
        <div className="room-modal-overlay" onClick={() => setShowRoomModal(false)} role="dialog" aria-modal="true" aria-label="Select rooms">
          <div className="room-modal" onClick={(e) => e.stopPropagation()}>
            <div className="room-modal-header">
              <h2>Select Rooms</h2>
              <button className="room-modal-close" onClick={() => setShowRoomModal(false)} aria-label="Close">&times;</button>
            </div>
            <div className="room-modal-body">
              {(!bookingData.check_in || !bookingData.check_out) && (
                <div className="availability-warning">
                  Please set check-in and check-out dates in the form before selecting rooms.
                </div>
              )}
              <div className="room-category-list">
                {categories.map(cat => {
                  const dates = getCategoryDates(cat.name);
                  const hasDates = dates.check_in && dates.check_out;
                  const available = getAvailableCount(cat.name);
                  const fullyBookedDates = getFullyBookedDates(cat.name);
                  const hasDateConflict = available === 0 && hasDates;
                  const sel = roomSelections[cat.name] || {};
                  const isLoadingAvail = availabilityLoading[getAvailKey(cat.name)];

                  return (
                    <div key={cat.id} className={`room-category-card ${hasDateConflict ? 'card-unavailable' : ''}`}>
                      <div className="room-category-header">
                        <div className="room-category-info">
                          <strong>{cat.name}</strong>
                          <span className="room-category-meta">RM{cat.base_price}/night &middot; {cat.capacity} pax</span>
                        </div>
                        <div className="room-category-avail">
                          <span className={`avail-badge ${available > 0 ? 'available' : 'none'}`}>
                            {hasDateConflict ? <s>0</s> : available} avail
                          </span>
                          {isLoadingAvail && <span className="avail-loading-dot">...</span>}
                        </div>
                      </div>
                      <div className="room-category-dates">
                        <div className="modal-date-field">
                          <label>Check-in</label>
                          <input
                            type="date"
                            value={sel.check_in || bookingData.check_in}
                            onChange={(e) => handleRoomDateChange(cat.name, 'check_in', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="modal-date-field">
                          <label>Check-out</label>
                          <input
                            type="date"
                            value={sel.check_out || bookingData.check_out}
                            onChange={(e) => handleRoomDateChange(cat.name, 'check_out', e.target.value)}
                            min={(sel.check_in || bookingData.check_in) || new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="modal-qty-field">
                          <label>Qty</label>
                          <input
                            type="number"
                            min="0"
                            max={available}
                            value={sel.qty || 0}
                            onChange={(e) => handleRoomQuantityChange(cat.name, e.target.value)}
                            className="qty-input"
                            disabled={available === 0}
                          />
                        </div>
                      </div>
                      {hasDateConflict && (
                        <div className="conflict-note">Fully booked for selected dates</div>
                      )}
                      {fullyBookedDates.length > 0 && available > 0 && (
                        <div className="partial-conflict-note">
                          {fullyBookedDates.length} date{fullyBookedDates.length > 1 ? 's' : ''} fully booked nearby
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="room-modal-footer">
              <span className="total-rooms-text">
                {totalRoomsSelected} room{totalRoomsSelected !== 1 ? 's' : ''} selected
              </span>
              <button
                className="btn-submit"
                onClick={() => setShowRoomModal(false)}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentBookingPage;
