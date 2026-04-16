// all API calls go through here so we have one place to change the base URL or add auth headers later

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — unwrap data.data for convenience
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

// event types──
export const eventTypesApi = {
  getAll: () => api.get('/event-types'),
  create: (data) => api.post('/event-types', data),
  update: (id, data) => api.put(`/event-types/${id}`, data),
  delete: (id) => api.delete(`/event-types/${id}`),
};

// availability──
export const availabilityApi = {
  get: () => api.get('/availability'),
  set: (data) => api.post('/availability', data),
  deleteWindow: (id) => api.delete(`/availability/${id}`),
};

// public booking (no auth needed)──
export const bookingApi = {
  getEvent: (slug) => api.get(`/event/${slug}`),
  getSlots: (date, eventId) => api.get(`/slots?date=${date}&eventId=${eventId}`),
  book: (data) => api.post('/book', data),
};

// meetings (admin)─
export const meetingsApi = {
  getAll: (filter = 'all') => api.get(`/meetings?filter=${filter}`),
  cancel: (id) => api.patch(`/cancel/${id}`),
};

export default api;
