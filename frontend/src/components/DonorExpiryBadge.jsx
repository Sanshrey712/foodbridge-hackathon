import { useState, useEffect } from 'react'
import { donorsAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'

/**
 * useDonorExpiryAlert
 * Returns count of donor's own listings expiring within 60 minutes.
 * Used to show a red badge on the Dashboard navbar link.
 */
export function useDonorExpiryAlert() {
    const [urgentCount, setUrgentCount] = useState(0)
    const { user } = useAuth()

    useEffect(() => {
        if (user?.role !== 'donor') return

        const check = async () => {
            try {
                const res = await donorsAPI.me()
                const listings = res.data?.listings || []
                const now = Date.now()
                const count = listings.filter(l => {
                    if (l.is_claimed) return false
                    const minsLeft = (new Date(l.expires_at) - now) / 60000
                    return minsLeft > 0 && minsLeft < 60
                }).length
                setUrgentCount(count)
            } catch { }
        }

        check()
        const id = setInterval(check, 60_000)
        return () => clearInterval(id)
    }, [user])

    return urgentCount
}

/**
 * ExpiryDot — the red badge dot shown on the Navbar Dashboard link.
 */
export default function ExpiryDot({ count }) {
    if (!count) return null
    return (
        <span style={{
            position: 'absolute',
            top: '10px',
            right: '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#EF4444',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--bg)',
            animation: 'pulse 2s infinite',
        }}>
            {count > 9 ? '9+' : count}
        </span>
    )
}