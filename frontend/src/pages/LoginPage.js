import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Login functionality will be implemented later
    setError('Login functionality is not yet activated');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>Login</h1>
          <p className="subtitle">Enter your credentials to continue</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                type="email"
                id="login-email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter your email"
                required
                aria-required="true"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter your password"
                required
                aria-required="true"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-login">
              Login
            </button>
          </form>

          <div className="login-footer">
            <a href="/">Back to Home</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
