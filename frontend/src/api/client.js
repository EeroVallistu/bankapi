import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export const auth = {
  login: (credentials) => client.post('/sessions', credentials),
  register: (userData) => client.post('/users', userData),
  getProfile: () => client.get('/users/me'),
  logout: (token) => client.delete(`/sessions/${token}`),
};

export const accounts = {
  list: () => client.get('/accounts'),
  create: (data) => client.post('/accounts', data),
  getDetails: (accountNumber) => client.get(`/accounts/${accountNumber}`),
};

export const transactions = {
  list: () => client.get('/transfers'),
  createInternal: (data) => client.post('/transfers/internal', data),
  createExternal: (data) => client.post('/transfers/external', data),
  getDetails: (id) => client.get(`/transfers/${id}`),
};

export default client;
