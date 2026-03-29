import React, { useState, useEffect } from 'react'

/**
 * CO2Calculator
 * Interactive food waste CO₂ impact calculator.
 * EcoTech track differentiator — shows real environmental impact.
 *
 * Science: 1 kg food waste = ~2.5 kg CO₂e (IPCC / WRAP data)
 *          1 kg saved food  = ~0.5 kg CO₂ prevented (conservative)
 *          1 meal            = ~0.25 kg CO₂e production saved
 *
 * Usage: <CO2Calculator /> — standalone widget, works anywhere.
 * Also exported as a hook: useCO2Stats(kg) → { meals, co2, trees, cars }
 */

const CATEGORY_CO2 = {
    cooked: { factor: 0.45, label: 'Cooked Meals', emoji: '🍛', color: '#2D6A4F' },
    raw: { factor: 0.35, label: 'Raw Produce', emoji: '🥕', color: '#10B981' },
    packaged: { factor: 0.60, label: 'Packaged Food', emoji: '📦', color: '#6366F1' },
    bakery: { factor: 0.40, label: 'Bakery', emoji: '🍞', color: '#F4A261' },
    dairy: { factor: 0.80, label: 'Dairy', emoji: '🥛', color: '#0EA5E9' },
}

export function useCO2Stats(kg, category = 'cooked') {
    const factor = CATEGORY_CO2[category]?.factor || 0.5
    const co2Kg = +(kg * factor).toFixed(2)
    const meals = Math.round(kg * 4)
    const treeDays = +(co2Kg / 0.022).toFixed(1) // avg tree absorbs 22g CO₂/day
    const carKm = +(co2Kg / 0.21).toFixed(1)     // avg car emits 210g/km
    const waterL = +(kg * 250).toFixed(0)          // 250L water per kg food
    return { co2Kg, meals, treeDays, carKm, waterL }
}

