import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './EditRoomPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function EditRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);

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

  const [categories, setCategories] = useState([]);

  const [maintenanceForm, setMaintenanceForm] = useState({
    room_id: roomId,
    start_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchRoom();
    fetchMaintenanceRecords();
    fetchCategories();
  }, [roomId]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchRoom = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      const foundRoom = response.data.find(r => r.id === parseInt(roomId));
      if (foundRoom) {
        setRoom(foundRoom);
        setRoomForm(foundRoom);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching room:', error);
      setLoading(false);
    }
  };

  const fetchMaintenanceRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/room-maintenance`);
      const roomRecords = response.data.filter(r => r.room_id === parseInt(roomId));
      setMaintenanceRecords(roomRecords);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    }
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/rooms/${roomId}`, roomForm);
      alert('Room updated successfully!');
      fetchRoom();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update room');
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/room-maintenance`, maintenanceForm);
      alert('Maintenance record created!');
      setMaintenanceForm({
        room_id: roomId,
        start_date: '',
        reason: ''
      });
      fetchMaintenanceRecords();
      fetchRoom(); // Refresh room status
    } catch (error) {
      alert('Failed to create maintenance record');
    }
  };

  const completeMaintenance = async (maintenanceId) => {
    try {
      await axios.put(`${API_URL}/room-maintenance/${maintenanceId}`, {
        end_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      });
      alert('Maintenance completed!');
      fetchMaintenanceRecords();
      fetchRoom();
    } catch (error) {
      alert('Failed to complete maintenance');
    }
  };

  if (loading) {
    return (
      <div className="edit-room-page">
        <div className="container">
          <p className="loading">Loading room details...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="edit-room-page">
        <div className="container">
          <p className="error">Room not found</p>
          <button className="btn-back" onClick={() => navigate('/employee/rooms')}>
            Back to Room List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-room-page">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={() => navigate('/employee/rooms')}>
            <span aria-hidden="true">←</span> Back to Room List
          </button>
          <h1>Edit Room {room.room_number}</h1>
          <p className="subtitle">{room.room_type}</p>
        </div>
      </div>

      {/* Room Details Section */}
      <div className="section">
        <h2>Room Details</h2>
        <form onSubmit={handleUpdateRoom} className="room-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="edit-room-number">Room Number *</label>
              <input
                type="text"
                id="edit-room-number"
                value={roomForm.room_number}
                onChange={(e) => setRoomForm({...roomForm, room_number: e.target.value})}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-room-type">Room Type *</label>
              <select
                id="edit-room-type"
                value={roomForm.room_type}
                onChange={(e) => {
                  const cat = categories.find(c => c.name === e.target.value);
                  setRoomForm({...roomForm, room_type: e.target.value, category_id: cat ? cat.id : roomForm.category_id});
                }}
                required
                aria-required="true"
              >
                <option value="">Select Room Type</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="edit-price">Price per Night (RM) *</label>
              <input
                type="number"
                id="edit-price"
                value={roomForm.price_per_night}
                onChange={(e) => setRoomForm({...roomForm, price_per_night: e.target.value})}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-capacity">Capacity *</label>
              <input
                type="number"
                id="edit-capacity"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({...roomForm, capacity: e.target.value})}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-maintenance-status">Maintenance Status</label>
              <select
                id="edit-maintenance-status"
                value={roomForm.maintenance_status}
                onChange={(e) => setRoomForm({...roomForm, maintenance_status: e.target.value})}
              >
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label htmlFor="edit-description">Description</label>
              <textarea
                id="edit-description"
                value={roomForm.description}
                onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
                rows="3"
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="edit-image-url">Image URL</label>
              <input
                type="text"
                id="edit-image-url"
                value={roomForm.image_url}
                onChange={(e) => setRoomForm({...roomForm, image_url: e.target.value})}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="edit-amenities">Amenities (comma-separated)</label>
              <input
                type="text"
                id="edit-amenities"
                value={roomForm.amenities}
                onChange={(e) => setRoomForm({...roomForm, amenities: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="btn-submit">Update Room</button>
        </form>
      </div>

      {/* Add Maintenance Record Section */}
      <div className="section">
        <h2>Add Maintenance Record</h2>
        <form onSubmit={handleAddMaintenance} className="maintenance-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="maintenance-start-date">Start Date *</label>
              <input
                type="date"
                id="maintenance-start-date"
                value={maintenanceForm.start_date}
                onChange={(e) => setMaintenanceForm({...maintenanceForm, start_date: e.target.value})}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="maintenance-reason">Reason</label>
              <textarea
                id="maintenance-reason"
                value={maintenanceForm.reason}
                onChange={(e) => setMaintenanceForm({...maintenanceForm, reason: e.target.value})}
                rows="2"
                placeholder="Describe the maintenance issue or work needed..."
              />
            </div>
          </div>
          <button type="submit" className="btn-submit">Add Maintenance Record</button>
        </form>
      </div>

      {/* Maintenance History Section */}
      <div className="section">
        <h2>Maintenance History</h2>
        {maintenanceRecords.length === 0 ? (
          <p className="no-records">No maintenance records found for this room.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days Closed</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRecords.map(record => (
                  <tr key={record.id}>
                    <td>{new Date(record.start_date).toLocaleDateString('en-GB')}</td>
                    <td>{record.end_date ? new Date(record.end_date).toLocaleDateString('en-GB') : '-'}</td>
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
                          onClick={() => completeMaintenance(record.id)}
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
        )}
      </div>
    </div>
  );
}

export default EditRoomPage;
