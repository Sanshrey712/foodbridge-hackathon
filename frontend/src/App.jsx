import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { GlobalClaimedProvider } from './context/GlobalClaimedContext'
import { LanguageProvider } from './context/LanguageContext'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import RecipientPage from './pages/RecipientPage'
import DonorPage from './pages/DonorPage'
import ForecastPage from './pages/ForecastPage'
import ClaimsPage from './pages/ClaimsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AIChatBot from './components/AIChatBot'

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

function RoleRoute({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/map" replace />
  return children
}

function DefaultRedirect() {
  const { user } = useAuth()
  // Logged-in users go to their dashboard; guests see the landing page
  if (!user) return <LandingPage />
  return <Navigate to={user.role === 'donor' ? '/donor' : '/recipient'} replace />
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        {/* Public */}
        <Route path="/" element={<DefaultRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<LoginPage />} />

        {/* Auth-required */}
        <Route path="/map" element={
          <RequireAuth><MapPage /></RequireAuth>
        } />
        <Route path="/forecast" element={
          <RequireAuth><ForecastPage /></RequireAuth>
        } />
        <Route path="/leaderboard" element={
          <RequireAuth><LeaderboardPage /></RequireAuth>
        } />

        {/* Role-gated */}
        <Route path="/recipient" element={
          <RoleRoute role="recipient"><RecipientPage /></RoleRoute>
        } />
        <Route path="/claims" element={
          <RoleRoute role="recipient"><ClaimsPage /></RoleRoute>
        } />
        <Route path="/donor" element={
          <RoleRoute role="donor"><DonorPage /></RoleRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <GlobalClaimedProvider>
                <AnimatedRoutes />
                <AIChatBot />
              </GlobalClaimedProvider>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}