import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import ConfirmationPage from './pages/ConfirmationPage';
import UploadReceiptPage from './pages/UploadReceiptPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import RoomListPage from './pages/RoomListPage';
import EditRoomPage from './pages/EditRoomPage';
import AgentBookingPage from './pages/AgentBookingPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated, clearAuth, getUser } from './utils/auth';
import './App.css';

function NavBar() {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">Hotel Booking System</Link>
        <div className="nav-menu">
          <Link to="/" className="nav-link">Guest Booking</Link>
          <Link to="/agent-booking" className="nav-link">Agent Booking</Link>
          {authenticated ? (
            <>
              <Link to="/employee" className="nav-link">Employee Portal</Link>
              <span className="nav-user">{user?.name} ({user?.role})</span>
              <button onClick={handleLogout} className="nav-link nav-logout">Logout</button>
            </>
          ) : (
            <Link to="/login" className="nav-link">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <NavBar />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/:roomId" element={<BookingPage />} />
          <Route path="/agent-booking" element={<AgentBookingPage />} />
          <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
          <Route path="/upload-receipt/:bookingId" element={<UploadReceiptPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/employee" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/employee/rooms" element={<ProtectedRoute><RoomListPage /></ProtectedRoute>} />
          <Route path="/employee/rooms/edit/:roomId" element={<ProtectedRoute><EditRoomPage /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
