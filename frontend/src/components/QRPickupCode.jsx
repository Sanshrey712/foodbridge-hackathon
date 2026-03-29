import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

/**
 * QRPickupCode
 * Generates a unique QR code for claim verification.
 * The donor scans this QR at pickup to confirm handoff.
 */
export default function QRPickupCode({ claimId, listingTitle, quantity }) {
  const qrData = JSON.stringify({
    type: 'foodbridge_pickup',
    claim_id: claimId,
    title: listingTitle,
    kg: quantity,
    ts: Date.now(),
  })

  return (
    <div style={{
      background: 'var(--surface-solid)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '13px', fontWeight: 700, color: 'var(--primary)',
      }}>
        <span style={{ fontSize: '18px' }}>📱</span>
        Pickup Verification QR
      </div>

      <div style={{
        background: '#fff',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <QRCodeSVG
          value={qrData}
          size={140}
          bgColor="#ffffff"
          fgColor="#1B4332"
          level="M"
          includeMargin={false}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '11px', color: 'var(--text-muted)',
          maxWidth: '200px', lineHeight: 1.4,
        }}>
          Show this QR to the donor at pickup to verify your claim
        </div>
        <div style={{
          fontSize: '10px', color: 'var(--text-hint)',
          marginTop: '4px', fontFamily: 'monospace',
        }}>
          ID: {claimId?.slice(0, 8)}...
        </div>
      </div>
    </div>
  )
}
