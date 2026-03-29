import React, { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Navbar from '../components/Navbar'
import ImpactBanner from '../components/ImpactBanner'
import ExpiryAlerts from '../components/ExpiryAlerts'
import ClaimCelebration from '../components/ClaimCelebration'
import LiveCountdownBadge from '../components/LiveCountdown'
import LiveActivityFeed from '../components/LiveActivityFeed'
import { listingsAPI, claimsAPI, mlAPI } from '../utils/api'
import { CATEGORY_META, formatKg } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useGlobalClaimed } from '../context/GlobalClaimedContext'
import { useLanguage } from '../context/LanguageContext'
import { Spinner, SkeletonCard } from '../components/Skeleton'

const CHENNAI = [12.9716, 80.2209]

const CATEGORY_RGB = {
  cooked: '45, 106, 79', raw: '16, 185, 129',
  packaged: '99, 102, 241', bakery: '244, 162, 97', dairy: '14, 165, 233',
}

function createPinIcon(emoji, color) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="
          width:38px;height:38px;border-radius:50%;
          background:${color};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size:17px;
          box-shadow:0 3px 10px ${color}55;
          border:2.5px solid #fff;
        ">${emoji}</div>
        <div style="width:8px;height:8px;border-radius:50%;background:${color};margin-top:-2px;box-shadow:0 1px 4px ${color}88;"></div>
      </div>`,
    iconSize: [38, 50], iconAnchor: [19, 50], popupAnchor: [0, -52],
  })
}

function AutoRefresh({ onRefresh }) {
  useEffect(() => {
    const id = setInterval(onRefresh, 30_000)
    return () => clearInterval(id)
  }, [onRefresh])
  return null
}

function HeatmapOverlay({ listings }) {
  const map = useMap()
  useEffect(() => {
    if (!listings.length) return
    const canvas = document.createElement('canvas')
    canvas.className = 'heatmap-canvas'
    canvas.width = map.getSize().x
    canvas.height = map.getSize().y
    canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:400;pointer-events:none;opacity:0.65;'
    const ctx = canvas.getContext('2d')
    const pane = map.getPane('overlayPane')
    pane.appendChild(canvas)
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      canvas.width = map.getSize().x
      canvas.height = map.getSize().y
      listings.forEach(l => {
        const point = map.latLngToContainerPoint([l.lat, l.lng])
        const rgb = CATEGORY_RGB[l.category] || '82, 183, 136'
        const hoursLeft = (new Date(l.expires_at) - Date.now()) / 3_600_000
        const radius = hoursLeft < 2 ? 80 : hoursLeft < 6 ? 60 : 44
        const intensity = hoursLeft < 2 ? 0.80 : 0.55
        const g = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
        g.addColorStop(0, `rgba(${rgb}, ${intensity})`)
        g.addColorStop(0.4, `rgba(${rgb}, ${intensity * 0.45})`)
        g.addColorStop(1, `rgba(${rgb}, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    draw()
    map.on('moveend zoomend resize', draw)
    return () => {
      map.off('moveend zoomend resize', draw)
      if (pane.contains(canvas)) pane.removeChild(canvas)
    }
  }, [listings, map])
  return null
}

