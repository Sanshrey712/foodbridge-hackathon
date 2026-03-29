import React, { useState, useEffect, useCallback, useRef } from 'react'

/**
 * ConfettiCelebration — full-screen confetti explosion + Impact Certificate
 * Props:
 *   show (bool)     — trigger the celebration
 *   onClose (fn)    — called when the user dismisses
 *   kgSaved (num)   — quantity of food saved
 *   foodTitle (str) — name of the food item
 *   category (str)  — food category
 */

const COLORS = ['#2D6A4F', '#52B788', '#F4A261', '#E76F51', '#0EA5E9', '#6366F1', '#EC4899', '#FBBF24']

function randomBetween(a, b) { return a + Math.random() * (b - a) }

function Particle({ color, delay }) {
  const style = {
    position: 'absolute',
    width: `${randomBetween(6, 12)}px`,
    height: `${randomBetween(4, 8)}px`,
    background: color,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    left: `${randomBetween(5, 95)}%`,
    top: '-10px',
    opacity: 0,
    animation: `confettiFall ${randomBetween(2, 4)}s ease-in ${delay}s forwards`,
    transform: `rotate(${randomBetween(0, 360)}deg)`,
  }
  return <div style={style} />
}

export default function ConfettiCelebration({ show, onClose, kgSaved = 5, foodTitle = 'Food', category = 'cooked' }) {
  const [visible, setVisible] = useState(false)
  const [particles, setParticles] = useState([])
  const [certVisible, setCertVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)
      // Generate particles
      const p = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        color: COLORS[i % COLORS.length],
        delay: randomBetween(0, 0.6),
      }))
      setParticles(p)
      // Show certificate after confetti starts
      setTimeout(() => setCertVisible(true), 800)
    } else {
      setVisible(false)
      setCertVisible(false)
      setParticles([])
    }
  }, [show])

  const handleClose = () => {
    setCertVisible(false)
    setTimeout(() => {
      setVisible(false)
      onClose?.()
    }, 300)
  }

  const co2 = (kgSaved * 0.45).toFixed(1)
  const meals = Math.round(kgSaved * 4)
  const trees = (kgSaved * 0.45 / 0.022).toFixed(0)
  const certDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const certTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const certId = `FB-${Date.now().toString(36).toUpperCase()}`

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Confetti */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {particles.map(p => <Particle key={p.id} color={p.color} delay={p.delay} />)}
      </div>

      {/* Impact Certificate */}
      {certVisible && (
        <div style={{
          position: 'relative', maxWidth: '480px', width: '90%',
          animation: 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #fff 0%, #F0FFF4 50%, #E0F2FE 100%)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.3), 0 0 0 2px rgba(45,106,79,0.2)',
            textAlign: 'center',
          }}>
            {/* Badge */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #2D6A4F, #52B788)',
              margin: '-68px auto 16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(45,106,79,0.4)',
              fontSize: '32px',
            }}>
              🏆
            </div>

            <div style={{ fontSize: '11px', fontWeight: 700, color: '#2D6A4F', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '4px' }}>
              Green Impact Certificate
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#1B4332', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>
              🎉 Food Rescued!
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
              You just saved <strong>{kgSaved} kg</strong> of <strong>{foodTitle}</strong> from going to waste
            </div>

            {/* Impact stats grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
              marginBottom: '20px',
            }}>
              {[
                { icon: '🌱', value: co2, unit: 'kg', label: 'CO₂ Prevented', color: '#2D6A4F' },
                { icon: '🍽️', value: meals, unit: '', label: 'Meals Served', color: '#0369A1' },
                { icon: '🌳', value: trees, unit: 'd', label: 'Tree Days', color: '#10B981' },
              ].map(s => (
                <div key={s.label} style={{
                  background: `${s.color}11`, borderRadius: '14px', padding: '14px 8px',
                  border: `1px solid ${s.color}22`,
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>
                    {s.value}{s.unit}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Certificate footer */}
            <div style={{
              background: '#F9FAFB', borderRadius: '12px', padding: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '10px', color: '#9CA3AF',
            }}>
              <span>ID: {certId}</span>
              <span>{certDate} · {certTime}</span>
              <span>🌿 FoodBridge</span>
            </div>

            <button
              onClick={handleClose}
              style={{
                marginTop: '20px', padding: '12px 32px',
                background: 'linear-gradient(135deg, #2D6A4F, #52B788)',
                color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(45,106,79,0.3)',
                transition: 'all .15s', fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            >
              Continue Saving 🌍
            </button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
        @keyframes slideUp {
          0%   { opacity: 0; transform: translateY(40px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
