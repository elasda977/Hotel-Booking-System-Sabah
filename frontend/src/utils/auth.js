import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const getToken = () => localStorage.getItem('token');
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => !!getToken();
export const isAdmin = () => {
  const user = getUser();
  return user && user.role === 'admin';
};
export const isEmployee = () => {
  const user = getUser();
  return user && (user.role === 'admin' || user.role === 'employee');
};
export const isCustomer = () => {
  const user = getUser();
  return user && user.role === 'customer';
};
export const isAgent = () => {
  const user = getUser();
  return user && user.role === 'agent';
};

// Axios instance with auth interceptor
const authAxios = axios.create({ baseURL: API_URL });

authAxios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default authAxios;
