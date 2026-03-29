/**
 * Feature 6: Smart Expiry Recommendations
 * Auto-suggests the right expiry hours when donor picks a category.
 * Also shows a tooltip with the reasoning.
 */

export const EXPIRY_SUGGESTIONS = {
    cooked: { hours: 4, label: '4 hours', reason: 'Cooked food claims fastest — 80% claimed within 2h during meal peaks' },
    bakery: { hours: 8, label: '8 hours', reason: 'Bakery items stay fresh for 8-12h — morning batches last until evening' },
    raw: { hours: 24, label: '24 hours', reason: 'Raw produce lasts a day — recipients can plan pickups in advance' },
    dairy: { hours: 12, label: '12 hours', reason: 'Dairy has a moderate shelf life — gives enough time for same-day pickup' },
    packaged: { hours: 48, label: '48 hours', reason: 'Packaged goods have long shelf life — 48h lets recipients plan ahead' },
}

import React, { useState } from 'react'

export default function SmartExpiryInput({ category, value, onChange }) {
    const [showTip, setShowTip] = useState(false)
    const suggestion = EXPIRY_SUGGESTIONS[category]

    const applySuggestion = () => {
        onChange(String(suggestion.hours))
    }

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    className="input"
                    type="number" min="1" max="168"
                    placeholder={`e.g. ${suggestion?.hours || 8}`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{ flex: 1 }}
                />
                {suggestion && (
                    <button
                        type="button"
                        onClick={applySuggestion}
                        onMouseEnter={() => setShowTip(true)}
                        onMouseLeave={() => setShowTip(false)}
                        style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid var(--primary)',
                            background: 'var(--primary-soft)',
                            color: 'var(--primary)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all .15s',
                        }}
                    >
                        ⚡ {suggestion.label}
                    </button>
                )}
            </div>
            {showTip && suggestion && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    background: 'var(--surface-solid)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    boxShadow: 'var(--shadow)',
                    zIndex: 100,
                    maxWidth: '260px',
                    lineHeight: 1.5,
                }}>
                    💡 {suggestion.reason}
                </div>
            )}
        </div>
    )
}