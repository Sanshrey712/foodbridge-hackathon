import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'
import { authAPI } from '../utils/api'
import { Spinner } from '../components/Skeleton'

const CHENNAI = { lat: 12.9716, lng: 80.2209 }

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('donor')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', org_name: '', org_type: 'ngo' })
  const { login } = useAuth()
  const { addToast } = useToast()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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
      {/* Theme toggle */}
      <button className="login-theme-toggle" onClick={toggleTheme}>
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Left panel */}
      <div className="login-left">
        <div className="login-brand">🌿 FoodBridge</div>
        <div className="login-hero">
          Connecting<br />Surplus Food<br />to Those<br />Who Need It.
        </div>
        <div className="login-tagline">
          AI-powered food redistribution across Chennai — reducing waste, fighting hunger in real time.
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
