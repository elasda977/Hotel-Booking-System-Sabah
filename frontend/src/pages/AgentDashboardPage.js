import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authAxios from '../utils/auth';
import './AgentDashboardPage.css';

function AgentDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAgentBookings();
  }, []);

  const fetchAgentBookings = async () => {
    try {
      const response = await authAxios.get('/agent-bookings');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching agent bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container"><p>Loading dashboard...</p></div>;
  }

  if (!data) {
    return <div className="container"><p>Unable to load dashboard.</p></div>;
  }

  const filteredBookings = data.bookings.filter(b => {
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

  return (
    <div className="agent-dashboard-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Agent Dashboard</h1>
            <p className="agent-welcome">Welcome, {data.agent.name} - {data.agent.company || 'Independent Agent'}</p>
          </div>
          <Link to="/agent-booking" className="btn-new-booking">New Booking</Link>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{data.summary.total}</span>
            <span className="stat-label">Total Bookings</span>
          </div>
          <div className="stat-card stat-confirmed">
            <span className="stat-value">{data.summary.confirmed}</span>
            <span className="stat-label">Confirmed</span>
          </div>
          <div className="stat-card stat-pending">
            <span className="stat-value">{data.summary.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card stat-revenue">
            <span className="stat-value">RM{data.summary.revenue.toLocaleString()}</span>
            <span className="stat-label">Total Revenue</span>
          </div>
        </div>

        <div className="filter-bar">
          {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <h3>No bookings found</h3>
            <p>{filter === 'all' ? "You haven't made any bookings yet." : `No ${filter} bookings.`}</p>
          </div>
        ) : (
          <div className="bookings-table-container">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(booking => (
                  <tr key={booking.id}>
                    <td>#{booking.id}</td>
                    <td>
                      <div className="guest-info">
                        <span className="guest-name">{booking.customer_name}</span>
                        <span className="guest-email">{booking.customer_email}</span>
                      </div>
                    </td>
                    <td>{booking.room_type}<br /><small>Room {booking.room_number}</small></td>
                    <td>{new Date(booking.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td>{new Date(booking.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td className="amount">RM{booking.total_price}</td>
                    <td>
                      <span className={`booking-status ${getStatusClass(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td>
                      {booking.status === 'pending' && !booking.receipt_url && (
                        <Link to={`/upload-receipt/${booking.id}`} className="btn-action">
                          Upload Receipt
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentDashboardPage;
