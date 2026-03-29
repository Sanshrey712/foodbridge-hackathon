import React, { useState, useEffect } from 'react'
import { CATEGORY_META } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from './Skeleton'

const STORAGE_KEY = 'fb_need_board'

function loadNeeds() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch { return [] }
}

function saveNeeds(needs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(needs))
}

const CATS = ['cooked', 'raw', 'packaged', 'bakery', 'dairy']
const WHEN_OPTIONS = ['Any time', 'Morning (6-10 AM)', 'Lunch (11 AM-2 PM)', 'Evening (5-8 PM)']

export default function NeedBoard({ compact = false }) {
    const [needs, setNeeds] = useState(loadNeeds)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ category: 'cooked', quantity_kg: '', when: 'Any time', note: '' })
    const [posting, setPosting] = useState(false)
    const { user } = useAuth()
    const { addToast } = useToast()

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const handlePost = () => {
        if (!form.quantity_kg) { addToast('Please enter a quantity', 'error'); return }
        setPosting(true)
        setTimeout(() => {
            const newNeed = {
                id: Date.now().toString(),
                org: user?.name || localStorage.getItem('fb_user_name') || 'Anonymous',
                category: form.category,
                quantity_kg: parseFloat(form.quantity_kg),
                when: form.when,
                note: form.note,
                posted_at: new Date().toISOString(),
                fulfilled: false,
            }
            const updated = [newNeed, ...needs].slice(0, 20)
            saveNeeds(updated)
            setNeeds(updated)
            setForm({ category: 'cooked', quantity_kg: '', when: 'Any time', note: '' })
            setShowForm(false)
            setPosting(false)
            addToast('Need posted to the board! 📋', 'success')
        }, 400)
    }

    const markFulfilled = (id) => {
        const updated = needs.map(n => n.id === id ? { ...n, fulfilled: true } : n)
        saveNeeds(updated)
        setNeeds(updated)
        addToast('Marked as fulfilled ✅', 'success')
    }

    const active = needs.filter(n => !n.fulfilled)
    const isRecipient = user?.role === 'recipient'
    const isDonor = user?.role === 'donor'

    if (compact) {
        // Compact view for donor sidebar — just shows active needs
        return (
            <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 Recipient Requests
                    {active.length > 0 && (
                        <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '20px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 }}>
                            {active.length} active
                        </span>
                    )}
                </div>
                {active.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-hint)', textAlign: 'center', padding: '16px' }}>
                        No active requests right now
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {active.slice(0, 5).map(n => {
                            const meta = CATEGORY_META[n.category]
                            return (
                                <div key={n.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px', borderRadius: '10px',
                                    background: meta.bg, border: `1px solid ${meta.color}33`,
                                }}>
                                    <span style={{ fontSize: '18px' }}>{meta.emoji}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: meta.text }}>{n.org}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            Needs {n.quantity_kg}kg {meta.label} · {n.when}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                        📋 Need Board
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {isRecipient ? 'Post what you need — donors will see it.' : 'Active food requests from recipients near you.'}
                    </p>
                </div>
                {isRecipient && !showForm && (
                    <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>
                        + Post a Need
                    </button>
                )}
            </div>

            {/* Post form */}
            {showForm && isRecipient && (
                <div className="card" style={{ marginBottom: '20px', border: '2px solid var(--primary)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>
                        What do you need?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <div className="field-label" style={{ marginBottom: '6px' }}>Food Category</div>
                            <div className="chip-row">
                                {CATS.map(cat => {
                                    const meta = CATEGORY_META[cat]
                                    return (
                                        <div
                                            key={cat}
                                            className={`chip ${form.category === cat ? 'active' : ''}`}
                                            style={form.category === cat ? { borderColor: meta.color, background: meta.bg, color: meta.text } : {}}
                                            onClick={() => set('category', cat)}
                                        >
                                            {meta.emoji} {meta.label}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <div className="field-label" style={{ marginBottom: '6px' }}>Quantity (kg)</div>
                                <input className="input" type="number" min="1" placeholder="e.g. 10"
                                    value={form.quantity_kg} onChange={e => set('quantity_kg', e.target.value)} />
                            </div>
                            <div>
                                <div className="field-label" style={{ marginBottom: '6px' }}>Preferred Time</div>
                                <select className="input" value={form.when} onChange={e => set('when', e.target.value)}
                                    style={{ cursor: 'pointer' }}>
                                    {WHEN_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <div className="field-label" style={{ marginBottom: '6px' }}>Additional Note (optional)</div>
                            <input className="input" placeholder="e.g. for 40 children, vegetarian only..."
                                value={form.note} onChange={e => set('note', e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-primary" onClick={handlePost} disabled={posting} style={{ flex: 1 }}>
                                {posting ? <Spinner size={14} color="#fff" /> : '📋 Post to Board'}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Needs list */}
            {needs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>No requests yet</div>
                    <div style={{ fontSize: '13px' }}>
                        {isRecipient ? 'Post what you need — donors will see it.' : 'Recipients haven\'t posted any requests yet.'}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {needs.map(n => {
                        const meta = CATEGORY_META[n.category]
                        const timeAgo = (() => {
                            const mins = (Date.now() - new Date(n.posted_at)) / 60000
                            if (mins < 60) return `${Math.round(mins)}m ago`
                            if (mins < 1440) return `${Math.round(mins / 60)}h ago`
                            return `${Math.round(mins / 1440)}d ago`
                        })()
                        return (
                            <div key={n.id} className="card" style={{
                                opacity: n.fulfilled ? 0.6 : 1,
                                borderLeft: `4px solid ${meta.color}`,
                                display: 'flex', alignItems: 'center', gap: '14px',
                            }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: meta.bg, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                                }}>
                                    {meta.emoji}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{n.org}</span>
                                        {n.fulfilled && (
                                            <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                                                ✓ Fulfilled
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: n.note ? '3px' : 0 }}>
                                        Needs <strong>{n.quantity_kg} kg</strong> of {meta.label} · {n.when}
                                    </div>
                                    {n.note && (
                                        <div style={{ fontSize: '12px', color: 'var(--text-hint)', fontStyle: 'italic' }}>
                                            "{n.note}"
                                        </div>
                                    )}
                                    <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '4px' }}>
                                        Posted {timeAgo}
                                    </div>
                                </div>
                                {isDonor && !n.fulfilled && (
                                    <button className="btn-primary btn-sm" onClick={() => markFulfilled(n.id)}>
                                        ✓ Fulfilled
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}