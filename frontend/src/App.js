import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import ConfirmationPage from './pages/ConfirmationPage';
import UploadReceiptPage from './pages/UploadReceiptPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import RoomListPage from './pages/RoomListPage';
import EditRoomPage from './pages/EditRoomPage';
import AgentBookingPage from './pages/AgentBookingPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">Hotel Booking System</Link>
            <div className="nav-menu">
              <Link to="/" className="nav-link">Guest Booking</Link>
              <Link to="/agent-booking" className="nav-link">Agent Booking</Link>
              <Link to="/employee" className="nav-link">Employee Portal</Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/:roomId" element={<BookingPage />} />
          <Route path="/agent-booking" element={<AgentBookingPage />} />
          <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
          <Route path="/upload-receipt/:bookingId" element={<UploadReceiptPage />} />
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/employee/rooms" element={<RoomListPage />} />
          <Route path="/employee/rooms/edit/:roomId" element={<EditRoomPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
