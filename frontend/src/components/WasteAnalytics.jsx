import React, { useState, useEffect } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { donorsAPI } from '../utils/api'
import { CATEGORY_META } from '../utils/helpers'
import { Spinner } from './Skeleton'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CAT_COLORS = {
    cooked: '#2D6A4F', raw: '#10B981', packaged: '#6366F1',
    bakery: '#F4A261', dairy: '#0EA5E9',
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div style={{
            background: 'var(--surface-solid)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '10px 14px', boxShadow: 'var(--shadow)',
            fontSize: '12px',
        }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text)' }}>{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ color: p.color || 'var(--text-muted)' }}>
                    {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
                    {p.name === 'kg donated' ? ' kg' : p.name === 'claim rate' ? '%' : ''}
                </div>
            ))}
        </div>
    )
}

export default function WasteAnalytics() {
    const [stats, setStats] = useState(null)
    const [listings, setListings] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const [profileRes, statsRes] = await Promise.all([
                    donorsAPI.me(), donorsAPI.stats(),
                ])
                setListings(profileRes.data.listings || [])
                setStats(statsRes.data)
            } catch { }
            finally { setLoading(false) }
        }
        load()
    }, [])

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size={28} />
        </div>
    )

    if (!listings.length) return (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Post some listings first to see analytics.
        </div>
    )

    // ── By day of week ─────────────────────────────────────────────
    const byDay = DAY_LABELS.map((day, i) => {
        const dayListings = listings.filter(l => new Date(l.created_at).getDay() === i)
        return {
            day,
            'kg donated': dayListings.reduce((s, l) => s + l.quantity_kg, 0),
            count: dayListings.length,
        }
    })

    // ── Claim rate by category ─────────────────────────────────────
    const byCat = Object.entries(
        listings.reduce((acc, l) => {
            if (!acc[l.category]) acc[l.category] = { total: 0, claimed: 0 }
            acc[l.category].total++
            if (l.is_claimed) acc[l.category].claimed++
            return acc
        }, {})
    ).map(([cat, d]) => ({
        category: cat,
        'claim rate': d.total ? Math.round(d.claimed / d.total * 100) : 0,
        fill: CAT_COLORS[cat] || '#52B788',
    }))

    // ── Category breakdown pie ─────────────────────────────────────
    const pieData = Object.entries(stats?.by_category || {}).map(([cat, kg]) => ({
        name: CATEGORY_META[cat]?.label || cat,
        value: kg,
        fill: CAT_COLORS[cat] || '#52B788',
    }))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Row 1: kg by day + claim rate by category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* kg donated by day of week */}
                <div className="card">
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                        Donations by Day of Week
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '14px' }}>
                        When you donate most
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={byDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-hint)' }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--text-hint)' }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="kg donated" radius={[4, 4, 0, 0]}>
                                {byDay.map((entry, i) => (
                                    <Cell
                                        key={i}
                                        fill={entry['kg donated'] === Math.max(...byDay.map(d => d['kg donated']))
                                            ? 'var(--primary)' : 'var(--primary-soft)'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Claim rate by category */}
                <div className="card">
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                        Claim Rate by Category
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '14px' }}>
                        % of listings claimed
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={byCat} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-hint)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                            <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'var(--text-hint)' }} tickLine={false} axisLine={false} width={60}
                                tickFormatter={c => `${CATEGORY_META[c]?.emoji || ''} ${CATEGORY_META[c]?.label || c}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="claim rate" radius={[0, 4, 4, 0]}>
                                {byCat.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 2: pie + insight cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* Donation breakdown pie */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                        Food Type Breakdown
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '10px' }}>
                        Total kg donated by category
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={pieData} cx="50%" cy="50%"
                                innerRadius={50} outerRadius={80}
                                paddingAngle={3} dataKey="value"
                            >
                                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip formatter={(val) => [`${val} kg`, '']} />
                            <Legend
                                iconType="circle" iconSize={8}
                                formatter={(val) => <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{val}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Insight summary */}
                <div className="card">
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>
                        📊 Key Insights
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            {
                                label: 'Best day to donate',
                                value: byDay.reduce((a, b) => a['kg donated'] > b['kg donated'] ? a : b)?.day || '—',
                                icon: '📅',
                                color: 'var(--primary)',
                            },
                            {
                                label: 'Highest claim rate category',
                                value: byCat.length
                                    ? `${CATEGORY_META[byCat.reduce((a, b) => a['claim rate'] > b['claim rate'] ? a : b)?.category]?.emoji} ${CATEGORY_META[byCat.reduce((a, b) => a['claim rate'] > b['claim rate'] ? a : b)?.category]?.label}`
                                    : '—',
                                icon: '🏆',
                                color: '#B45309',
                            },
                            {
                                label: 'Total meals enabled',
                                value: `${Math.round((stats?.total_kg_claimed || 0) * 4).toLocaleString()}`,
                                icon: '🍽️',
                                color: '#0369A1',
                            },
                            {
                                label: 'CO₂ prevented',
                                value: `${((stats?.total_kg_claimed || 0) * 0.5).toFixed(1)} kg`,
                                icon: '🌱',
                                color: '#059669',
                            },
                        ].map(item => (
                            <div key={item.label} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '10px 12px', borderRadius: '10px',
                                background: 'var(--surface-alt)',
                            }}>
                                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{item.label}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: item.color }}>{item.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}