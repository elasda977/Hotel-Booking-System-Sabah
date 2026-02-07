import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RoomListPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function RoomListPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
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

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      setRooms(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/rooms`, roomForm);
      alert('Room added successfully!');
      setShowAddForm(false);
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
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add room');
    }
  };

  const handleEditRoom = (roomId) => {
    navigate(`/employee/rooms/edit/${roomId}`);
  };

  if (loading) {
    return (
      <div className="room-list-page">
        <div className="container">
          <p className="loading">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-list-page">
      <div className="page-header">
        <div>
          <h1>Master Room List</h1>
          <p className="subtitle">Manage all hotel rooms</p>
        </div>
        <button
          className={showAddForm ? "btn-add-room btn-cancel" : "btn-add-room"}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add New Room'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-room-section">
          <h2>Add New Room</h2>
          <form onSubmit={handleAddRoom} className="room-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Room Number *</label>
                <input
                  type="text"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm({...roomForm, room_number: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Room Type *</label>
                <input
                  type="text"
                  value={roomForm.room_type}
                  onChange={(e) => setRoomForm({...roomForm, room_type: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Price per Night (RM) *</label>
                <input
                  type="number"
                  value={roomForm.price_per_night}
                  onChange={(e) => setRoomForm({...roomForm, price_per_night: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Capacity *</label>
                <input
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({...roomForm, capacity: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Maintenance Status</label>
                <select
                  value={roomForm.maintenance_status}
                  onChange={(e) => setRoomForm({...roomForm, maintenance_status: e.target.value})}
                >
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({...roomForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group full-width">
                <label>Image URL</label>
                <input
                  type="text"
                  value={roomForm.image_url}
                  onChange={(e) => setRoomForm({...roomForm, image_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="form-group full-width">
                <label>Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={roomForm.amenities}
                  onChange={(e) => setRoomForm({...roomForm, amenities: e.target.value})}
                  placeholder="Free WiFi, Air Conditioning, TV"
                />
              </div>
            </div>
            <button type="submit" className="btn-submit">Add Room</button>
          </form>
        </div>
      )}

      <div className="rooms-list">
        <table className="rooms-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Room Number</th>
              <th>Room Type</th>
              <th>Capacity</th>
              <th>Price/Night</th>
              <th>Status</th>
              <th>Amenities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id}>
                <td>
                  <img src={room.image_url} alt={room.room_type} className="room-thumbnail" />
                </td>
                <td className="room-number-cell">{room.room_number}</td>
                <td>{room.room_type}</td>
                <td>{room.capacity} guests</td>
                <td>RM{room.price_per_night}</td>
                <td>
                  <span className={`status-badge status-${
                    room.maintenance_status === 'operational' ? 'available' :
                    room.maintenance_status === 'maintenance' ? 'maintenance' : 'occupied'
                  }`}>
                    {room.maintenance_status}
                  </span>
                </td>
                <td className="amenities-cell">
                  {room.amenities ? room.amenities.split(',').slice(0, 2).join(', ') : '-'}
                  {room.amenities && room.amenities.split(',').length > 2 && '...'}
                </td>
                <td>
                  <button
                    className="btn-edit"
                    onClick={() => handleEditRoom(room.id)}
                  >
                    Edit Room & Maintenance
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rooms.length === 0 && (
        <div className="no-rooms">
          <p>No rooms found. Add your first room to get started!</p>
        </div>
      )}
    </div>
  );
}

export default RoomListPage;
