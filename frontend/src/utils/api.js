import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'
const ML_URL = import.meta.env.VITE_ML_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: API_URL })
export const ml = axios.create({ baseURL: ML_URL })

// Inject token on every backend request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('fb_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  loginWithGoogle: (data) => api.post('/auth/google', data),
}

// ── Listings ──────────────────────────────────────────────────────
export const listingsAPI = {
  nearby: (lat, lng, radius = 10) =>
    api.get('/listings/nearby', { params: { lat, lng, radius_km: radius } }),
  create: (data) => api.post('/listings', data),
  update: (id, data) => api.patch(`/listings/${id}`, data),
  delete: (id) => api.delete(`/listings/${id}`),
  get: (id) => api.get(`/listings/${id}`),
}

// ── Claims ────────────────────────────────────────────────────────
export const claimsAPI = {
  create: (listing_id) => api.post('/claims', { listing_id }),
  mine: () => api.get('/claims/mine'),
  pickup: (id) => api.patch(`/claims/${id}/pickup`),
}

// ── Donors ────────────────────────────────────────────────────────
export const donorsAPI = {
  me: () => api.get('/donors/me'),
  stats: () => api.get('/donors/stats'),
}

// ── Impact ────────────────────────────────────────────────────────
export const impactAPI = {
  stats: () => api.get('/impact/stats'),
}

// ── Leaderboard ───────────────────────────────────────────────────
export const leaderboardAPI = {
  get: (limit = 15) => api.get('/leaderboard', { params: { limit } }),
}

// ── Notifications ─────────────────────────────────────────────────
export const notificationsAPI = {
  sendEmail: (data) => api.post('/notifications/email', data),
}

// ── ML ────────────────────────────────────────────────────────────
export const mlAPI = {
  match: (lat, lng, preferred_categories = [], max_distance_km = 10, top_n = 20) =>
    ml.post('/ml/match', { lat, lng, preferred_categories, max_distance_km, top_n }),
  forecast: (lat, lng, hours_ahead = 12) =>
    ml.post('/ml/forecast', { lat, lng, hours_ahead }),
  quickForecast: (lat, lng) =>
    ml.get('/ml/forecast/quick', { params: { lat, lng } }),
}