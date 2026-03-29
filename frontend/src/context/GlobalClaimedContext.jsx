import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * GlobalClaimedContext
 * Tracks claimed listing IDs across ALL pages so MapPage, RecipientPage,
 * and ClaimsPage stay in sync without a full refresh.
 *
 * NOTE: This file lives in src/context/ (not src/components/).
 * Import it as: import { useGlobalClaimed } from '../context/GlobalClaimedContext'
 */
const GlobalClaimedContext = createContext(null)

export function GlobalClaimedProvider({ children }) {
    const [claimedIds, setClaimedIds] = useState(() => {
        try {
            return new Set(JSON.parse(localStorage.getItem('fb_claimed_ids') || '[]'))
        } catch { return new Set() }
    })

    const markClaimed = useCallback((id) => {
        setClaimedIds(prev => {
            const next = new Set([...prev, id])
            localStorage.setItem('fb_claimed_ids', JSON.stringify([...next]))
            return next
        })
    }, [])

    const isClaimed = useCallback((id) => claimedIds.has(id), [claimedIds])

    const clearClaimed = useCallback(() => {
        setClaimedIds(new Set())
        localStorage.removeItem('fb_claimed_ids')
    }, [])

    return (
        <GlobalClaimedContext.Provider value={{ claimedIds, markClaimed, isClaimed, clearClaimed }}>
            {children}
        </GlobalClaimedContext.Provider>
    )
}

export const useGlobalClaimed = () => {
    const ctx = useContext(GlobalClaimedContext)
    if (!ctx) {
        throw new Error('useGlobalClaimed must be used within a GlobalClaimedProvider. Check that GlobalClaimedProvider wraps your app in App.jsx.')
    }
    return ctx
}