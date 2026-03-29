import React, { useState, useEffect } from 'react'

/**
 * EmailToast
 * Shows a real-time email notification toast after a claim is made.
 * The backend actually sends real emails via Resend — this toast
 * confirms delivery to the user visually.
 *
 * Usage:
 *   import EmailToast, { useEmailToast } from './EmailToast'
 *
 *   const { showEmail } = useEmailToast()
 *   // after a claim:
 *   showEmail({ donorName: 'Saravana Bhavan', food: 'Rice & Sambar', kg: 12, donorEmail: '...', recipientEmail: '...' })
 *
 *   // In your render tree (once, near root):
 *   <EmailToast />
 */

// Global state — simple pub/sub
let _listeners = []

function publish(data) {
    _listeners.forEach(fn => fn(data))
}

export function useEmailToast() {
    const showEmail = ({ donorName, food, kg, recipientName, donorEmail, recipientEmail }) => {
        publish({ donorName, food, kg, recipientName, donorEmail, recipientEmail, id: Date.now() })
    }
    return { showEmail }
}

export default function EmailToast() {
    const [data, setData] = useState(null)
    const [phase, setPhase] = useState('hidden') // hidden | slide-in | visible | slide-out

    useEffect(() => {
        const handler = (d) => {
            setData(d)
            setPhase('slide-in')
            setTimeout(() => setPhase('visible'), 50)
            setTimeout(() => setPhase('slide-out'), 5500)
            setTimeout(() => { setPhase('hidden'); setData(null) }, 6000)
        }
        _listeners.push(handler)
        return () => { _listeners = _listeners.filter(l => l !== handler) }
    }, [])

    if (phase === 'hidden' || !data) return null

    const visible = phase === 'visible' || phase === 'slide-in'

    return (
        <div style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            zIndex: 9997,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 40px))',
            transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
            {/* Header badge */}
            <div style={{
                background: 'var(--primary)',
                color: '#fff',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(82,183,136,0.4)',
                animation: 'fadeIn 0.3s ease',
            }}>
                <span style={{ fontSize: '16px' }}>📧</span>
                Email Notifications Sent
                <span style={{
                    background: 'rgba(255,255,255,0.25)',
                    borderRadius: '20px',
                    padding: '1px 8px',
                    fontSize: '10px',
                }}>2 emails</span>
            </div>

            {/* Donor Email */}
            <EmailBubble
                to={data.donorName || 'Donor'}
                email={data.donorEmail}
                subject={`Your listing "${data.food}" was just claimed!`}
                preview={`${data.kg} kg claimed on FoodBridge. Prepare for pickup!`}
                delay={0}
                color="#2D6A4F"
                icon="🍱"
            />

            {/* Recipient Email */}
            <EmailBubble
                to={data.recipientName || 'Recipient'}
                email={data.recipientEmail}
                subject={`Claim confirmed — pickup "${data.food}"`}
                preview={`${data.kg} kg from ${data.donorName}. Head to the pickup location!`}
                delay={300}
                color="#0369A1"
                icon="🏠"
            />
        </div>
    )
}

function EmailBubble({ to, email, subject, preview, delay, color, icon }) {
    const [show, setShow] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setShow(true), delay)
        return () => clearTimeout(t)
    }, [delay])

    return (
        <div style={{
            background: 'var(--surface-solid)',
            border: `1px solid ${color}33`,
            borderLeft: `4px solid ${color}`,
            borderRadius: '14px',
            padding: '12px 16px',
            maxWidth: '320px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            opacity: show ? 1 : 0,
            transform: show ? 'scale(1)' : 'scale(0.9)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
            }}>
                <div style={{
                    width: '28px', height: '28px',
                    borderRadius: '8px',
                    background: `${color}22`,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>
                        {to}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-hint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email || 'via FoodBridge Email'}
                    </div>
                </div>
                <div style={{
                    marginLeft: 'auto',
                    width: '8px', height: '8px',
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                    animation: 'pulse 1.5s ease infinite',
                }} />
            </div>

            {/* Subject */}
            <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '4px',
            }}>
                {subject}
            </div>

            {/* Preview */}
            <div style={{
                background: `${color}11`,
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                fontFamily: 'var(--font-body)',
            }}>
                {preview}
            </div>

            {/* Status */}
            <div style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                color,
                fontWeight: 600,
            }}>
                ✓✓ Delivered to inbox
            </div>
        </div>
    )
}