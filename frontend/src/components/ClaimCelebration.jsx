import React, { useEffect, useState } from 'react'

function Particle({ style }) {
  return <div className="confetti-particle" style={style} />
}

export default function ClaimCelebration({ kgSaved, onClose }) {
  const [particles, setParticles] = useState([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const colors = ['#52B788', '#F7B267', '#6366F1', '#EF4444', '#0EA5E9', '#FFD700', '#FF6B9D']
    const p = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `-${Math.random() * 20 + 5}%`,
        background: colors[Math.floor(Math.random() * colors.length)],
        width: `${Math.random() * 8 + 4}px`,
        height: `${Math.random() * 8 + 4}px`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        animationDuration: `${Math.random() * 2 + 1.5}s`,
        animationDelay: `${Math.random() * 0.5}s`,
      }
    }))
    setParticles(p)

    const timer = setTimeout(() => setVisible(false), 4500)
    const close = setTimeout(() => onClose?.(), 5000)
    return () => { clearTimeout(timer); clearTimeout(close) }
  }, [])

  if (!visible) return null

  const meals = Math.round(kgSaved * 4)

  return (
    <div className="celebration-overlay" onClick={() => { setVisible(false); onClose?.() }}>
      {particles.map(p => <Particle key={p.id} style={p.style} />)}
      <div className="celebration-card">
        <div className="celebration-emoji">🎉</div>
        <div className="celebration-title">Amazing Impact!</div>
        <div className="celebration-stats">
          <div className="celebration-stat">
            <span className="celebration-stat-value">{kgSaved} kg</span>
            <span className="celebration-stat-label">Food Saved</span>
          </div>
          <div className="celebration-stat-divider" />
          <div className="celebration-stat">
            <span className="celebration-stat-value">{meals}</span>
            <span className="celebration-stat-label">Meals Provided</span>
          </div>
          <div className="celebration-stat-divider" />
          <div className="celebration-stat">
            <span className="celebration-stat-value">{(kgSaved * 0.5).toFixed(1)} kg</span>
            <span className="celebration-stat-label">CO₂ Prevented</span>
          </div>
        </div>
        <div className="celebration-message">
          You're making Chennai a better place! 🌿
        </div>
      </div>
    </div>
  )
}
