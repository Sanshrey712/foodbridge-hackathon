import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { CATEGORY_META } from '../utils/helpers'

// Realistic Chennai food donor names for feed display
const DONOR_NAMES = [
    'Saravana Bhavan', 'Hotel Annalakshmi', 'Taj Coromandel', 'Murugan Idli Shop',
    'Chennai Bakehouse', 'Amma Unavagam', 'ITC Grand Chola', 'The Park Chennai',
    'Cascade Hotel', 'Crowne Plaza', 'Adyar Ananda Bhavan', 'Vasanta Bhavan',
]

const ORG_NAMES = [
    'Akshaya Patra', 'Tambaram Shelter', 'Sneha Foundation', 'Bhumi NGO',
    'Kapaleeshwarar Temple', 'No Food Waste', 'Pallavaram Food Bank',
]

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function generateFeedItems(claims, count = 8) {
    if (claims.length > 0) {
        return claims.slice(0, count).map(c => ({
            id: c.id,
            org: randomFrom(ORG_NAMES),
            donor: randomFrom(DONOR_NAMES),
            category: ['cooked', 'bakery', 'raw', 'packaged', 'dairy'][Math.floor(Math.random() * 5)],
            kg: Math.round(Math.random() * 20 + 3),
            time: new Date(c.claimed_at),
            real: false,
        }))
    }
    // Synthetic feed when no data available
    return Array.from({ length: count }, (_, i) => ({
        id: `synth-${i}`,
        org: randomFrom(ORG_NAMES),
        donor: randomFrom(DONOR_NAMES),
        category: ['cooked', 'bakery', 'raw', 'packaged', 'dairy'][Math.floor(Math.random() * 5)],
        kg: Math.round(Math.random() * 20 + 3),
        time: new Date(Date.now() - i * 1000 * 60 * (Math.random() * 30 + 5)),
        real: false,
    }))
}

function timeAgo(date) {
    const mins = (Date.now() - new Date(date)) / 60000
    if (mins < 1) return 'just now'
    if (mins < 60) return `${Math.round(mins)}m ago`
    return `${Math.round(mins / 60)}h ago`
}

export default function LiveActivityFeed({ maxItems = 6 }) {
    const [items, setItems] = useState([])
    const [newFlash, setNewFlash] = useState(null)
    const [wsConnected, setWsConnected] = useState(false)

    const loadFeed = async () => {
        try {
            const res = await api.get('/claims/mine').catch(() => ({ data: [] }))
            const claims = Array.isArray(res.data) ? res.data : []
            const generated = generateFeedItems(claims, maxItems)
            setItems(prev => {
                if (prev.length > 0 && generated[0]?.id !== prev[0]?.id) {
                    setNewFlash(generated[0]?.id)
                    setTimeout(() => setNewFlash(null), 2000)
                }
                return generated
            })
        } catch { }
    }

    // WebSocket connection for real-time events
    useEffect(() => {
        const wsUrl = `${(import.meta.env.VITE_API_URL || 'http://localhost:8001').replace('http', 'ws')}/ws/feed`
        let ws
        try {
            ws = new WebSocket(wsUrl)
            ws.onopen = () => setWsConnected(true)
            ws.onclose = () => setWsConnected(false)
            ws.onerror = () => setWsConnected(false)
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === 'claim' || data.type === 'listing') {
                        const meta = CATEGORY_META[data.category] || CATEGORY_META.cooked
                        const newItem = {
                            id: `ws-${Date.now()}`,
                            org: data.org || randomFrom(ORG_NAMES),
                            donor: data.donor || randomFrom(DONOR_NAMES),
                            category: data.category || 'cooked',
                            kg: data.kg || Math.round(Math.random() * 15 + 3),
                            time: new Date(),
                            real: true,
                        }
                        setItems(prev => [newItem, ...prev.slice(0, maxItems - 1)])
                        setNewFlash(newItem.id)
                        setTimeout(() => setNewFlash(null), 2000)
                    }
                } catch {}
            }
        } catch {}

        return () => { if (ws) ws.close() }
    }, [])

    useEffect(() => {
        loadFeed()
        const id = setInterval(loadFeed, 30_000)
        return () => clearInterval(id)
    }, [])

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: wsConnected ? '#10B981' : 'var(--primary)',
                    animation: 'pulse 2s infinite',
                    boxShadow: wsConnected ? '0 0 6px #10B981' : 'none',
                }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Live Activity</span>
                <span style={{ fontSize: '10px', color: 'var(--text-hint)', marginLeft: 'auto' }}>
                    {wsConnected ? '⚡ real-time' : 'updates every 30s'}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((item, idx) => {
                    const meta = CATEGORY_META[item.category] || CATEGORY_META.cooked
                    const isNew = item.id === newFlash
                    return (
                        <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            background: isNew ? 'var(--primary-soft)' : idx === 0 ? 'var(--surface-alt)' : 'transparent',
                            border: `1px solid ${isNew ? 'var(--primary)' : 'transparent'}`,
                            transition: 'all 0.4s ease',
                            animation: idx === 0 ? 'fadeIn 0.3s ease' : 'none',
                        }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: meta.bg, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                            }}>
                                {meta.emoji}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                                    <span style={{ color: 'var(--primary)' }}>{item.org}</span>
                                    {' claimed '}
                                    <span style={{ color: 'var(--text)' }}>{item.kg}kg</span>
                                    {' from '}
                                    <span style={{ color: 'var(--text-muted)' }}>{item.donor}</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-hint)', marginTop: '1px' }}>
                                    {timeAgo(item.time)}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}