function AnimBar({ value, max, color, duration = 1000 }) {
    const [width, setWidth] = useState(0)
    useEffect(() => {
        const t = setTimeout(() => setWidth((value / max) * 100), 100)
        return () => clearTimeout(t)
    }, [value, max])
    return (
        <div style={{ height: '6px', background: 'var(--surface-alt)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
                height: '100%', borderRadius: '3px',
                background: color,
                width: `${Math.min(width, 100)}%`,
                transition: `width ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
            }} />
        </div>
    )
}

function CountUp({ target, decimals = 0, duration = 800, suffix = '' }) {
    const [val, setVal] = useState(0)
    useEffect(() => {
        const start = Date.now()
        const tick = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = target * eased
            setVal(decimals ? +current.toFixed(decimals) : Math.round(current))
            if (progress < 1) requestAnimationFrame(tick)
        }
        tick()
    }, [target])
    return <>{decimals ? val.toFixed(decimals) : val.toLocaleString()}{suffix}</>
}

export default function CO2Calculator({ initialKg = 10, compact = false }) {
    const [kg, setKg] = useState(initialKg)
    const [category, setCategory] = useState('cooked')
    const [showBreakdown, setShowBreakdown] = useState(false)
    const stats = useCO2Stats(kg, category)

    if (compact) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, #0a2e1a, #1B4332)',
                borderRadius: '16px',
                padding: '20px',
                color: '#fff',
            }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#A7F3D0', marginBottom: '12px' }}>
                    🌍 Impact if you donate this food
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                        { icon: '🌱', val: stats.co2Kg, unit: 'kg', label: 'CO₂ prevented', decimals: 1 },
                        { icon: '🍽️', val: stats.meals, unit: '', label: 'meals provided', decimals: 0 },
                        { icon: '🌳', val: stats.treeDays, unit: 'd', label: 'tree-equivalent', decimals: 0 },
                        { icon: '🚗', val: stats.carKm, unit: 'km', label: 'car travel saved', decimals: 0 },
                    ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', marginBottom: '2px' }}>{s.icon}</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                                <CountUp target={s.val} decimals={s.decimals} />{s.unit}
                            </div>
                            <div style={{ fontSize: '10px', color: '#A7F3D0' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}>
                <div style={{ fontSize: '28px' }}>🌍</div>
                <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                        Food Waste CO₂ Calculator
                    </div>
                    <div style={{ fontSize: '12px', color: '#A7F3D0' }}>
                        See the real environmental impact of every donation
                    </div>
                </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
                {/* Input row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Quantity (kg)
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => setKg(k => Math.max(0.5, +(k - 1).toFixed(1)))} style={btnStyle}>−</button>
                            <input
                                type="number" min="0.1" max="500" step="0.5"
                                value={kg}
                                onChange={e => setKg(Math.max(0.1, parseFloat(e.target.value) || 0))}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '10px',
                                    border: '1.5px solid var(--border)', background: 'var(--surface-alt)',
                                    fontSize: '18px', fontWeight: 700, textAlign: 'center',
                                    color: 'var(--text)', fontFamily: 'var(--font-display)',
                                    outline: 'none',
                                }}
                            />
                            <button onClick={() => setKg(k => +(k + 1).toFixed(1))} style={btnStyle}>+</button>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Food Category
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Object.entries(CATEGORY_CO2).map(([cat, meta]) => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    style={{
                                        padding: '5px 10px', borderRadius: '20px',
                                        border: `1.5px solid ${category === cat ? meta.color : 'transparent'}`,
                                        background: category === cat ? `${meta.color}22` : 'var(--surface-alt)',
                                        color: category === cat ? meta.color : 'var(--text-muted)',
                                        fontSize: '11px', fontWeight: category === cat ? 700 : 400,
                                        cursor: 'pointer', transition: 'all .15s',
                                        fontFamily: 'var(--font-body)',
                                    }}
                                >
                                    {meta.emoji} {meta.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[
                        { icon: '🌱', val: stats.co2Kg, unit: 'kg CO₂', label: 'Prevented', color: '#2D6A4F', decimals: 1, max: 200 },
                        { icon: '🍽️', val: stats.meals, unit: 'meals', label: 'Provided', color: '#0369A1', decimals: 0, max: 2000 },
                        { icon: '🌳', val: stats.treeDays, unit: 'days', label: 'Tree-equivalent', color: '#10B981', decimals: 0, max: 500 },
                        { icon: '🚗', val: stats.carKm, unit: 'km', label: 'Car travel saved', color: '#F4A261', decimals: 0, max: 1000 },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'var(--surface-alt)',
                            borderRadius: '14px',
                            padding: '14px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: s.color, marginBottom: '2px' }}>
                                <CountUp target={s.val} decimals={s.decimals} />
                                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '3px' }}>{s.unit}</span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-hint)', marginBottom: '8px' }}>{s.label}</div>
                            <AnimBar value={s.val} max={s.max} color={s.color} />
                        </div>
                    ))}
                </div>

                {/* Water footprint highlight */}
                <div style={{
                    background: 'var(--blue-light, #E0F2FE)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    border: '1px solid rgba(14, 165, 233, 0.2)',
                }}>
                    <span style={{ fontSize: '24px' }}>💧</span>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0369A1' }}>
                            <CountUp target={stats.waterL} /> litres of water saved
                        </div>
                        <div style={{ fontSize: '12px', color: '#0369A1', opacity: 0.8 }}>
                            That's the water used to produce {kg} kg of {CATEGORY_CO2[category]?.label?.toLowerCase()}
                        </div>
                    </div>
                </div>

                {/* Breakdown toggle */}
                <button
                    onClick={() => setShowBreakdown(b => !b)}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '12px', color: 'var(--primary)', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontFamily: 'var(--font-body)',
                        padding: 0,
                    }}
                >
                    {showBreakdown ? '▲' : '▼'} {showBreakdown ? 'Hide' : 'Show'} methodology
                </button>

                {showBreakdown && (
                    <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        background: 'var(--surface-alt)',
                        borderRadius: '10px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                        animation: 'fadeIn 0.2s ease',
                    }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>📊 Calculation Methodology</div>
                        <div>• CO₂ factor for {CATEGORY_CO2[category]?.label}: <strong>{CATEGORY_CO2[category]?.factor} kg CO₂ per kg food</strong></div>
                        <div>• Source: IPCC AR6 + WRAP UK Food Waste Reduction Report 2023</div>
                        <div>• Meals: 1 kg food = 4 standard Indian meal portions (250g each)</div>
                        <div>• Tree equivalent: average tree absorbs 22g CO₂/day</div>
                        <div>• Car travel: average petrol car emits 210g CO₂/km</div>
                        <div>• Water: FAO water footprint database for South Asian food systems</div>
                    </div>
                )}
            </div>
        </div>
    )
}

const btnStyle = {
    width: '36px', height: '36px',
    borderRadius: '8px',
    border: '1.5px solid var(--border)',
    background: 'var(--surface-alt)',
    color: 'var(--text)',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    transition: 'all .15s',
    fontFamily: 'var(--font-body)',
}