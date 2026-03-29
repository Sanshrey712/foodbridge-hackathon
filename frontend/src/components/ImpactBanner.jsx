import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'

function AnimatedNumber({ target, duration = 1500 }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    tick()
  }, [target, duration])
  return <>{value.toLocaleString()}</>
}

export default function ImpactBanner() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/impact/stats')
      .then(res => setStats(res.data))
      .catch(() => {
        // Fallback demo data if endpoint isn't running
        setStats({ kg_saved: 412, meals_served: 1648, co2_prevented_kg: 206 })
      })
  }, [])

  if (!stats) return null

  const items = [
    { icon: '🥗', value: stats.kg_saved, unit: 'kg', label: 'Food Saved' },
    { icon: '🍽️', value: stats.meals_served, unit: '', label: 'Meals Served' },
    { icon: '🌱', value: stats.co2_prevented_kg, unit: 'kg', label: 'CO₂ Prevented' },
  ]

  return (
    <div className="impact-banner">
      <div className="impact-banner-inner">
        <span className="impact-banner-badge">LIVE IMPACT</span>
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <span className="impact-divider">·</span>}
            <span className="impact-stat">
              <span className="impact-icon">{item.icon}</span>
              <span className="impact-value">
                <AnimatedNumber target={item.value} />
                {item.unit && <span className="impact-unit"> {item.unit}</span>}
              </span>
              <span className="impact-label">{item.label}</span>
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
