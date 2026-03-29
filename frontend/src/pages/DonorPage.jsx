import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import ImpactBanner from '../components/ImpactBanner'
import SmartSuggestions from '../components/SmartSuggestions'
import SmartExpiryInput from '../components/SmartExpiryInput'
import WasteAnalytics from '../components/WasteAnalytics'
import NeedBoard from '../components/NeedBoard'
import DonorBadges from '../components/DonorBadges'
import DemandGapSuggestions from '../components/DemandGapSuggestions'
import { listingsAPI, donorsAPI } from '../utils/api'
import { CATEGORY_META, timeLeft, formatKg } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { SkeletonRow, Spinner } from '../components/Skeleton'
import LiveCountdownBadge from '../components/LiveCountdown'
import { useLanguage } from '../context/LanguageContext'

const CHENNAI = { lat: 12.9716, lng: 80.2209 }
const CATS = ['cooked', 'raw', 'packaged', 'bakery', 'dairy']

export default function DonorPage() {
  const [stats, setStats] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'analytics' | 'needs'
  const [form, setForm] = useState({
    title: '', description: '', quantity_kg: '', expires_in_hours: '8', category: 'cooked',
  })
  const { user } = useAuth()
  const { addToast } = useToast()
  const { t } = useLanguage()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [profileRes, statsRes] = await Promise.all([
        donorsAPI.me(), donorsAPI.stats(),
      ])
      setListings(profileRes.data.listings || [])
      setStats(statsRes.data)
    } catch {
      addToast('Failed to load dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Feature 4: count expiring listings for alert banner
  const expiringCount = listings.filter(l => {
    if (l.is_claimed) return false
    const minsLeft = (new Date(l.expires_at) - Date.now()) / 60000
    return minsLeft > 0 && minsLeft < 60
  }).length

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePost = async () => {
    if (!form.title || !form.quantity_kg) {
      addToast('Title and quantity are required', 'error'); return
    }
    setPosting(true)
    try {
      const res = await listingsAPI.create({
        ...form,
        quantity_kg: parseFloat(form.quantity_kg),
        expires_in_hours: parseFloat(form.expires_in_hours),
        lat: CHENNAI.lat, lng: CHENNAI.lng,
      })
      addToast('Listing published! 🎉', 'success')
      setListings(prev => [res.data, ...prev])
      setForm({ title: '', description: '', quantity_kg: '', expires_in_hours: '8', category: 'cooked' })
      fetchData()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to post listing', 'error')
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await listingsAPI.delete(id)
      setListings(prev => prev.filter(l => l.id !== id))
      addToast('Listing removed', 'info')
      fetchData()
    } catch {
      addToast('Failed to delete listing', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const statCards = stats ? [
    { val: stats.total_listings, label: 'Total Listings', sub: 'All time', color: 'var(--primary)', icon: '📋' },
    { val: `${stats.total_kg_donated} kg`, label: 'Total Donated', sub: 'Across all listings', color: '#0369A1', icon: '📦' },
    { val: stats.claimed_listings, label: 'Claimed', sub: 'Successfully', color: '#B45309', icon: '✅' },
    {
      val: stats.total_listings > 0 ? `${Math.round(stats.claimed_listings / stats.total_listings * 100)}%` : '—',
      label: 'Claim Rate', sub: 'Of all listings', color: '#059669', icon: '📈'
    },
  ] : []

  return (
    <div className="page-wrapper">
      <Navbar />
      <ImpactBanner />
      <div className="page-content page-enter">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="page-header">
            <div>
              <h1 className="page-title">{t('donor.title')}</h1>
              <p className="page-subtitle">{t('donor.subtitle')}</p>
            </div>
          </div>

          {/* Feature 4: Expiry alert banner */}
          {expiringCount > 0 && (
            <div style={{
              background: 'linear-gradient(90deg, #FEE2E2, #FEF3E2)',
              border: '1px solid #FECACA', borderRadius: '10px',
              padding: '10px 16px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '10px',
              animation: 'pulseGlow 2s infinite',
            }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <div style={{ flex: 1, fontSize: '13px', color: '#991B1B', fontWeight: 500 }}>
                <strong>{expiringCount} listing{expiringCount > 1 ? 's' : ''}</strong> expiring in under 60 minutes!
                Consider reposting or reaching out to recipients.
              </div>
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{ padding: '4px 12px', borderRadius: '6px', background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
              >
                View Listings
              </button>
            </div>
          )}

          {/* Donor Badges */}
          {stats && <DonorBadges stats={stats} />}

          {/* Stats */}
          <div className="stats-grid">
            {loading ? [0, 1, 2, 3].map(i => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ width: '60px', height: '28px', marginBottom: '8px' }} />
                <div className="skeleton" style={{ width: '100px', height: '14px' }} />
              </div>
            )) : statCards.map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--surface-alt)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
            {[
              { id: 'dashboard', label: '📋 Dashboard' },
              { id: 'analytics', label: '📊 Analytics' },
              { id: 'needs', label: '🙏 Need Board' },
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

          {/* Feature 5: Analytics tab */}
          {activeTab === 'analytics' && <WasteAnalytics />}

          {/* Feature 7: Need board tab (donor view — compact + fulfillment) */}
          {activeTab === 'needs' && <NeedBoard />}

          {activeTab === 'dashboard' && (
            <>
              {/* Category breakdown bar */}
              {stats && Object.keys(stats.by_category).length > 0 && (
                <div className="card" style={{ marginBottom: '20px' }}>
                  <div className="card-title" style={{ marginBottom: '14px' }}>Donations by Category</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {Object.entries(stats.by_category).map(([cat, kg]) => {
                      const meta = CATEGORY_META[cat] || CATEGORY_META.cooked
                      return (
                        <div key={cat} className="category-stat-chip" style={{ background: meta.bg }}>
                          <span style={{ fontSize: '16px' }}>{meta.emoji}</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: meta.text }}>{kg} kg</div>
                            <div style={{ fontSize: '10px', color: meta.text, opacity: 0.7 }}>{meta.label}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', alignItems: 'start' }}>
                {/* Post form */}
                <div className="card">
                  <div className="card-title">Post New Listing</div>
                  <div className="card-subtitle" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                    Share your surplus food with nearby recipients
                  </div>

                  <DemandGapSuggestions />
                  <SmartSuggestions category={form.category} onSuggestTitle={(title) => set('title', title)} />

                  <div className="form-stack">
                    <Field label="Food Title *">
                      <input className="input" placeholder="e.g. Rice and Sambar (10 portions)"
                        value={form.title} onChange={e => set('title', e.target.value)} />
                    </Field>
                    <Field label="Description">
                      <textarea className="input" rows={2} style={{ resize: 'none' }}
                        placeholder="Any details about the food..."
                        value={form.description} onChange={e => set('description', e.target.value)} />
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <Field label="Quantity (kg) *">
                        <input className="input" type="number" min="0.1" step="0.1" placeholder="e.g. 12"
                          value={form.quantity_kg} onChange={e => set('quantity_kg', e.target.value)} />
                      </Field>
                      {/* Feature 6: Smart expiry input */}
                      <Field label="Expires In">
                        <SmartExpiryInput
                          category={form.category}
                          value={form.expires_in_hours}
                          onChange={v => set('expires_in_hours', v)}
                        />
                      </Field>
                    </div>
                    <div>
                      <div className="field-label">Category</div>
                      <div className="chip-row">
                        {CATS.map(cat => {
                          const meta = CATEGORY_META[cat]
                          return (
                            <div
                              key={cat}
                              className={`chip ${form.category === cat ? 'active' : ''}`}
                              style={form.category === cat ? { background: meta.bg, color: meta.text, borderColor: meta.color } : {}}
                              onClick={() => {
                                set('category', cat)
                                // Feature 6: auto-suggest expiry on category change
                                const suggestions = { cooked: '4', bakery: '8', raw: '24', dairy: '12', packaged: '48' }
                                if (!form.expires_in_hours || form.expires_in_hours === '8') {
                                  set('expires_in_hours', suggestions[cat] || '8')
                                }
                              }}
                            >
                              {meta.emoji} {meta.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="info-box">
                      📍 Location auto-detected from your profile (Chennai)
                    </div>
                    <button className="btn-primary btn-full" onClick={handlePost} disabled={posting}>
                      {posting ? <><Spinner size={14} color="#fff" /> Publishing...</> : 'Publish Listing'}
                    </button>
                  </div>

                  {/* Feature 7: Compact need board for donor to see what's needed */}
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <NeedBoard compact />
                  </div>
                </div>

                {/* Listings table */}
                <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                  <div className="card-header">
                    <h2 className="card-title">My Listings</h2>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {['Food Item', 'Category', 'Qty', 'Expires', 'Status', ''].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? [0, 1, 2, 3].map(i => <SkeletonRow key={i} />) :
                          listings.length === 0 ? (
                            <tr><td colSpan={6} className="empty-cell">
                              <div className="empty-state-inline">
                                <span>📋</span> No listings yet. Post your first one!
                              </div>
                            </td></tr>
                          ) : listings.slice(0, 20).map(l => {
                            const tl = timeLeft(l.expires_at)
                            const meta = CATEGORY_META[l.category] || CATEGORY_META.cooked
                            const status = l.is_claimed ? 'Claimed' : tl.expired ? 'Expired' : 'Active'
                            const statusColor = l.is_claimed ? '#B45309' : tl.expired ? '#6B7280' : '#059669'
                            const statusBg = l.is_claimed ? '#FEF3E2' : tl.expired ? 'var(--surface-alt)' : '#D1FAE5'

                            return (
                              <tr key={l.id}>
                                <td className="name-cell">{l.title}</td>
                                <td>
                                  <span className="category-badge" style={{ background: meta.bg, color: meta.text }}>
                                    {meta.emoji} {l.category}
                                  </span>
                                </td>
                                <td>{formatKg(l.quantity_kg)}</td>
                                {/* Feature 1+2: live countdown in table */}
                                <td><LiveCountdownBadge expiresAt={l.expires_at} /></td>
                                <td>
                                  <span className="status-badge" style={{ background: statusBg, color: statusColor }}>
                                    {status}
                                  </span>
                                </td>
                                <td>
                                  {!l.is_claimed && !tl.expired && (
                                    <button className="btn-ghost btn-sm" onClick={() => handleDelete(l.id)} disabled={deleting === l.id}>
                                      {deleting === l.id ? <Spinner size={10} /> : '🗑'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
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