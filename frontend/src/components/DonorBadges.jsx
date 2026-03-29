import React from 'react'

/**
 * DonorBadges
 * Achievement system for donors — gamification that encourages repeat donations.
 * Badges unlock at specific thresholds.
 */

const BADGES = [
  { id: 'first',     emoji: '🌱', title: 'First Seed',     desc: 'Made your first donation',          threshold: (s) => s.total_listings >= 1 },
  { id: 'five',      emoji: '🌿', title: 'Growing Green',  desc: '5 donations posted',                threshold: (s) => s.total_listings >= 5 },
  { id: 'ten',       emoji: '🌳', title: 'Tree of Giving', desc: '10 donations posted',               threshold: (s) => s.total_listings >= 10 },
  { id: 'kg50',      emoji: '📦', title: 'Half Century',   desc: '50 kg donated',                     threshold: (s) => s.total_kg_donated >= 50 },
  { id: 'kg100',     emoji: '🏆', title: 'Century Club',   desc: '100 kg donated',                    threshold: (s) => s.total_kg_donated >= 100 },
  { id: 'claimed80', emoji: '🎯', title: 'Bullseye',       desc: '80%+ claim rate',                   threshold: (s) => s.total_listings >= 3 && (s.claimed_listings / s.total_listings) >= 0.8 },
  { id: 'streak',    emoji: '🔥', title: 'On Fire',        desc: 'All listings claimed this week',    threshold: (s) => s.total_listings >= 3 && s.claimed_listings === s.total_listings },
  { id: 'meals100',  emoji: '🍽️', title: 'Meal Maker',     desc: '100+ meals provided (25 kg)',       threshold: (s) => s.total_kg_donated >= 25 },
  { id: 'meals500',  emoji: '⭐', title: 'Star Provider',  desc: '500+ meals provided (125 kg)',      threshold: (s) => s.total_kg_donated >= 125 },
  { id: 'legend',    emoji: '👑', title: 'FoodBridge Legend', desc: '250+ kg donated',                 threshold: (s) => s.total_kg_donated >= 250 },
]

export default function DonorBadges({ stats }) {
  if (!stats) return null

  const earned = BADGES.filter(b => b.threshold(stats))
  const locked = BADGES.filter(b => !b.threshold(stats))

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '14px',
      }}>
        <span style={{ fontSize: '18px' }}>🏅</span>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
          Achievements
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600,
          background: 'var(--primary)', color: '#fff',
          borderRadius: '20px', padding: '2px 8px',
        }}>
          {earned.length}/{BADGES.length}
        </span>
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '8px',
          marginBottom: locked.length > 0 ? '12px' : 0,
        }}>
          {earned.map(b => (
            <div key={b.id} style={{
              background: 'linear-gradient(135deg, var(--surface-solid), var(--surface-alt))',
              border: '1.5px solid var(--primary)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: '0 2px 8px rgba(82,183,136,0.15)',
              animation: 'fadeIn 0.3s ease',
            }}>
              <span style={{ fontSize: '22px' }}>{b.emoji}</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{b.title}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Locked badges (dimmed) */}
      {locked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {locked.slice(0, 4).map(b => (
            <div key={b.id} style={{
              background: 'var(--surface-alt)',
              border: '1px dashed var(--border)',
              borderRadius: '10px',
              padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: '8px',
              opacity: 0.5,
            }} title={b.desc}>
              <span style={{ fontSize: '16px', filter: 'grayscale(1)' }}>{b.emoji}</span>
              <div style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{b.title}</div>
              <span style={{ fontSize: '10px' }}>🔒</span>
            </div>
          ))}
          {locked.length > 4 && (
            <div style={{
              padding: '8px 12px', fontSize: '11px',
              color: 'var(--text-hint)', fontStyle: 'italic',
            }}>
              +{locked.length - 4} more to unlock
            </div>
          )}
        </div>
      )}
    </div>
  )
}
