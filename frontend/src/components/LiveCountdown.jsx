import { useState, useEffect } from 'react'

/**
 * LiveCountdown — ticking expiry timer that updates every minute.
 * Replaces static timeLeft() calls so cards visually count down.
 */
export function useLiveTimeLeft(expiresAt) {
    const calc = () => {
        const diff = (new Date(expiresAt) - Date.now()) / 1000 / 60
        if (diff <= 0) return { label: 'Expired', urgent: true, expired: true, minutes: 0 }
        if (diff < 60) return { label: `${Math.round(diff)}m left`, urgent: true, expired: false, minutes: diff }
        const hrs = Math.floor(diff / 60)
        const min = Math.round(diff % 60)
        if (hrs < 6) return { label: `${hrs}h ${min}m left`, urgent: hrs < 3, expired: false, minutes: diff }
        if (hrs < 24) return { label: `${hrs}h left`, urgent: false, expired: false, minutes: diff }
        return { label: `${Math.floor(hrs / 24)}d left`, urgent: false, expired: false, minutes: diff }
    }

    const [tl, setTl] = useState(calc)

    useEffect(() => {
        setTl(calc())
        const id = setInterval(() => setTl(calc()), 60_000)
        return () => clearInterval(id)
    }, [expiresAt])

    return tl
}

/**
 * LiveCountdownBadge — inline ticking badge for listing cards.
 * Shows a pulsing red dot when < 60 minutes left.
 */
export default function LiveCountdownBadge({ expiresAt, style }) {
    const tl = useLiveTimeLeft(expiresAt)

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            color: tl.expired ? '#9CA3AF' : tl.urgent ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: tl.urgent ? 600 : 400,
            fontSize: '12px',
            ...style,
        }}>
            {tl.urgent && !tl.expired && (
                <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: 'var(--accent)', display: 'inline-block',
                    animation: 'pulse 1.5s ease infinite',
                    boxShadow: '0 0 0 2px rgba(247,178,103,0.3)',
                }} />
            )}
            {tl.label}
        </span>
    )
}