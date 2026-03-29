import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { authAPI } from '../utils/api'
import { Spinner } from '../components/Skeleton'

const CHENNAI = { lat: 12.9716, lng: 80.2209 }
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Google OAuth via Supabase
async function signInWithGoogle() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase env vars not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env')
  }
  const redirectTo = `${window.location.origin}/auth/callback`
  const url = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&apikey=${SUPABASE_ANON_KEY}`
  window.location.href = url
}

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('donor')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', org_name: '', org_type: 'ngo' })
  const { login } = useAuth()
  const { addToast } = useToast()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Handle Google OAuth callback — Supabase appends #access_token or ?code to the URL
  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)

    // Supabase implicit flow: hash contains access_token
    if (hash.includes('access_token')) {
      const hashParams = new URLSearchParams(hash.slice(1))
      const accessToken = hashParams.get('access_token')
      if (accessToken) {
        handleGoogleCallback(accessToken)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    // Check if redirected back from /auth/callback with a google_token query param
    const googleToken = params.get('google_token')
    const googleEmail = params.get('email')
    const googleName = params.get('name')
    if (googleToken && googleEmail) {
      setPendingGoogleUser({ token: googleToken, email: googleEmail, name: googleName || googleEmail.split('@')[0] })
      setShowRoleModal(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleGoogleCallback = async (accessToken) => {
    // Decode the JWT to get user info
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const email = payload.email
      const name = payload.user_metadata?.full_name || payload.email?.split('@')[0] || 'User'

      // Try to login first (user may already exist)
      try {
        const res = await authAPI.loginWithGoogle({ token: accessToken, email, name })
        login(res.data)
        addToast(`Welcome back, ${res.data.name}! 🌿`, 'success')
        navigate(res.data.role === 'donor' ? '/donor' : '/recipient')
      } catch {
        // New user — ask for role
        setPendingGoogleUser({ token: accessToken, email, name })
        setShowRoleModal(true)
      }
    } catch (e) {
      addToast('Google sign-in failed. Please try again.', 'error')
    }
  }

  const handleGoogleRoleSelect = async (selectedRole) => {
    if (!pendingGoogleUser) return
    setLoading(true)
    try {
      const res = await authAPI.register({
        name: pendingGoogleUser.name,
        email: pendingGoogleUser.email,
        password: `google_oauth_${pendingGoogleUser.token?.slice(-16) || Math.random().toString(36)}`,
        role: selectedRole,
        lat: CHENNAI.lat,
        lng: CHENNAI.lng,
      })
      login(res.data)
      addToast(`Welcome, ${res.data.name}! 🌿`, 'success')
      navigate(selectedRole === 'donor' ? '/donor' : '/recipient')
    } catch (err) {
      // If user already registered with this email, just log them in
      try {
        const loginRes = await authAPI.login({
          email: pendingGoogleUser.email,
          password: `google_oauth_${pendingGoogleUser.token?.slice(-16) || ''}`,
        })
        login(loginRes.data)
        addToast(`Welcome back, ${loginRes.data.name}! 🌿`, 'success')
        navigate(loginRes.data.role === 'donor' ? '/donor' : '/recipient')
      } catch {
        addToast(err.response?.data?.detail || 'Sign-in failed. Try email/password.', 'error')
      }
    } finally {
      setLoading(false)
      setShowRoleModal(false)
      setPendingGoogleUser(null)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!SUPABASE_URL) {
      // Demo mode: show a helpful message
      addToast('Add VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY to .env to enable Google sign-in', 'info')
      return
    }
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      addToast(err.message || 'Google sign-in failed', 'error')
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      addToast('Please fill in all required fields', 'error'); return
    }
    setLoading(true)
    try {
      let res
      if (mode === 'login') {
        res = await authAPI.login({ email: form.email, password: form.password })
      } else {
        if (!form.name) { addToast('Name is required', 'error'); setLoading(false); return }
        res = await authAPI.register({
          name: form.name, email: form.email,
          password: form.password, role,
          lat: CHENNAI.lat, lng: CHENNAI.lng,
          org_name: form.org_name || undefined,
          org_type: form.org_type || undefined,
        })
      }
      login(res.data)
      addToast(`Welcome${res.data.name ? ', ' + res.data.name : ''}! 🌿`, 'success')
      navigate(res.data.role === 'donor' ? '/donor' : '/recipient')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong'
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    { val: '84+', label: 'NGO Partners' },
    { val: '150+', label: 'Daily Listings' },
    { val: '0 kg', label: 'Wasted Today' },
  ]

  return (
    <div className="login-container">
      <button className="login-theme-toggle" onClick={toggleTheme}>
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Role selection modal for Google OAuth new users */}
      {showRoleModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--surface-solid)', borderRadius: '24px',
            padding: '36px', maxWidth: '420px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.3s ease',
            border: '1px solid var(--border)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              {pendingGoogleUser?.name && (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3A7D5D, #52B788)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 700, color: '#fff',
                  margin: '0 auto 16px',
                }}>
                  {pendingGoogleUser.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                One last step
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                How will you use FoodBridge?
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Signed in as <strong>{pendingGoogleUser?.email}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { val: 'donor', emoji: '🍱', title: 'Food Donor', desc: 'I have surplus food to share — restaurant, caterer, or individual' },
                { val: 'recipient', emoji: '🏠', title: 'Recipient / NGO', desc: 'I represent an NGO, shelter, or community that needs food' },
              ].map(r => (
                <button
                  key={r.val}
                  onClick={() => handleGoogleRoleSelect(r.val)}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '18px 20px', borderRadius: '14px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface-alt)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s', fontFamily: 'var(--font-body)',
                    opacity: loading ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.background = 'var(--primary-soft)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--surface-alt)'
                  }}
                >
                  <span style={{ fontSize: '28px' }}>{r.emoji}</span>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{r.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.desc}</div>
                  </div>
                  {loading && <Spinner size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Left panel */}
      <div className="login-left">
        <div className="login-brand">🌿 FoodBridge</div>
        <div>
          <div className="login-hero">
            Connecting<br />Surplus Food<br />to Those<br />Who Need It.
          </div>
          <div className="login-tagline">
            AI-powered food redistribution across Chennai — reducing waste, fighting hunger in real time.
          </div>
        </div>
        <div className="login-stats">
          {stats.map(s => (
            <div key={s.val} className="login-stat">
              <div className="login-stat-val">{s.val}</div>
              <div className="login-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-container">
          {/* Toggle */}
          <div className="login-toggle">
            {['login', 'register'].map(m => (
              <div
                key={m}
                className={`login-toggle-btn ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </div>
            ))}
          </div>

          <h2 className="login-title">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="login-subtitle">
            {mode === 'login'
              ? 'Sign in to your FoodBridge account'
              : 'Join FoodBridge and start making an impact'}
          </p>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 20px',
              borderRadius: '12px',
              border: '1.5px solid var(--border)',
              background: 'var(--surface-solid)',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text)',
              transition: 'all .15s',
              marginBottom: '4px',
              opacity: googleLoading ? 0.7 : 1,
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--surface-alt)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-solid)' }}
          >
            {googleLoading ? (
              <Spinner size={18} color="var(--primary)" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {googleLoading ? 'Redirecting...' : `Continue with Google`}
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            margin: '16px 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-hint)', fontWeight: 500 }}>or continue with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <div className="form-stack">
            {mode === 'register' && (
              <Field label="Full Name">
                <input className="input" placeholder="Your name or organisation"
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </Field>
            )}
            <Field label="Email address">
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Password">
              <input className="input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => set('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </Field>

            {mode === 'register' && (
              <>
                <div>
                  <div className="field-label">I am a...</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                      { val: 'donor', label: '🍱 Food Donor' },
                      { val: 'recipient', label: '🏠 Recipient / NGO' },
                    ].map(r => (
                      <div
                        key={r.val}
                        className={`role-option ${role === r.val ? 'active' : ''}`}
                        onClick={() => setRole(r.val)}
                      >
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
                {role === 'recipient' && (
                  <Field label="Organisation Name (optional)">
                    <input className="input" placeholder="e.g. Akshaya Patra, Shelter Name"
                      value={form.org_name} onChange={e => set('org_name', e.target.value)} />
                  </Field>
                )}
              </>
            )}

            <button className="btn-primary btn-full btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <><Spinner size={16} color="#fff" /> Processing...</> :
                mode === 'login' ? 'Sign In to FoodBridge' : 'Create My Account'}
            </button>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-hint)' }}>
            By continuing, you agree to FoodBridge's terms and privacy policy.
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="form-field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}