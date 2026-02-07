import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EmployeeDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubMenu, setActiveSubMenu] = useState('');
  const [stats, setStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [roomStatus, setRoomStatus] = useState([]);
  const [agents, setAgents] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomHistory, setRoomHistory] = useState({ bookings: [], maintenance: [] });
  const [notifications, setNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [historyFilter, setHistoryFilter] = useState({ date: '', room_id: '' });

  // Room assignment modal state
  const [roomAssignModal, setRoomAssignModal] = useState({
    show: false,
    booking: null,
    availableRooms: [],
    selectedRoomId: null,
    loading: false
  });

  // Form states
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: '',
    price_per_night: '',
    capacity: '',
    description: '',
    image_url: '',
    amenities: '',
    maintenance_status: 'operational'
  });
  const [editingRoom, setEditingRoom] = useState(null);

  const [maintenanceForm, setMaintenanceForm] = useState({
    room_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const [showAgentForm, setShowAgentForm] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    } else if (activeTab === 'rooms' && activeSubMenu === 'status') {
      fetchRoomStatus();
    } else if (activeTab === 'rooms' && activeSubMenu === 'maintenance') {
      fetchRooms();
      fetchMaintenanceRecords();
    } else if (activeTab === 'agents' && activeSubMenu === 'list') {
      fetchAgents();
    } else if (activeTab === 'agents' && activeSubMenu === 'maintenance') {
      fetchAgents();
    } else if (activeTab === 'history') {
      fetchRoomHistory();
    } else if (activeTab === 'dashboard') {
      fetchStats();
    }
  }, [activeTab, activeSubMenu]);

  const fetchData = async () => {
    await fetchStats();
    await fetchNotifications();
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchRoomStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/room-status`);
      setRoomStatus(response.data);
    } catch (error) {
      console.error('Error fetching room status:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_URL}/agents`);
      setAgents(response.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchMaintenanceRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/room-maintenance`);
      setMaintenanceRecords(response.data);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    }
  };

  const fetchRoomHistory = async () => {
    try {
      const params = {};
      if (historyFilter.date) params.date = historyFilter.date;
      if (historyFilter.room_id) params.room_id = historyFilter.room_id;

      const response = await axios.get(`${API_URL}/room-history`, { params });
      setRoomHistory(response.data);
    } catch (error) {
      console.error('Error fetching room history:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/unread`);
      setNotifications(response.data.count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (bookingId) => {
    try {
      await axios.put(`${API_URL}/bookings/${bookingId}`, {
        read_by_employee: true
      });
      fetchBookings();
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API_URL}/bookings/${bookingId}`, { status });
      fetchBookings();
      fetchStats();
      alert(`Booking ${status === 'confirmed' ? 'approved' : status}! Confirmation email sent to customer.`);
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  // Open room assignment modal when approving a booking
  const openRoomAssignModal = async (booking) => {
    setRoomAssignModal({
      show: true,
      booking: booking,
      availableRooms: [],
      selectedRoomId: booking.room_id,
      loading: true
    });

    try {
      const response = await axios.get(`${API_URL}/bookings/${booking.id}/available-rooms`);
      setRoomAssignModal(prev => ({
        ...prev,
        availableRooms: response.data,
        loading: false
      }));
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      setRoomAssignModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Approve booking with selected room
  const approveWithRoom = async () => {
    const { booking, selectedRoomId } = roomAssignModal;
    try {
      await axios.put(`${API_URL}/bookings/${booking.id}`, {
        status: 'confirmed',
        room_id: selectedRoomId
      });
      fetchBookings();
      fetchStats();
      setRoomAssignModal({ show: false, booking: null, availableRooms: [], selectedRoomId: null, loading: false });
      alert('Booking approved! Confirmation email sent to customer.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve booking');
    }
  };

  const closeRoomAssignModal = () => {
    setRoomAssignModal({ show: false, booking: null, availableRooms: [], selectedRoomId: null, loading: false });
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await axios.put(`${API_URL}/rooms/${editingRoom.id}`, roomForm);
        alert('Room updated successfully!');
      } else {
        await axios.post(`${API_URL}/rooms`, roomForm);
        alert('Room added successfully!');
      }
      resetRoomForm();
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save room');
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm(room);
  };

  const resetRoomForm = () => {
    setEditingRoom(null);
    setRoomForm({
      room_number: '',
      room_type: '',
      price_per_night: '',
      capacity: '',
      description: '',
      image_url: '',
      amenities: '',
      maintenance_status: 'operational'
    });
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/room-maintenance`, maintenanceForm);
      alert('Maintenance record created!');
      setMaintenanceForm({ room_id: '', start_date: '', end_date: '', reason: '' });
      fetchMaintenanceRecords();
      fetchRooms();
    } catch (error) {
      alert('Failed to create maintenance record');
    }
  };

  const completeMaintenanceRecord = async (maintenanceId) => {
    try {
      await axios.put(`${API_URL}/room-maintenance/${maintenanceId}`, {
        end_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      });
      alert('Maintenance completed!');
      fetchMaintenanceRecords();
      fetchRooms();
    } catch (error) {
      alert('Failed to complete maintenance');
    }
  };

  const updateAgentStatus = async (agentId, status) => {
    try {
      await axios.put(`${API_URL}/agents/${agentId}`, { status });
      alert(`Agent ${status}!`);
      fetchAgents();
    } catch (error) {
      alert('Failed to update agent status');
    }
  };

  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/agents`, agentForm);
      alert('Agent added successfully! Awaiting approval.');
      setShowAgentForm(false);
      setAgentForm({ name: '', email: '', phone: '', company: '' });
      fetchAgents();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add agent');
    }
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const handleTabClick = (tab, submenu = '') => {
    setActiveTab(tab);
    setActiveSubMenu(submenu);
  };

  if (loading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  return (
    <div className="employee-portal">
      <div className="portal-header">
        <h1>Employee Portal</h1>
        <div className="notification-badge">
          {notifications > 0 && (
            <span className="badge">{notifications} new booking{notifications !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleTabClick('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => handleTabClick('bookings')}
        >
          Bookings
        </button>

        <div className="dropdown-tab">
          <button className={`tab ${activeTab === 'rooms' ? 'active' : ''}`}>
            Rooms ▼
          </button>
          <div className="dropdown-content">
            <button onClick={() => handleTabClick('rooms', 'status')}>Room Status</button>
            <button onClick={() => handleTabClick('rooms', 'maintenance')}>Room Maintenance</button>
          </div>
        </div>

        <div className="dropdown-tab">
          <button className={`tab ${activeTab === 'agents' ? 'active' : ''}`}>
            Agents ▼
          </button>
          <div className="dropdown-content">
            <button onClick={() => handleTabClick('agents', 'list')}>Agent List</button>
            <button onClick={() => handleTabClick('agents', 'maintenance')}>Agent Maintenance</button>
          </div>
        </div>

        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabClick('history')}
        >
          Room History
        </button>
      </div>

      <div className="tab-content">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-stats">
            <h2>Dashboard Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div className="stat-info">
                  <h3>Total Bookings</h3>
                  <p className="stat-value">{stats.total_bookings || 0}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="stat-info">
                  <h3>Pending Bookings</h3>
                  <p className="stat-value">{stats.pending_bookings || 0}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-info">
                  <h3>Confirmed Bookings</h3>
                  <p className="stat-value">{stats.confirmed_bookings || 0}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-info">
                  <h3>Total Revenue</h3>
                  <p className="stat-value">RM{stats.total_revenue || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div>
            <h2>Bookings Management</h2>
            <div className="booking-filters">
              <button
                className={`filter-btn ${!activeSubMenu || activeSubMenu === 'all' ? 'active' : ''}`}
                onClick={() => setActiveSubMenu('all')}
              >
                All Bookings ({bookings.length})
              </button>
              <button
                className={`filter-btn ${activeSubMenu === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveSubMenu('pending')}
              >
                Pending Approval ({bookings.filter(b => b.status === 'pending').length})
              </button>
              <button
                className={`filter-btn ${activeSubMenu === 'confirmed' ? 'active' : ''}`}
                onClick={() => setActiveSubMenu('confirmed')}
              >
                Confirmed ({bookings.filter(b => b.status === 'confirmed').length})
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Room</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Total</th>
                    <th>Type</th>
                    <th>Receipt</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings
                    .filter(booking => {
                      if (!activeSubMenu || activeSubMenu === 'all') return true;
                      return booking.status === activeSubMenu;
                    })
                    .map(booking => (
                    <tr key={booking.id} className={!booking.read_by_employee ? 'unread' : ''}>
                      <td>#{booking.id}</td>
                      <td>
                        {booking.customer_name}
                        {!booking.read_by_employee && <span className="new-badge">NEW</span>}
                        {booking.agent_name && (
                          <div style={{ fontSize: '0.85em', color: '#666', marginTop: '0.25rem' }}>
                            via {booking.agent_name}
                          </div>
                        )}
                      </td>
                      <td>
                        {booking.customer_email}<br />
                        {booking.customer_phone}
                      </td>
                      <td>{booking.room_type} - {booking.room_number}</td>
                      <td>{new Date(booking.check_in).toLocaleDateString('en-GB')}</td>
                      <td>{new Date(booking.check_out).toLocaleDateString('en-GB')}</td>
                      <td>RM{booking.total_price}</td>
                      <td>
                        <span className={`type-badge ${booking.booking_type === 'Agent' ? 'agent' : 'guest'}`}>
                          {booking.booking_type}
                        </span>
                      </td>
                      <td>
                        {booking.receipt_url ? (
                          <button
                            className="btn-small btn-info"
                            onClick={() => openImageModal(`http://localhost:5000/${booking.receipt_url}`)}
                          >
                            View Receipt
                          </button>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.875rem' }}>No receipt</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${booking.status}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {!booking.read_by_employee && (
                            <button
                              className="btn-small btn-info"
                              onClick={() => markAsRead(booking.id)}
                            >
                              Mark Read
                            </button>
                          )}
                          {booking.status === 'pending' && (
                            <>
                              <button
                                className="btn-small btn-success"
                                onClick={() => openRoomAssignModal(booking)}
                                title={!booking.receipt_url ? 'Approve without receipt verification' : 'Approve booking and send confirmation email'}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-small btn-danger"
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROOM STATUS TAB */}
        {activeTab === 'rooms' && activeSubMenu === 'status' && (
          <div>
            <h2>Room Status</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Price/Night</th>
                    <th>Status</th>
                    <th>Current Guest/Agent</th>
                    <th>Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {roomStatus.map(rs => (
                    <tr key={rs.room.id}>
                      <td>
                        <img
                          src={rs.room.image_url}
                          alt={rs.room.room_type}
                          className="room-thumbnail"
                          onClick={() => openImageModal(rs.room.image_url)}
                        />
                      </td>
                      <td>{rs.room.room_number}</td>
                      <td>{rs.room.room_type}</td>
                      <td>{rs.room.capacity} guests</td>
                      <td>RM{rs.room.price_per_night}</td>
                      <td>
                        <span className={`status-badge ${
                          rs.status === 'occupied' ? 'status-occupied' :
                          rs.status === 'maintenance' ? 'status-maintenance' :
                          'status-available'
                        }`}>
                          {rs.status}
                        </span>
                      </td>
                      <td>
                        {rs.current_booking ? (
                          <div>
                            {rs.current_booking.customer_name}
                            <br />
                            <span className={`type-badge ${rs.current_booking.booking_type === 'Agent' ? 'agent' : 'guest'}`}>
                              {rs.current_booking.booking_type}
                            </span>
                            {rs.current_booking.agent_name && (
                              <span style={{ fontSize: '0.85em', color: '#666' }}>
                                <br />via {rs.current_booking.agent_name}
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {rs.current_booking ?
                          new Date(rs.current_booking.check_out).toLocaleDateString('en-GB') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROOM MAINTENANCE TAB */}
        {activeTab === 'rooms' && activeSubMenu === 'maintenance' && (
          <div>
            <h2>Room Maintenance</h2>
            <div className="maintenance-section">
              <h3>Add Maintenance Record</h3>
              <form onSubmit={handleMaintenanceSubmit} className="maintenance-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="maint-room">Room *</label>
                    <select
                      id="maint-room"
                      value={maintenanceForm.room_id}
                      onChange={(e) => setMaintenanceForm({...maintenanceForm, room_id: e.target.value})}
                      required
                      aria-required="true"
                    >
                      <option value="">Select Room</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          Room {room.room_number} - {room.room_type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="maint-start-date">Start Date *</label>
                    <input
                      type="date"
                      id="maint-start-date"
                      value={maintenanceForm.start_date}
                      onChange={(e) => setMaintenanceForm({...maintenanceForm, start_date: e.target.value})}
                      required
                      aria-required="true"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="maint-end-date">End Date (Optional)</label>
                    <input
                      type="date"
                      id="maint-end-date"
                      value={maintenanceForm.end_date}
                      onChange={(e) => setMaintenanceForm({...maintenanceForm, end_date: e.target.value})}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="maint-reason">Reason</label>
                    <textarea
                      id="maint-reason"
                      value={maintenanceForm.reason}
                      onChange={(e) => setMaintenanceForm({...maintenanceForm, reason: e.target.value})}
                      rows="2"
                      placeholder="Describe the maintenance work..."
                    />
                  </div>
                </div>
                <button type="submit" className="btn-submit">Add Maintenance Record</button>
              </form>
            </div>

            <h3 style={{ marginTop: '2rem' }}>Active & Recent Maintenance</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.map(record => (
                    <tr key={record.id}>
                      <td>{record.room_number}</td>
                      <td>{record.room_type}</td>
                      <td>{new Date(record.start_date).toLocaleDateString('en-GB')}</td>
                      <td>{record.end_date ? new Date(record.end_date).toLocaleDateString('en-GB') : 'Ongoing'}</td>
                      <td>{record.days_closed} days</td>
                      <td>{record.reason || '-'}</td>
                      <td>
                        <span className={`status-badge status-${record.status === 'completed' ? 'confirmed' : 'pending'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>
                        {record.status === 'ongoing' && (
                          <button
                            className="btn-small btn-success"
                            onClick={() => completeMaintenanceRecord(record.id)}
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* AGENT LIST TAB */}
        {activeTab === 'agents' && activeSubMenu === 'list' && (
          <div>
            <h2>Agent List</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(agent => (
                    <tr key={agent.id}>
                      <td>#{agent.id}</td>
                      <td>{agent.name}</td>
                      <td>{agent.email}</td>
                      <td>{agent.phone}</td>
                      <td>{agent.company || '-'}</td>
                      <td>
                        <span className={`status-badge status-${agent.status === 'approved' ? 'confirmed' : agent.status === 'suspended' ? 'cancelled' : 'pending'}`}>
                          {agent.status}
                        </span>
                      </td>
                      <td>{new Date(agent.created_at).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AGENT MAINTENANCE TAB */}
        {activeTab === 'agents' && activeSubMenu === 'maintenance' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Agent Maintenance</h2>
              <button
                className={showAgentForm ? "btn-small btn-danger" : "btn-small btn-success"}
                onClick={() => setShowAgentForm(!showAgentForm)}
                style={{ padding: '0.6rem 1.2rem', fontSize: '1rem' }}
              >
                {showAgentForm ? 'Cancel' : '+ Add New Agent'}
              </button>
            </div>

            {showAgentForm && (
              <div className="maintenance-section" style={{ marginBottom: '2rem' }}>
                <h3>Add New Agent</h3>
                <form onSubmit={handleAgentSubmit} className="maintenance-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="new-agent-name">Name *</label>
                      <input
                        type="text"
                        id="new-agent-name"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                        required
                        aria-required="true"
                        placeholder="Agent full name"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="new-agent-email">Email *</label>
                      <input
                        type="email"
                        id="new-agent-email"
                        value={agentForm.email}
                        onChange={(e) => setAgentForm({...agentForm, email: e.target.value})}
                        required
                        aria-required="true"
                        placeholder="agent@example.com"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="new-agent-phone">Phone *</label>
                      <input
                        type="tel"
                        id="new-agent-phone"
                        value={agentForm.phone}
                        onChange={(e) => setAgentForm({...agentForm, phone: e.target.value})}
                        required
                        aria-required="true"
                        placeholder="+60123456789"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="new-agent-company">Company</label>
                      <input
                        type="text"
                        id="new-agent-company"
                        value={agentForm.company}
                        onChange={(e) => setAgentForm({...agentForm, company: e.target.value})}
                        placeholder="Company name (optional)"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-submit">Add Agent</button>
                </form>
              </div>
            )}

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(agent => (
                    <tr key={agent.id}>
                      <td>#{agent.id}</td>
                      <td>{agent.name}</td>
                      <td>{agent.email}</td>
                      <td>{agent.phone}</td>
                      <td>{agent.company || '-'}</td>
                      <td>
                        <span className={`status-badge status-${agent.status === 'approved' ? 'confirmed' : agent.status === 'suspended' ? 'cancelled' : 'pending'}`}>
                          {agent.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {agent.status === 'pending' && (
                            <button
                              className="btn-small btn-success"
                              onClick={() => updateAgentStatus(agent.id, 'approved')}
                            >
                              Approve
                            </button>
                          )}
                          {agent.status === 'approved' && (
                            <button
                              className="btn-small btn-danger"
                              onClick={() => updateAgentStatus(agent.id, 'suspended')}
                            >
                              Suspend
                            </button>
                          )}
                          {agent.status === 'suspended' && (
                            <button
                              className="btn-small btn-success"
                              onClick={() => updateAgentStatus(agent.id, 'approved')}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROOM HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            <h2>Room History</h2>
            <div className="filter-section">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="history-filter-date">Filter by Date</label>
                  <input
                    type="date"
                    id="history-filter-date"
                    value={historyFilter.date}
                    onChange={(e) => setHistoryFilter({...historyFilter, date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="history-filter-room">Filter by Room</label>
                  <select
                    id="history-filter-room"
                    value={historyFilter.room_id}
                    onChange={(e) => setHistoryFilter({...historyFilter, room_id: e.target.value})}
                  >
                    <option value="">All Rooms</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.room_number} - {room.room_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <button className="btn-submit" onClick={fetchRoomHistory}>Apply Filter</button>
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setHistoryFilter({ date: '', room_id: '' });
                      setTimeout(fetchRoomHistory, 100);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <h3>Booking History</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Days</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roomHistory.bookings.map(booking => {
                    const days = Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={booking.id}>
                        <td>{booking.room_number}</td>
                        <td>{booking.customer_name}</td>
                        <td>
                          <span className={`type-badge ${booking.booking_type === 'Agent' ? 'agent' : 'guest'}`}>
                            {booking.booking_type}
                          </span>
                        </td>
                        <td>{new Date(booking.check_in).toLocaleDateString('en-GB')}</td>
                        <td>{new Date(booking.check_out).toLocaleDateString('en-GB')}</td>
                        <td>{days} days</td>
                        <td>RM{booking.total_price}</td>
                        <td>
                          <span className={`status-badge status-${booking.status}`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3>Maintenance History</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days Closed</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roomHistory.maintenance.map(record => (
                    <tr key={record.id}>
                      <td>{record.room_number}</td>
                      <td>{new Date(record.start_date).toLocaleDateString('en-GB')}</td>
                      <td>{record.end_date ? new Date(record.end_date).toLocaleDateString('en-GB') : 'Ongoing'}</td>
                      <td>{record.days_closed} days</td>
                      <td>{record.reason || '-'}</td>
                      <td>
                        <span className={`status-badge status-${record.status === 'completed' ? 'confirmed' : 'pending'}`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Room Assignment Modal */}
      {roomAssignModal.show && (
        <div
          className="image-modal"
          onClick={closeRoomAssignModal}
          onKeyDown={(e) => e.key === 'Escape' && closeRoomAssignModal()}
          role="dialog"
          aria-modal="true"
          aria-label="Assign room to booking"
        >
          <div className="room-assign-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="image-modal-close"
              onClick={closeRoomAssignModal}
              aria-label="Close room assignment"
              autoFocus
            >
              &times;
            </button>
            <h2>Assign Room</h2>
            {roomAssignModal.booking && (
              <div className="booking-summary">
                <p><strong>Guest:</strong> {roomAssignModal.booking.customer_name}</p>
                <p><strong>Room Type:</strong> {roomAssignModal.booking.room_type}</p>
                <p><strong>Check-in:</strong> {new Date(roomAssignModal.booking.check_in).toLocaleDateString('en-GB')}</p>
                <p><strong>Check-out:</strong> {new Date(roomAssignModal.booking.check_out).toLocaleDateString('en-GB')}</p>
                <p><strong>Currently Assigned:</strong> Room {roomAssignModal.booking.room_number}</p>
              </div>
            )}
            <div className="room-selection">
              <label><strong>Select Room to Assign:</strong></label>
              {roomAssignModal.loading ? (
                <p>Loading available rooms...</p>
              ) : roomAssignModal.availableRooms.length === 0 ? (
                <p>No rooms available for these dates.</p>
              ) : (
                <div className="room-options">
                  {roomAssignModal.availableRooms.map(room => (
                    <label key={room.id} className={`room-option ${roomAssignModal.selectedRoomId === room.id ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="room_selection"
                        value={room.id}
                        checked={roomAssignModal.selectedRoomId === room.id}
                        onChange={() => setRoomAssignModal(prev => ({ ...prev, selectedRoomId: room.id }))}
                      />
                      <span className="room-info">
                        <strong>Room {room.room_number}</strong>
                        {room.is_current && <span className="current-badge">(Currently Assigned)</span>}
                        <br />
                        <small>{room.amenities}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={closeRoomAssignModal}>Cancel</button>
              <button
                className="btn-submit"
                onClick={approveWithRoom}
                disabled={!roomAssignModal.selectedRoomId || roomAssignModal.loading}
              >
                Confirm & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="image-modal"
          onClick={closeImageModal}
          onKeyDown={(e) => e.key === 'Escape' && closeImageModal()}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
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
            <img src={selectedImage} alt="Room or receipt preview" />
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDashboard;
