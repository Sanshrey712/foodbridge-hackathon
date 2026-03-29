import React from 'react'
import { CATEGORY_META, formatKg } from '../utils/helpers'

/**
 * ImpactTimeline — vertical timeline of all claimed + picked-up food.
 * Shows kg saved, meals, CO₂ per claim with cumulative totals.
 */
export default function ImpactTimeline({ claims, details }) {
    const pickedUp = claims
        .filter(c => c.picked_up)
        .sort((a, b) => new Date(b.picked_up_at) - new Date(a.picked_up_at))

    if (!pickedUp.length) return (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌱</div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>Your impact journey starts here</div>
            <div style={{ fontSize: '13px' }}>Claim and pick up food to see your personal impact timeline.</div>
        </div>
    )

    // Cumulative totals
    let cumKg = 0
    const withCumulative = pickedUp.map(c => {
        const listing = details[c.listing_id]
        const kg = listing?.quantity_kg || 0
        cumKg += kg
        return { ...c, listing, kg, cumKg: cumKg - kg }
    }).reverse() // show oldest first for cumulative effect

    const totalKg = pickedUp.reduce((s, c) => s + (details[c.listing_id]?.quantity_kg || 0), 0)
    const totalMeals = Math.round(totalKg * 4)
    const totalCO2 = (totalKg * 0.5).toFixed(1)

    return (
        <div>
            {/* Summary header */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
                borderRadius: '16px', padding: '24px', marginBottom: '28px',
                display: 'flex', gap: '24px', flexWrap: 'wrap',
            }}>
                {[
                    { icon: '🥗', value: `${totalKg.toFixed(1)} kg`, label: 'Total Food Saved' },
                    { icon: '🍽️', value: totalMeals.toLocaleString(), label: 'Meals Provided' },
                    { icon: '🌱', value: `${totalCO2} kg`, label: 'CO₂ Prevented' },
                    { icon: '📦', value: pickedUp.length, label: 'Pickups Completed' },
                ].map(s => (
                    <div key={s.label} style={{ flex: 1, minWidth: '100px', textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: '#A7F3D0' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
                {/* Vertical line */}
                <div style={{
                    position: 'absolute', left: '11px', top: '8px',
                    bottom: '8px', width: '2px',
                    background: 'linear-gradient(to bottom, var(--primary), var(--border))',
                    borderRadius: '2px',
                }} />

                {withCumulative.reverse().map((item, idx) => {
                    const listing = item.listing
                    if (!listing) return null
                    const meta = CATEGORY_META[listing.category] || CATEGORY_META.cooked
                    const kg = item.kg
                    const meals = Math.round(kg * 4)
                    const co2 = (kg * 0.5).toFixed(1)
                    const date = new Date(item.picked_up_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })
                    const cumulative = item.cumKg + kg

                    return (
                        <div key={item.id} style={{
                            position: 'relative',
                            marginBottom: idx < withCumulative.length - 1 ? '24px' : '0',
                            animation: `fadeIn 0.4s ease ${idx * 60}ms both`,
                        }}>
                            {/* Timeline dot */}
                            <div style={{
                                position: 'absolute', left: '-28px', top: '12px',
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: meta.color,
                                border: '3px solid var(--bg)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '9px',
                                boxShadow: `0 0 0 2px ${meta.color}44`,
                            }}>
                                {meta.emoji}
                            </div>

                            <div className="card" style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                                                {listing.title}
                                            </span>
                                            <span className="category-badge" style={{ background: meta.bg, color: meta.text, fontSize: '10px' }}>
                                                {meta.emoji} {listing.category}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '10px' }}>
                                            Picked up {date}
                                        </div>

                                        {/* Impact micro-stats */}
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                            {[
                                                { icon: '🥗', val: formatKg(kg), label: 'saved' },
                                                { icon: '🍽️', val: `${meals}`, label: 'meals' },
                                                { icon: '🌱', val: `${co2}kg`, label: 'CO₂' },
                                            ].map(s => (
                                                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ fontSize: '13px' }}>{s.icon}</span>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{s.val}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{s.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Running cumulative */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-hint)', marginBottom: '2px' }}>
                                            cumulative
                                        </div>
                                        <div style={{
                                            fontSize: '16px', fontWeight: 700, color: 'var(--primary)',
                                            fontFamily: 'var(--font-display)',
                                        }}>
                                            {cumulative.toFixed(1)} kg
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}