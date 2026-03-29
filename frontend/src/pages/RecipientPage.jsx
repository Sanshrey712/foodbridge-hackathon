import React, { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import ImpactBanner from '../components/ImpactBanner'
import OnboardingModal from '../components/OnboardingModal'
import ClaimCelebration from '../components/ClaimCelebration'
import NeedBoard from '../components/NeedBoard'
import MatchScoreBreakdown from '../components/MatchScoreBreakdown'
import LiveCountdownBadge from '../components/LiveCountdown'
import RouteDirections from '../components/RouteDirections'
import EmailToast, { useEmailToast } from '../components/SMSMockToast'
import CO2Calculator from '../components/CO2Calculator'
import ConfettiCelebration from '../components/ConfettiCelebration'
import MissionControl from '../components/MissionControl'
import { mlAPI, claimsAPI, notificationsAPI } from '../utils/api'
import { CATEGORY_META, formatKg } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useGlobalClaimed } from '../context/GlobalClaimedContext'
import { SkeletonCard, Spinner } from '../components/Skeleton'
import FoodSafetyBadge from '../components/FoodSafetyChecker'
import { useLanguage } from '../context/LanguageContext'

const CHENNAI = { lat: 12.9716, lng: 80.2209 }
const ALL_CATS = ['cooked', 'raw', 'packaged', 'bakery', 'dairy']

// Donor name lookup — in real app from Supabase; mock for now
const DONOR_NAMES = [
  'Saravana Bhavan', 'Hotel Annalakshmi', 'Taj Coromandel',
  'Murugan Idli Shop', 'Chennai Bakehouse',
]
function randomDonor() { return DONOR_NAMES[Math.floor(Math.random() * DONOR_NAMES.length)] }

