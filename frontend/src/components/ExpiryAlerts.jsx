import React from 'react'

export default function ExpiryAlerts({ listings, onClaim }) {
  if (!listings || listings.length === 0) return null

  const now = new Date()
  const urgent = listings.filter(l => {
    if (l.is_claimed) return false
    const exp = new Date(l.expires_at)
    const minLeft = (exp - now) / 1000 / 60
    return minLeft > 0 && minLeft < 60
  })

  if (urgent.length === 0) return null

  return (
    <div className="expiry-alert">
      <div className="expiry-alert-pulse" />
      <div className="expiry-alert-content">
        <span className="expiry-alert-icon">⚡</span>
        <span className="expiry-alert-text">
          <strong>{urgent.length} listing{urgent.length > 1 ? 's' : ''}</strong> expiring in under 60 minutes near you!
        </span>
        <button
          className="expiry-alert-btn"
          onClick={() => {
            const el = document.querySelector('.leaflet-container')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }}
        >
          View on Map
        </button>
      </div>
    </div>
  )
}
