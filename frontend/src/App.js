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
import RegisterPage from './pages/RegisterPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast/ToastContext';
import { isAuthenticated, clearAuth, getUser, isEmployee, isCustomer, isAgent } from './utils/auth';
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
    <nav className="navbar" aria-label="Main navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo" aria-label="Hotel Booking System - Home">Hotel Booking System</Link>
        <div className="nav-menu" role="menubar">
          <Link to="/" className="nav-link">Guest Booking</Link>
          <Link to="/agent-booking" className="nav-link">Agent Booking</Link>
          {authenticated ? (
            <>
              {isEmployee() && (
                <Link to="/employee" className="nav-link">Employee Portal</Link>
              )}
              {isCustomer() && (
                <Link to="/my-bookings" className="nav-link">My Bookings</Link>
              )}
              {isAgent() && (
                <Link to="/agent-dashboard" className="nav-link">Agent Dashboard</Link>
              )}
              <span className="nav-user">{user?.name} ({user?.role})</span>
              <button onClick={handleLogout} className="nav-link nav-logout" aria-label="Logout from account">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <ToastProvider>
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
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/my-bookings" element={<ProtectedRoute roles={['customer']}><MyBookingsPage /></ProtectedRoute>} />
          <Route path="/agent-dashboard" element={<ProtectedRoute roles={['agent']}><AgentDashboardPage /></ProtectedRoute>} />
          <Route path="/employee" element={<ProtectedRoute roles={['admin', 'employee']}><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/employee/rooms" element={<ProtectedRoute roles={['admin', 'employee']}><RoomListPage /></ProtectedRoute>} />
          <Route path="/employee/rooms/edit/:roomId" element={<ProtectedRoute roles={['admin', 'employee']}><EditRoomPage /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
    </ToastProvider>
  );
}

export default App;