export default function RecipientPage() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(null)
  const [celebration, setCelebration] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeTab, setActiveTab] = useState('matches')
  // ✅ NEW: route directions state
  const [routeTarget, setRouteTarget] = useState(null)
  // ✅ NEW: CO₂ calculator shown after claim
  const [showCO2, setShowCO2] = useState(false)
  const [lastClaimedKg, setLastClaimedKg] = useState(10)
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiData, setConfettiData] = useState({ kg: 5, title: 'Food' })

  const { user } = useAuth()
  const { addToast } = useToast()
  const { markClaimed, isClaimed } = useGlobalClaimed()
  const { t } = useLanguage()
  // ✅ Email notification toast hook
  const { showEmail } = useEmailToast()

  const [prefs, setPrefs] = useState(() => {
    const stored = localStorage.getItem('fb_recipient_prefs')
    return stored ? JSON.parse(stored) : null
  })

  const prefCats = prefs?.prefs || []
  const maxDist = prefs?.maxDist || 10

  useEffect(() => {
    if (!prefs) setShowOnboarding(true)
  }, [prefs])

  const fetchMatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await mlAPI.match(CHENNAI.lat, CHENNAI.lng, prefCats, maxDist, 20)
      setMatches(res.data || [])
    } catch {
      addToast('Could not fetch ML matches. Is the ML server running?', 'error')
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [prefCats.join(','), maxDist])

  useEffect(() => { fetchMatches() }, [fetchMatches])

  const handleClaim = async (match) => {
    setClaiming(match.id)
    try {
      await claimsAPI.create(match.id)
      addToast('Listing claimed! 🎉', 'success')
      markClaimed(match.id)
      setCelebration(match.quantity_kg)
      setLastClaimedKg(match.quantity_kg)
      // ✅ Trigger confetti + impact certificate
      setConfettiData({ kg: match.quantity_kg, title: match.title, category: match.category })
      setShowConfetti(true)

      // ✅ Send real email notifications via backend
      const donorName = randomDonor()
      const donorEmail = user?.email || 'donor@foodbridge.app'
      const recipientEmail = user?.email || 'recipient@foodbridge.app'

      // Fire the email API call (non-blocking)
      notificationsAPI.sendEmail({
        donor_email: donorEmail,
        recipient_email: recipientEmail,
        food_title: match.title,
        quantity_kg: match.quantity_kg,
        donor_name: donorName,
      }).catch(() => {}) // silently fail — toast still shows

      // Show email confirmation toast
      showEmail({
        donorName,
        food: match.title,
        kg: match.quantity_kg,
        recipientName: user?.name || 'Recipient',
        donorEmail,
        recipientEmail,
      })

      // Show route after claim
      setRouteTarget({
        lat: match.lat,
        lng: match.lng,
        name: donorName,
        food: match.title,
        quantity_kg: match.quantity_kg,
      })
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to claim', 'error')
    } finally {
      setClaiming(null)
    }
  }

  const handleOnboardingComplete = (data) => {
    setPrefs(data)
    setShowOnboarding(false)
  }

  const visibleMatches = matches.filter(m => !isClaimed(m.id))

  return (
    <div className="page-wrapper">
      <Navbar />
      <ImpactBanner />

      {/* ✅ Email Notification Toast (global, renders on top) */}
      <EmailToast />

      {celebration && (
        <ConfettiCelebration
          show={true}
          kgSaved={confettiData.kg}
          foodTitle={confettiData.title}
          category={confettiData.category}
          onClose={() => {
            setCelebration(null)
            setShowConfetti(false)
            setTimeout(() => setShowCO2(true), 300)
          }}
        />
      )}

      {/* ✅ NEW: Route Directions modal */}
      {routeTarget && (
        <RouteDirections
          from={{ lat: CHENNAI.lat, lng: CHENNAI.lng, name: 'Your Location' }}
          to={{ lat: routeTarget.lat, lng: routeTarget.lng, name: routeTarget.name }}
          food={`${routeTarget.food} — ${routeTarget.quantity_kg} kg`}
          onClose={() => setRouteTarget(null)}
        />
      )}

      {/* ✅ NEW: CO₂ impact popup after claim */}
      {showCO2 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease',
        }} onClick={() => setShowCO2(false)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>🌍 Your Environmental Impact</span>
              <button onClick={() => setShowCO2(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>
            <CO2Calculator initialKg={lastClaimedKg} />
          </div>
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      <div className="page-content page-enter">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="page-header">
            <div>
              <h1 className="page-title">
                {activeTab === 'matches' ? t('recipient.title') : activeTab === 'needs' ? 'Need Board' : '🌍 CO₂ Impact'}
              </h1>
              <p className="page-subtitle">
                {activeTab === 'matches'
                  ? t('recipient.subtitle')
                  : activeTab === 'needs'
                    ? 'Post what your organisation needs — donors will see it.'
                    : 'Calculate the environmental impact of your food rescue.'}
              </p>
            </div>
            <div className="text-hint" style={{ fontSize: '12px' }}>
              {activeTab === 'matches' && 'AI-ranked · urgency 35% · distance 30% · category 20% · quantity 15%'}
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--surface-alt)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
            {[
              { id: 'matches', label: '🤖 ML Matches' },
              { id: 'needs', label: '📋 Need Board' },
              { id: 'co2', label: '🌍 CO₂ Impact' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                  background: activeTab === tab.id ? 'var(--surface-solid)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'needs' && <NeedBoard />}

          {/* ✅ NEW: CO₂ tab — Mission Control dashboard */}
          {activeTab === 'co2' && (
            <div style={{ maxWidth: '980px' }}>
              <MissionControl />
              <div style={{ marginTop: '24px' }}>
                <CO2Calculator initialKg={20} />
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <>
              {/* Filters */}
              <div className="card" style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                <div>
                  <div className="section-label">Preferred Categories</div>
                  <div className="chip-row">
                    {ALL_CATS.map(cat => {
                      const meta = CATEGORY_META[cat]
                      const active = prefCats.includes(cat)
                      return (
                        <div
                          key={cat}
                          className={`chip ${active ? 'active' : ''}`}
                          style={active ? { borderColor: meta.color, background: meta.bg, color: meta.text } : {}}
                          onClick={() => {
                            const newPrefs = active ? prefCats.filter(c => c !== cat) : [...prefCats, cat]
                            const updated = { ...prefs, prefs: newPrefs }
                            setPrefs(updated)
                            localStorage.setItem('fb_recipient_prefs', JSON.stringify(updated))
                          }}
                        >
                          {meta.emoji} {meta.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div className="section-label">Max Distance</div>
                    <div className="chip-row">
                      {[5, 10, 15, 25].map(d => (
                        <div
                          key={d}
                          className={`chip ${maxDist === d ? 'active' : ''}`}
                          onClick={() => {
                            const updated = { ...prefs, maxDist: d }
                            setPrefs(updated)
                            localStorage.setItem('fb_recipient_prefs', JSON.stringify(updated))
                          }}
                        >
                          {d} km
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn-primary" onClick={fetchMatches} style={{ alignSelf: 'flex-end' }}>
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Cards */}
              {loading ? (
                <div className="match-grid">
                  {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : visibleMatches.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <h3 className="empty-state-title">No matches found</h3>
                  <p className="empty-state-desc">Try increasing the distance or clearing category filters</p>
                  <button className="btn-primary" onClick={fetchMatches}>🔄 Try Again</button>
                </div>
              ) : (
                <div className="match-grid">
                  {visibleMatches.map((m, idx) => {
                    const expiresAt = new Date(Date.now() + m.hours_to_expiry * 3600_000).toISOString()
                    const meta = CATEGORY_META[m.category] || CATEGORY_META.cooked
                    const score = Math.round(m.match_score * 100)

                    return (
                      <div
                        key={m.id}
                        className="listing-card fade-in"
                        style={{
                          animationDelay: `${idx * 50}ms`,
                          borderColor: m.hours_to_expiry < 3 ? '#FBBF2466' : undefined,
                        }}
                      >
                        {m.hours_to_expiry < 3 && (
                          <div className="listing-expiring-badge">EXPIRING SOON</div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                          <span className="category-badge" style={{ background: meta.bg, color: meta.text }}>
                            {meta.emoji} {m.category}
                          </span>
                          <div className="score-circle" style={{
                            background: `${score >= 80 ? '#2D6A4F' : score >= 60 ? '#52B788' : '#F4A261'}22`,
                            color: score >= 80 ? '#2D6A4F' : score >= 60 ? '#52B788' : '#F4A261',
                            border: `2px solid ${score >= 80 ? '#2D6A4F' : score >= 60 ? '#52B788' : '#F4A261'}44`,
                          }}>
                            {score}
                          </div>
                        </div>

                        <div className="listing-card-title" style={{ marginBottom: '10px' }}>{m.title}</div>

                        {/* AI Safety Badge */}
                        <div style={{ marginBottom: '8px' }}>
                          <FoodSafetyBadge category={m.category} hoursToExpiry={m.hours_to_expiry} />
                        </div>

                        <div className="stat-row">
                          <div className="stat-cell">
                            <div className="stat-cell-value">{formatKg(m.quantity_kg)}</div>
                            <div className="stat-cell-label">quantity</div>
                          </div>
                          <div className="stat-divider" />
                          <div className="stat-cell">
                            <div className="stat-cell-value">{m.distance_km} km</div>
                            <div className="stat-cell-label">distance</div>
                          </div>
                          <div className="stat-divider" />
                          <div className="stat-cell">
                            <LiveCountdownBadge expiresAt={expiresAt} style={{ fontSize: '13px', fontWeight: 600 }} />
                            <div className="stat-cell-label">expires</div>
                          </div>
                        </div>

                        <div style={{ margin: '10px 0' }}>
                          <MatchScoreBreakdown match={m} />
                        </div>

                        {/* ✅ NEW: Route button alongside claim */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-full btn-primary"
                            style={{ flex: 1 }}
                            onClick={() => handleClaim(m)}
                            disabled={claiming === m.id}
                          >
                            {claiming === m.id ? <Spinner size={14} color="#fff" /> : null}
                            {t('action.claim')}
                          </button>
                          <button
                            onClick={() => setRouteTarget({
                              lat: m.lat, lng: m.lng,
                              name: randomDonor(),
                              food: m.title,
                              quantity_kg: m.quantity_kg,
                            })}
                            style={{
                              padding: '10px 12px', borderRadius: '10px',
                              border: '1.5px solid var(--border)',
                              background: 'var(--surface-alt)',
                              cursor: 'pointer', fontSize: '16px',
                              transition: 'all .15s',
                            }}
                            title="View route"
                          >
                            🗺️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}