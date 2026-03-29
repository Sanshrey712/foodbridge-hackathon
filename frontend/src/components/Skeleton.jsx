import React from 'react'

export function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border-soft)',
      borderRadius: '14px', padding: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div className="skeleton" style={{ width: '60px', height: '22px' }} />
        <div className="skeleton" style={{ width: '36px', height: '22px' }} />
      </div>
      <div className="skeleton" style={{ width: '80%', height: '18px', marginBottom: '6px' }} />
      <div className="skeleton" style={{ width: '55%', height: '14px', marginBottom: '14px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {[0,1,2].map(i => (
          <div key={i} className="skeleton" style={{ height: '36px', borderRadius: '8px' }} />
        ))}
      </div>
      <div className="skeleton" style={{ width: '100%', height: '36px', borderRadius: '10px' }} />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <tr>
      {[140, 80, 60, 60, 80, 50].map((w, i) => (
        <td key={i} style={{ padding: '12px' }}>
          <div className="skeleton" style={{ width: `${w}px`, height: '16px' }} />
        </td>
      ))}
    </tr>
  )
}

export function Spinner({ size = 20, color = 'var(--green)' }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid ${color}20`,
      borderTop: `2px solid ${color}`, borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