function PopupContent({ listing, onClaim, claiming }) {
  const meta = CATEGORY_META[listing.category] || CATEGORY_META.cooked
  return (
    <div className="map-popup">
      <div className="map-popup-header" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)` }}>
        <span style={{ fontSize: '20px' }}>{meta.emoji}</span>
        <div>
          <div className="map-popup-title">{listing.title}</div>
          <div className="map-popup-qty">{formatKg(listing.quantity_kg)} available</div>
        </div>
      </div>
      <div className="map-popup-body">
        <div className="map-popup-time">
          {/* Feature 1+2: Live ticking countdown in popup */}
          <LiveCountdownBadge expiresAt={listing.expires_at} />
        </div>
        <button
          className="btn-primary btn-sm"
          onClick={() => onClaim(listing.id)}
          disabled={claiming || listing.is_claimed}
        >
          {claiming ? <Spinner size={12} color="#fff" /> : ''}
          {listing.is_claimed ? 'Claimed' : 'Claim'}
        </button>
      </div>
    </div>
  )
}

const CATEGORIES = ['all', 'cooked', 'raw', 'packaged', 'bakery', 'dairy']
const MIN_SIDEBAR = 220
const MAX_SIDEBAR = 520
const DEFAULT_SIDEBAR = 300

export default function MapPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [heatmapMode, setHeatmapMode] = useState('current') // 'current' | 'predicted'
  const [forecastData, setForecastData] = useState([])
  const { t } = useLanguage()
  const [celebration, setCelebration] = useState(null)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR)
  const [showFeed, setShowFeed] = useState(false)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)
  const { user } = useAuth()
  const { addToast } = useToast()
  // Feature 3: global claimed state
  const { markClaimed, isClaimed } = useGlobalClaimed()

  const fetchListings = useCallback(async () => {
    try {
      const res = await listingsAPI.nearby(CHENNAI[0], CHENNAI[1], 15)
      setListings(res.data || [])
    } catch { }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchListings() }, [fetchListings])

  // Fetch forecast data for predictive heatmap
  useEffect(() => {
    if (showHeatmap && heatmapMode === 'predicted') {
      mlAPI.quickForecast(CHENNAI[0], CHENNAI[1])
        .then(res => {
          const forecasts = res.data?.forecasts || []
          // Generate predicted points around Chennai
          const points = forecasts.flatMap(f => {
            const count = Math.ceil((f.predicted_surplus_kg || 10) / 5)
            return Array.from({ length: count }, () => ({
              lat: CHENNAI[0] + (Math.random() - 0.5) * 0.08,
              lng: CHENNAI[1] + (Math.random() - 0.5) * 0.08,
              category: f.category || 'cooked',
              expires_at: new Date(Date.now() + 3600_000 * 3).toISOString(),
              predicted: true,
            }))
          })
          setForecastData(points)
        })
        .catch(() => setForecastData([]))
    }
  }, [showHeatmap, heatmapMode])

  // ── Resizable sidebar drag logic ───────────────────────────────
  const onMouseDown = useCallback((e) => {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return
      const delta = e.clientX - dragStartX.current
      const newWidth = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, dragStartWidth.current + delta))
      setSidebarWidth(newWidth)
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const handleClaim = async (listingId) => {
    if (user?.role !== 'recipient') {
      addToast('Only recipients can claim listings', 'info'); return
    }
    setClaiming(listingId)
    try {
      await claimsAPI.create(listingId)
      const claimed = listings.find(l => l.id === listingId)
      addToast('Listing claimed successfully! 🎉', 'success')
      // Feature 3: mark globally so all pages sync
      markClaimed(listingId)
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, is_claimed: true } : l))
      if (claimed) setCelebration(claimed.quantity_kg)
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to claim', 'error')
    } finally {
      setClaiming(null)
    }
  }

  const filtered = listings.filter(l => {
    if (isClaimed(l.id)) return false // Feature 3: hide globally claimed
    if (filter !== 'all' && l.category !== filter) return false
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const active = filtered.filter(l => !l.is_claimed)

  return (
    <div className="page-wrapper">
      <Navbar />
      <ImpactBanner />
      {celebration && <ClaimCelebration kgSaved={celebration} onClose={() => setCelebration(null)} />}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Resizable Sidebar ─────────────────────────────────── */}
        <div
          className="map-sidebar"
          style={{ width: `${sidebarWidth}px`, minWidth: `${MIN_SIDEBAR}px`, maxWidth: `${MAX_SIDEBAR}px`, flexShrink: 0, transition: isDragging.current ? 'none' : 'width 0.05s' }}
        >
          <div className="map-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="card-title">{t('map.nearby')}</div>
              <button
                onClick={() => setShowFeed(f => !f)}
                style={{
                  fontSize: '11px', fontWeight: 600, padding: '4px 10px',
                  borderRadius: '8px', border: '1px solid var(--border)',
                  background: showFeed ? 'var(--primary)' : 'var(--surface-alt)',
                  color: showFeed ? '#fff' : 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                {showFeed ? '📋 Listings' : '⚡ Live Feed'}
              </button>
            </div>
            <div className="text-hint" style={{ marginBottom: '12px', marginTop: '2px' }}>
              {active.length} active within 15 km
            </div>

            {!showFeed && (
              <>
                <ExpiryAlerts listings={listings} />
                <input
                  className="input"
                  placeholder={t('action.search')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ marginBottom: '12px' }}
                />
                <div className="section-label">Category</div>
                <div className="chip-row">
                  {CATEGORIES.map(cat => {
                    const meta = cat !== 'all' ? CATEGORY_META[cat] : null
                    return (
                      <div
                        key={cat}
                        className={`chip ${filter === cat ? 'active' : ''}`}
                        style={filter === cat && meta ? { borderColor: meta.color, background: meta.bg, color: meta.text } : {}}
                        onClick={() => setFilter(cat)}
                      >
                        {cat !== 'all' ? `${meta.emoji} ` : ''}{cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <div className="map-sidebar-list">
            {/* Feature 10: Live activity feed toggle */}
            {showFeed ? (
              <LiveActivityFeed maxItems={8} />
            ) : loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : active.length === 0 ? (
              <div className="empty-state-small">
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>🌿</div>
                <div className="empty-state-title">No listings found</div>
                <div className="empty-state-desc">Try changing the category filter</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {active.slice(0, 20).map(l => {
                  const meta = CATEGORY_META[l.category] || CATEGORY_META.cooked
                  return (
                    <div key={l.id} className="listing-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                        <span className="category-badge" style={{ background: meta.bg, color: meta.text }}>
                          {meta.emoji} {l.category}
                        </span>
                      </div>
                      <div className="listing-card-title">{l.title}</div>
                      <div className="listing-card-meta">
                        <span>{formatKg(l.quantity_kg)}</span>
                        {/* Feature 1+2: Live ticking countdown */}
                        <LiveCountdownBadge expiresAt={l.expires_at} />
                      </div>
                      {user?.role === 'recipient' && (
                        <button className="btn-primary btn-sm btn-full" onClick={() => handleClaim(l.id)} disabled={claiming === l.id}>
                          {claiming === l.id ? <Spinner size={12} color="#fff" /> : null}
                          Claim
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Drag Handle ───────────────────────────────────────── */}
        <div
          onMouseDown={onMouseDown}
          style={{
            width: '5px',
            background: 'var(--border)',
            cursor: 'col-resize',
            flexShrink: 0,
            position: 'relative',
            transition: 'background 0.15s',
            zIndex: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary)'}
          onMouseLeave={e => { if (!isDragging.current) e.currentTarget.style.background = 'var(--border)' }}
          title="Drag to resize sidebar"
        >
          {/* Grip dots */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            display: 'flex', flexDirection: 'column', gap: '3px',
          }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-hint)' }} />
            ))}
          </div>
        </div>

        {/* ── Map ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <AutoRefresh onRefresh={fetchListings} />
          <MapContainer center={CHENNAI} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {showHeatmap && heatmapMode === 'current' && <HeatmapOverlay listings={filtered.filter(l => !l.is_claimed)} />}
            {showHeatmap && heatmapMode === 'predicted' && forecastData.length > 0 && <HeatmapOverlay listings={forecastData} />}
            {!showHeatmap && filtered.map(l => {
              const meta = CATEGORY_META[l.category] || CATEGORY_META.cooked
              const icon = createPinIcon(meta.emoji, l.is_claimed ? '#9CA3AF' : meta.color)
              return (
                <Marker key={l.id} position={[l.lat, l.lng]} icon={icon}>
                  <Popup>
                    <PopupContent listing={l} onClaim={handleClaim} claiming={claiming === l.id} />
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>

          {/* Heatmap toggle */}
          <div className="map-overlay-btn" style={{ top: '12px', right: '12px' }}>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              style={{
                background: showHeatmap ? 'var(--primary)' : 'var(--surface)',
                color: showHeatmap ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)', cursor: 'pointer',
                padding: '8px 14px', borderRadius: '10px',
                fontSize: '12px', fontWeight: 600,
                boxShadow: 'var(--shadow)', backdropFilter: 'blur(8px)',
              }}
            >
              {showHeatmap ? '📍 Pin View' : '🔥 Heatmap'}
            </button>
            {showHeatmap && (
              <button
                onClick={() => setHeatmapMode(m => m === 'current' ? 'predicted' : 'current')}
                style={{
                  background: heatmapMode === 'predicted' ? '#6366F1' : 'var(--surface)',
                  color: heatmapMode === 'predicted' ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  padding: '8px 14px', borderRadius: '10px',
                  fontSize: '12px', fontWeight: 600, marginTop: '6px',
                  boxShadow: 'var(--shadow)', backdropFilter: 'blur(8px)',
                }}
              >
                {heatmapMode === 'predicted' ? '📊 Current' : '🤖 Predicted'}
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="map-legend">
            <div className="section-label" style={{ marginBottom: '8px' }}>
              {showHeatmap ? 'Heatmap Colors' : 'Legend'}
            </div>
            {Object.entries(CATEGORY_META).map(([cat, meta]) => (
              <div key={cat} className="legend-item">
                <div className="legend-dot" style={{ background: meta.color }} />
                {meta.emoji} {meta.label}
              </div>
            ))}
            {!showHeatmap && (
              <div className="legend-item" style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                <div className="legend-dot" style={{ background: '#9CA3AF' }} />
                Claimed
              </div>
            )}
          </div>

          <div className="map-refresh-indicator">
            <div className="live-dot" />
            Auto-refreshes every 30s
          </div>

          {/* Sidebar width indicator (shows while resizing) */}
          {isDragging.current && (
            <div style={{
              position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
              background: 'var(--primary)', color: '#fff', borderRadius: '8px',
              padding: '4px 10px', fontSize: '11px', fontWeight: 600,
            }}>
              {sidebarWidth}px
            </div>
          )}
        </div>
      </div>
    </div>
  )
}