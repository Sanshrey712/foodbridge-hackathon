import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import Navbar from '../components/Navbar'
import ImpactBanner from '../components/ImpactBanner'
import { mlAPI } from '../utils/api'
import { CATEGORY_META } from '../utils/helpers'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Skeleton'

const CHENNAI = { lat: 12.9716, lng: 80.2209 }
const CATS    = ['cooked', 'raw', 'packaged', 'bakery', 'dairy']

const CAT_COLORS = {
  cooked:   '#2D6A4F',
  raw:      '#10B981',
  packaged: '#6366F1',
  bakery:   '#F4A261',
  dairy:    '#0EA5E9',
}

const PEAK_TIMES = [
  { time: '7:00 AM',  desc: 'Breakfast surplus',    cat: 'cooked' },
  { time: '8:00 AM',  desc: 'Bakery end-of-morning', cat: 'bakery' },
  { time: '1:00 PM',  desc: 'Lunch overflow',        cat: 'cooked' },
  { time: '7:00 PM',  desc: 'Dinner surplus',        cat: 'cooked' },
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map(p => {
        const meta = CATEGORY_META[p.dataKey]
        return (
          <div key={p.dataKey} className="chart-tooltip-item">
            <div className="legend-dot" style={{ background: p.color }} />
            <span>{meta?.emoji} {p.dataKey}</span>
            <span className="chart-tooltip-value">
              {Number(p.value).toFixed(1)} kg
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ForecastPage() {
  const [chartData, setChartData]   = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [hours, setHours]           = useState(12)
  const [visibleCats, setVisibleCats] = useState(new Set(CATS))
  const { addToast } = useToast()

  const fetchForecast = useCallback(async () => {
    setLoading(true)
    try {
      const [forecastRes, quickRes] = await Promise.all([
        mlAPI.forecast(CHENNAI.lat, CHENNAI.lng, hours),
        mlAPI.quickForecast(CHENNAI.lat, CHENNAI.lng),
      ])

      const rows = forecastRes.data || []
      const pivot = {}
      rows.forEach(r => {
        if (!pivot[r.hour]) pivot[r.hour] = { hour: r.hour }
        pivot[r.hour][r.category] = r.forecast_kg
      })
      setChartData(Object.values(pivot))
      setSummary(quickRes.data?.next_6_hours_kg || null)
    } catch {
      addToast('Could not load forecast. Is the ML server running?', 'error')
    } finally {
      setLoading(false)
    }
  }, [hours])

  useEffect(() => { fetchForecast() }, [fetchForecast])

  useEffect(() => {
    const id = setInterval(fetchForecast, 3_600_000)
    return () => clearInterval(id)
  }, [fetchForecast])

  const toggleCat = cat => {
    setVisibleCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const totalKg = summary
    ? Object.values(summary).reduce((a, b) => a + b, 0).toFixed(1)
    : null

  return (
    <div className="page-wrapper">
      <Navbar />
      <ImpactBanner />
      <div className="page-content page-enter">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="page-header">
            <div>
              <h1 className="page-title">Demand Forecast</h1>
              <p className="page-subtitle">Predicted food surplus availability near Chennai for the next {hours} hours.</p>
            </div>
            <div className="text-hint" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {loading ? <Spinner size={12} /> : null}
              ML model · refreshes hourly
            </div>
          </div>

          {/* Summary cards */}
          <div className="forecast-summary-grid">
            {CATS.map(cat => {
              const meta = CATEGORY_META[cat]
              const kg = summary?.[cat]?.toFixed(1) ?? '—'
              return (
                <div
                  key={cat}
                  className={`forecast-card ${visibleCats.has(cat) ? 'active' : ''}`}
                  onClick={() => toggleCat(cat)}
                  style={{ borderTopColor: visibleCats.has(cat) ? meta.color : 'var(--border)' }}
                >
                  {loading ? (
                    <>
                      <div className="skeleton" style={{ width: '50px', height: '22px', marginBottom: '6px' }} />
                      <div className="skeleton" style={{ width: '70px', height: '14px' }} />
                    </>
                  ) : (
                    <>
                      <div className="forecast-card-value" style={{ color: meta.color }}>{kg} kg</div>
                      <div className="forecast-card-label">{meta.emoji} {meta.label}</div>
                      <div className="forecast-card-sub">expected next 6h</div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            {/* Main chart */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="card-title">Surplus by Hour — Next {hours}h</div>
                <div className="chip-row">
                  {[6, 12, 24].map(h => (
                    <div
                      key={h}
                      className={`chip ${hours === h ? 'active' : ''}`}
                      onClick={() => setHours(h)}
                    >
                      {h}h
                    </div>
                  ))}
                </div>
              </div>

              {loading ? (
                <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Spinner size={28} />
                    <div className="text-muted" style={{ marginTop: '12px' }}>Loading forecast...</div>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 11, fill: 'var(--text-hint)' }}
                      tickLine={false} axisLine={{ stroke: 'var(--border)' }}
                      interval={Math.floor(chartData.length / 6)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-hint)' }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => `${v}kg`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {CATS.filter(c => visibleCats.has(c)).map(cat => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={CAT_COLORS[cat]}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}

              <div className="chart-legend">
                {CATS.map(cat => {
                  const meta = CATEGORY_META[cat]
                  return (
                    <div
                      key={cat}
                      className="chart-legend-item"
                      onClick={() => toggleCat(cat)}
                      style={{ opacity: visibleCats.has(cat) ? 1 : 0.4 }}
                    >
                      <div className="legend-line" style={{ background: visibleCats.has(cat) ? CAT_COLORS[cat] : 'var(--border)' }} />
                      {meta.emoji} {meta.label}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card">
                <div className="card-title" style={{ marginBottom: '14px' }}>Peak Surplus Times</div>
                {PEAK_TIMES.map((p, i) => {
                  const meta = CATEGORY_META[p.cat]
                  return (
                    <div key={i} className="peak-time-item" style={{
                      borderBottom: i < PEAK_TIMES.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div className="peak-time-badge">{p.time}</div>
                      <div>
                        <div className="peak-time-desc">{p.desc}</div>
                        <span className="category-badge-sm" style={{ background: meta.bg, color: meta.text }}>
                          {meta.emoji} {meta.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="gradient-card">
                <div className="gradient-card-label">Total expected next 6h</div>
                {loading ? (
                  <div className="skeleton" style={{ width: '80px', height: '40px', background: 'rgba(255,255,255,0.2)' }} />
                ) : (
                  <div className="gradient-card-value">{totalKg ?? '—'} kg</div>
                )}
                <div className="gradient-card-sub">across all 5 categories</div>
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: '10px' }}>About this Forecast</div>
                <div className="text-muted" style={{ fontSize: '12px', lineHeight: 1.6 }}>
                  Powered by a <strong>Random Forest model</strong> trained on real Chennai claim history.
                  Predicts food surplus availability by category, hour, and location.
                </div>
                <div className="text-hint" style={{ marginTop: '10px', fontSize: '11px' }}>
                  MAE: ~7.4 kg · Trained on {'>'}100 historical claims · Refreshes hourly
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
