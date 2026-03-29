import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../utils/api'
import LiveImpactCounter from '../components/LiveImpactCounter'
import CO2Calculator from '../components/CO2Calculator'

const FEATURES = [
  { icon: '🤖', title: 'AI-Powered Matching', desc: 'ML engine ranks food listings by urgency, distance, and category preference for optimal redistribution.' },
  { icon: '📊', title: 'Demand Forecasting', desc: 'Random Forest model predicts food surplus by hour and category to help donors post at peak times.' },
  { icon: '🗺️', title: 'Live Map + Heatmap', desc: 'Real-time map with density heatmaps showing food availability across Chennai neighborhoods.' },
  { icon: '💬', title: 'AI Food Assistant', desc: 'Context-aware chatbot helping donors post smarter and recipients find food faster.' },
  { icon: '🏆', title: 'Gamified Leaderboard', desc: 'Donor rankings by kg donated to drive healthy competition and community engagement.' },
  { icon: '⚡', title: 'Urgency Alerts', desc: 'Instant notifications when food near you is about to expire — every kg counts.' },
]

const TECH_STACK = [
  { name: 'React', icon: '⚛️' },
  { name: 'FastAPI', icon: '⚡' },
  { name: 'Supabase', icon: '🟢' },
  { name: 'Scikit-learn', icon: '🧠' },
  { name: 'OpenRouter AI', icon: '🤖' },
  { name: 'Leaflet Maps', icon: '🗺️' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate(user?.role === 'donor' ? '/donor' : '/recipient')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">🌿 FoodBridge</div>
        <div className="landing-nav-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? '☀️' : '🌙'}
          </button>
          {isLoggedIn ? (
            <button className="btn-primary" onClick={handleGetStarted}>
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button className="landing-nav-link" onClick={() => navigate('/login')}>
                Sign In
              </button>
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Get Started →
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <span className="landing-badge-dot" />
            AI-Powered Food Redistribution Platform
          </div>
          <h1 className="landing-hero-title">
            Every Meal Matters.<br />
            <span className="landing-hero-gradient">Zero Waste, Zero Hunger.</span>
          </h1>
          <p className="landing-hero-desc">
            FoodBridge connects surplus food from restaurants, caterers, and hotels
            with shelters and NGOs across Chennai — powered by machine learning
            for smarter, faster redistribution.
          </p>
          <div className="landing-hero-actions">
            <button className="btn-primary btn-lg landing-hero-btn" onClick={handleGetStarted}>
              {isLoggedIn ? 'Open Dashboard' : 'Start Saving Food'} →
            </button>
            <a href="#features" className="landing-hero-secondary">
              See How It Works ↓
            </a>
          </div>
        </div>

        {/* ✅ NEW: Live ticking impact counter */}
        <LiveImpactCounter />
      </section>

      {/* How it works */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section-header">
          <span className="landing-section-badge">HOW IT WORKS</span>
          <h2 className="landing-section-title">Three Steps to Save Food</h2>
        </div>
        <div className="landing-steps">
          {[
            { num: '01', icon: '📸', title: 'Donor Posts Surplus', desc: 'Restaurants and caterers list excess food with quantity, category, and expiry time.' },
            { num: '02', icon: '🧠', title: 'AI Matches & Ranks', desc: 'Our ML engine scores listings by urgency, distance, and recipient preferences for optimal matching.' },
            { num: '03', icon: '🎉', title: 'Recipient Claims & Picks Up', desc: 'NGOs claim matched food, get turn-by-turn directions, and mark pickup — every kg tracked.' },
          ].map((step, i) => (
            <div key={i} className="landing-step-card">
              <div className="landing-step-num">{step.num}</div>
              <div className="landing-step-icon">{step.icon}</div>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing-section" id="features">
        <div className="landing-section-header">
          <span className="landing-section-badge">FEATURES</span>
          <h2 className="landing-section-title">Built for Impact at Scale</h2>
          <p className="landing-section-desc">Every feature is designed to maximize food saved and minimize waste.</p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="landing-feature-card" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ✅ NEW: CO2 Calculator section */}
      <section className="landing-section" id="impact">
        <div className="landing-section-header">
          <span className="landing-section-badge">ENVIRONMENTAL IMPACT</span>
          <h2 className="landing-section-title">Calculate Your Impact</h2>
          <p className="landing-section-desc">
            Every kilogram of food saved has a measurable effect on climate change.
            See the numbers for yourself.
          </p>
        </div>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <CO2Calculator initialKg={20} />
        </div>
      </section>

      {/* Tech Stack */}
      <section className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-badge">TECH STACK</span>
          <h2 className="landing-section-title">Built With Modern Tools</h2>
        </div>
        <div className="landing-tech-grid">
          {TECH_STACK.map(t => (
            <div key={t.name} className="landing-tech-card">
              <span className="landing-tech-icon">{t.icon}</span>
              <span className="landing-tech-name">{t.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-cta-content">
          <h2 className="landing-cta-title">Ready to Make a Difference?</h2>
          <p className="landing-cta-desc">
            Join FoodBridge and help us reach zero food waste in Chennai.
          </p>
          <button className="btn-primary btn-lg landing-cta-btn" onClick={handleGetStarted}>
            {isLoggedIn ? 'Go to Dashboard' : 'Join FoodBridge Now'} →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span>🌿 FoodBridge</span>
            <span className="landing-footer-tagline">AI-powered food redistribution for Chennai</span>
          </div>
          <div className="landing-footer-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#impact">Impact</a>
            <span onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>Sign In</span>
          </div>
          <div className="landing-footer-copy" />
        </div>
      </footer>
    </div>
  )
}