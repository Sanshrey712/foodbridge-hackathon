import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import ImpactBanner from '../components/ImpactBanner'
import ImpactTimeline from '../components/ImpactTimeline'
import QRPickupCode from '../components/QRPickupCode'
import { claimsAPI, listingsAPI } from '../utils/api'
import { CATEGORY_META, formatKg } from '../utils/helpers'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Skeleton'
import { useLanguage } from '../context/LanguageContext'

export default function ClaimsPage() {
  const [claims, setClaims] = useState([])
  const [details, setDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [picking, setPicking] = useState(null)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'history' | 'timeline'
  const { addToast } = useToast()
  const { t } = useLanguage()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await claimsAPI.mine()
        const claimsData = res.data || []
        setClaims(claimsData)
        const detailMap = {}
        await Promise.allSettled(
          claimsData.map(async c => {
            try {
              const r = await listingsAPI.get(c.listing_id)
              detailMap[c.listing_id] = r.data
            } catch { }
          })
        )
        setDetails(detailMap)
      } catch {
        addToast('Failed to load claims', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handlePickup = async (claimId) => {
    setPicking(claimId)
    try {
      await claimsAPI.pickup(claimId)
      setClaims(prev => prev.map(c =>
        c.id === claimId ? { ...c, picked_up: true, picked_up_at: new Date().toISOString() } : c
      ))
      addToast('Marked as picked up! ✅', 'success')
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update', 'error')
    } finally {
      setPicking(null)
    }
  }

  const active = claims.filter(c => !c.picked_up)
  const history = claims.filter(c => c.picked_up)
  const totalKg = history.reduce((s, c) => s + (details[c.listing_id]?.quantity_kg || 0), 0)

  return (
    <div className="page-wrapper">
      <Navbar />
      <ImpactBanner />
      <div className="page-content page-enter">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="page-header">
            <div>
              <h1 className="page-title">{t('claims.title')}</h1>
              <p className="page-subtitle">{t('claims.subtitle')}</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="stats-grid three-col">
            {[
              { val: claims.length, label: 'Total Claims', color: 'var(--primary)', icon: '📋' },
              { val: active.length, label: 'Pending Pickup', color: 'var(--accent)', icon: '⏳' },
              { val: `${totalKg.toFixed(1)} kg`, label: 'Food Saved', color: '#0369A1', icon: '🥗' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value" style={{ color: s.color }}>{loading ? '—' : s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--surface-alt)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
            {[
              { id: 'active', label: `⏳ Pending (${active.length})` },
              { id: 'history', label: `✅ History (${history.length})` },
              { id: 'timeline', label: '🌱 Impact Timeline' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 18px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
                  background: activeTab === tab.id ? 'var(--surface-solid)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all .15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Spinner size={32} />
            </div>
          ) : (
            <>
              {/* Feature 8: Impact Timeline tab */}
              {activeTab === 'timeline' && (
                <ImpactTimeline claims={claims} details={details} />
              )}

              {activeTab === 'active' && (
                active.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">✅</div>
                    <h3 className="empty-state-title">All caught up!</h3>
                    <p className="empty-state-desc">No pending pickups. Go claim more food from the Map or Matches.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {active.map(c => (
                      <ClaimCard
                        key={c.id} claim={c}
                        listing={details[c.listing_id]}
                        onPickup={handlePickup}
                        picking={picking === c.id}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === 'history' && (
                history.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3 className="empty-state-title">No history yet</h3>
                    <p className="empty-state-desc">Mark your pending claims as picked up to build your history.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {history.map(c => (
                      <ClaimCard key={c.id} claim={c} listing={details[c.listing_id]} done />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ClaimCard({ claim, listing, onPickup, picking, done }) {
  const [showQR, setShowQR] = useState(false)
  const meta = listing ? (CATEGORY_META[listing.category] || CATEGORY_META.cooked) : null
  const claimedAt = new Date(claim.claimed_at).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  const pickedAt = claim.picked_up_at
    ? new Date(claim.picked_up_at).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
    : null

  const kg = listing?.quantity_kg || 0
  const meals = Math.round(kg * 4)

  return (
    <div className="claim-card" style={{ opacity: done ? 0.85 : 1 }}>
      <div className="claim-icon" style={{ background: meta ? meta.bg : 'var(--surface-alt)' }}>
        {meta ? meta.emoji : '📦'}
      </div>
      <div className="claim-info">
        <div className="claim-title">{listing?.title ?? 'Loading...'}</div>
        <div className="claim-meta">
          {listing && (
            <span className="category-badge" style={{ background: meta.bg, color: meta.text }}>
              {meta.emoji} {listing.category}
            </span>
          )}
          {listing && <span>{formatKg(listing.quantity_kg)}</span>}
          {done && meals > 0 && (
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>🍽️ {meals} meals</span>
          )}
          <span>Claimed {claimedAt}</span>
        </div>
        {pickedAt && (
          <div className="claim-picked">✓ Picked up {pickedAt}</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        {done ? (
          <span className="status-badge done">✓ Done</span>
        ) : (
          <>
            <button className="btn-primary btn-sm" onClick={() => onPickup(claim.id)} disabled={picking}>
              {picking ? <Spinner size={12} color="#fff" /> : null}
              Mark Picked Up
            </button>
            <button
              className="btn-ghost btn-sm"
              onClick={() => setShowQR(!showQR)}
              style={{ fontSize: '11px' }}
            >
              {showQR ? '✕ Hide QR' : '📱 Show QR'}
            </button>
          </>
        )}
      </div>
      {showQR && !done && (
        <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
          <QRPickupCode
            claimId={claim.id}
            listingTitle={listing?.title}
            quantity={listing?.quantity_kg}
          />
        </div>
      )}
    </div>
  )
}