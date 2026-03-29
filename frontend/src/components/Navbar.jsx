import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useDonorExpiryAlert } from '../components/DonorExpiryBadge'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { lang, toggleLang, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  // Feature 4: expiry alert count
  const expiryCount = useDonorExpiryAlert()

  if (!user) return null

  const isDonor = user.role === 'donor'
  const path = location.pathname

  const donorLinks = [
    { label: t('nav.map'), to: '/map' },
    { label: t('nav.donor'), to: '/donor', alert: expiryCount },
    { label: t('nav.forecast'), to: '/forecast' },
    { label: t('nav.leaderboard'), to: '/leaderboard' },
  ]
  const recipientLinks = [
    { label: t('nav.map'), to: '/map' },
    { label: t('nav.recipient'), to: '/recipient' },
    { label: t('nav.forecast'), to: '/forecast' },
    { label: t('nav.claims'), to: '/claims' },
    { label: t('nav.leaderboard'), to: '/leaderboard' },
  ]

  const links = isDonor ? donorLinks : recipientLinks

  const fullName = user.name
    || localStorage.getItem('fb_user_name')
    || user.email?.split('@')[0]
    || 'User'

  const nameParts = fullName.trim().split(' ').filter(Boolean)
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : fullName.slice(0, 2).toUpperCase()

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>
        🌿 FoodBridge
      </div>
      <div className="navbar-links">
        {links.map(l => (
          <div
            key={l.to}
            className={`navbar-link ${path === l.to ? 'active' : ''}`}
            onClick={() => navigate(l.to)}
            style={{ position: 'relative' }}
          >
            {l.label}
            {/* Feature 4: red badge on Dashboard when listings expiring */}
            {l.alert > 0 && (
              <span style={{
                position: 'absolute',
                top: '10px',
                right: '0px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#EF4444',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px var(--bg)',
                animation: 'pulse 2s infinite',
              }}>
                {l.alert > 9 ? '9+' : l.alert}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="navbar-right">
        <span className="navbar-role">
          {isDonor ? '🍱 Donor' : '🏠 Recipient'}
        </span>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button
          className="theme-toggle"
          onClick={toggleLang}
          title={lang === 'en' ? 'Switch to Tamil' : 'Switch to English'}
          style={{ fontSize: '11px', fontWeight: 600 }}
        >
          {t('general.language')}
        </button>
        <div className="navbar-avatar" title={fullName} style={{ cursor: 'default', userSelect: 'none' }}>
          {initials}
        </div>
        <button className="navbar-logout" onClick={logout}>Sign out</button>
      </div>
    </nav>
  )
}