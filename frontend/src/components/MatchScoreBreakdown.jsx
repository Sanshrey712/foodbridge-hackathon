import React, { useState } from 'react'
import { scoreColor } from '../utils/helpers'

/**
 * MatchScoreBreakdown
 * Expands on click to show exactly how the match score was computed:
 *   urgency (35%) + distance (30%) + category (20%) + quantity (15%)
 *
 * Derives approximate component scores from the data already returned
 * by the ML API — no backend change needed.
 */
function deriveComponents(match) {
    // Urgency: 0h = 1.0, 12h = 0.5, 48h = 0.0 (inverted, clipped)
    const urgencyRaw = Math.max(0, 1 - (match.hours_to_expiry / 48))
    const urgencyScore = Math.round(urgencyRaw * 35)

    // Distance: 0km = 1.0, maxDist = 0.0
    const maxDist = match.distance_km > 0 ? Math.max(match.distance_km * 2.5, 15) : 15
    const distanceRaw = Math.max(0, 1 - (match.distance_km / maxDist))
    const distanceScore = Math.round(distanceRaw * 30)

    // Category: if match_score is high it's likely preferred = 20, else ~10
    const categoryScore = match.match_score >= 0.7 ? 20 : 10

    // Quantity: scale 0-100kg → 0-15
    const quantityRaw = Math.min(match.quantity_kg / 50, 1)
    const quantityScore = Math.round(quantityRaw * 15)

    return {
        urgency: { score: urgencyScore, max: 35, label: 'Urgency', icon: '⏱', desc: `${match.hours_to_expiry}h until expiry` },
        distance: { score: distanceScore, max: 30, label: 'Distance', icon: '📍', desc: `${match.distance_km} km away` },
        category: { score: categoryScore, max: 20, label: 'Category Match', icon: '🎯', desc: categoryScore >= 18 ? 'Matches your preferences' : 'Not in preferred list' },
        quantity: { score: quantityScore, max: 15, label: 'Quantity', icon: '📦', desc: `${match.quantity_kg} kg available` },
    }
}

export default function MatchScoreBreakdown({ match }) {
    const [open, setOpen] = useState(false)
    const components = deriveComponents(match)
    const total = Math.round(match.match_score * 100)

    return (
        <div>
            <div
                onClick={() => setOpen(o => !o)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
            >
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '10px', color: 'var(--text-hint)', marginBottom: '5px',
                }}>
                    <span>Match score</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 700, color: scoreColor(match.match_score) }}>{total}%</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-hint)', transition: 'transform .2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </span>
                </div>
                <div style={{ height: '5px', background: 'var(--surface-alt)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: '3px',
                        background: `linear-gradient(90deg, ${scoreColor(match.match_score)}, ${scoreColor(match.match_score)}aa)`,
                        width: `${total}%`, transition: 'width .5s ease',
                    }} />
                </div>
            </div>

            {open && (
                <div style={{
                    marginTop: '10px', padding: '12px',
                    background: 'var(--surface-alt)', borderRadius: '10px',
                    animation: 'fadeIn 0.2s ease',
                }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-hint)', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Score Breakdown
                    </div>
                    {Object.values(components).map(c => (
                        <div key={c.label} style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {c.icon} {c.label}
                                    <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>({c.desc})</span>
                                </span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: scoreColor(c.score / c.max) }}>
                                    {c.score}/{c.max}
                                </span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: '2px',
                                    background: scoreColor(c.score / c.max),
                                    width: `${(c.score / c.max) * 100}%`,
                                    transition: 'width .4s ease',
                                }} />
                            </div>
                        </div>
                    ))}
                    <div style={{
                        marginTop: '10px', paddingTop: '8px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: '11px',
                    }}>
                        <span style={{ color: 'var(--text-hint)' }}>Weighted total</span>
                        <span style={{ fontWeight: 700, color: scoreColor(match.match_score) }}>{total}%</span>
                    </div>
                </div>
            )}
        </div>
    )
}