import React from 'react'

/**
 * FoodSafetyChecker
 * Rule-based food safety assessment.
 * Checks category + time since posting to warn about potential safety issues.
 * Based on FDA / FSSAI food safety guidelines.
 */

const SAFETY_RULES = {
  cooked: {
    safe: 4,     // safe up to 4 hours
    caution: 6,  // caution between 4-6 hours
    label: 'Cooked food',
    tip: 'Should be consumed within 2h of cooking for best quality.',
  },
  dairy: {
    safe: 3,
    caution: 5,
    label: 'Dairy products',
    tip: 'Keep refrigerated. Check for off-smells before consuming.',
  },
  bakery: {
    safe: 12,
    caution: 24,
    label: 'Bakery items',
    tip: 'Best consumed same day. Check for mold.',
  },
  raw: {
    safe: 24,
    caution: 48,
    label: 'Raw / fresh produce',
    tip: 'Wash thoroughly before use. Inspect for wilting or discoloration.',
  },
  packaged: {
    safe: 72,
    caution: 168,
    label: 'Packaged food',
    tip: 'Check packaging integrity and best-before date.',
  },
}

export function getSafetyLevel(category, hoursToExpiry) {
  const rule = SAFETY_RULES[category] || SAFETY_RULES.cooked
  const hoursElapsed = rule.safe + rule.caution - hoursToExpiry // approximate

  if (hoursToExpiry > rule.safe) return 'safe'
  if (hoursToExpiry > rule.caution * 0.3) return 'caution'
  return 'warning'
}

export default function FoodSafetyBadge({ category, hoursToExpiry }) {
  const rule = SAFETY_RULES[category] || SAFETY_RULES.cooked
  let level, label, color, bg, icon

  if (hoursToExpiry > rule.safe) {
    level = 'safe'
    label = 'Safe'
    color = '#059669'
    bg = '#D1FAE5'
    icon = '✅'
  } else if (hoursToExpiry > rule.caution * 0.3) {
    level = 'caution'
    label = 'Use Soon'
    color = '#D97706'
    bg = '#FEF3C7'
    icon = '⚠️'
  } else {
    level = 'warning'
    label = 'Verify Safety'
    color = '#DC2626'
    bg = '#FEE2E2'
    icon = '🔴'
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '6px',
      background: bg,
      color,
      fontSize: '10px',
      fontWeight: 600,
    }} title={rule.tip}>
      {icon} {label}
    </div>
  )
}

/**
 * DetailedSafetyCard — shown in a modal or detailed view
 */
export function FoodSafetyCard({ category, hoursToExpiry, foodTitle }) {
  const rule = SAFETY_RULES[category] || SAFETY_RULES.cooked
  const isSafe = hoursToExpiry > rule.safe
  const isCaution = !isSafe && hoursToExpiry > rule.caution * 0.3

  const statusColor = isSafe ? '#059669' : isCaution ? '#D97706' : '#DC2626'
  const statusBg = isSafe ? '#D1FAE5' : isCaution ? '#FEF3C7' : '#FEE2E2'
  const statusIcon = isSafe ? '✅' : isCaution ? '⚠️' : '🔴'
  const statusLabel = isSafe ? 'Safe to Consume' : isCaution ? 'Use With Caution' : 'Verify Before Consuming'

  return (
    <div style={{
      background: 'var(--surface-solid)',
      border: `1px solid ${statusColor}33`,
      borderRadius: '12px',
      padding: '14px',
      fontSize: '12px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '10px',
      }}>
        <span style={{ fontSize: '16px' }}>🛡️</span>
        <span style={{ fontWeight: 700, color: 'var(--text)' }}>AI Safety Check</span>
        <span style={{
          marginLeft: 'auto',
          padding: '3px 10px', borderRadius: '8px',
          background: statusBg, color: statusColor,
          fontWeight: 700, fontSize: '11px',
        }}>
          {statusIcon} {statusLabel}
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
        marginBottom: '10px',
      }}>
        <div style={{ background: 'var(--surface-alt)', borderRadius: '8px', padding: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-hint)' }}>Category</div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{rule.label}</div>
        </div>
        <div style={{ background: 'var(--surface-alt)', borderRadius: '8px', padding: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-hint)' }}>Time Remaining</div>
          <div style={{ fontWeight: 600, color: statusColor }}>{hoursToExpiry.toFixed(1)}h</div>
        </div>
      </div>

      <div style={{
        background: `${statusColor}11`,
        borderRadius: '8px',
        padding: '8px 10px',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
      }}>
        💡 {rule.tip}
      </div>
    </div>
  )
}
