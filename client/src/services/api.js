// Client API Client with Auth Token Interception and Unified Error Handling

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export function getAuthToken() {
  return localStorage.getItem('railpass_token');
}

export function setAuthSession(token, user) {
  localStorage.setItem('railpass_token', token);
  localStorage.setItem('railpass_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('railpass_token');
  localStorage.removeItem('railpass_user');
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('railpass_user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // If 401 Unauthorized, automatically handle session expiry
      if (res.status === 401 && !endpoint.includes('/auth/login')) {
        clearAuthSession();
        window.dispatchEvent(new CustomEvent('auth-expired'));
      }
      const error = new Error(data.message || 'An unexpected error occurred. Please try again.');
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      const netErr = new Error('Unable to connect to the server. Please check your network or ensure backend is running.');
      netErr.status = 0;
      throw netErr;
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (name, email, password) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Trains
  getStations: () => request('/trains/stations'),
  searchTrains: (source, destination, journeyDate) => {
    const params = new URLSearchParams();
    if (source) params.append('source', source);
    if (destination) params.append('destination', destination);
    if (journeyDate) params.append('journeyDate', journeyDate);
    return request(`/trains/search?${params.toString()}`);
  },
  getAllTrains: () => request('/trains'),
  getTrainById: (id) => request(`/trains/${id}`),
  getTrainStatus: (id) => request(`/trains/${id}/status`),

  // Bookings
  createPaymentOrder: (bookingData, requestId) => request('/payments/orders', {
    method: 'POST',
    headers: { 'Idempotency-Key': requestId },
    body: JSON.stringify(bookingData)
  }),
  getPaymentConfig: () => request('/payments/config'),
  simulatePayment: (paymentId, action, paymentMethod) => request(`/payments/${paymentId}/simulate`, {
    method: 'POST',
    body: JSON.stringify({ action, ...(paymentMethod ? { paymentMethod } : {}) })
  }),
  getPaymentStatus: (id) => request(`/payments/${id}`),
  getMyBookings: () => request('/bookings'),
  getBookingById: (id) => request(`/bookings/${id}`),
  cancelBooking: (id) => request(`/bookings/${id}/cancel`, {
    method: 'POST'
  }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, {
    method: 'PATCH'
  }),
  markAllNotificationsRead: () => request('/notifications/read-all', {
    method: 'PATCH'
  }),
  deleteNotification: (id) => request(`/notifications/${id}`, {
    method: 'DELETE'
  }),

  // Admin APIs
  getAdminStats: () => request('/admin/stats'),
  getAdminTrains: () => request('/admin/trains'),
  createAdminTrain: (trainData) => request('/admin/trains', {
    method: 'POST',
    body: JSON.stringify(trainData)
  }),
  updateAdminTrain: (id, trainData) => request(`/admin/trains/${id}`, {
    method: 'PUT',
    body: JSON.stringify(trainData)
  }),
  updateTrainStatus: (id, statusData) => request(`/admin/trains/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(statusData)
  }),
  deleteAdminTrain: (id) => request(`/admin/trains/${id}`, {
    method: 'DELETE'
  }),
  getAdminBookings: () => request('/admin/bookings')
};
