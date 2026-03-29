import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import ImpactBanner from '../components/ImpactBanner'
import { api } from '../utils/api'
import { Spinner } from '../components/Skeleton'

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/leaderboard?limit=15')
      .then(res => setLeaders(res.data || []))
      .catch(() => {
        // Demo fallback data
        setLeaders([
          { rank: 1, name: 'Akshaya Patra Foundation', kg_donated: 245.5, listings_claimed: 42, meals_provided: 982 },
          { rank: 2, name: 'Chennai Food Bank', kg_donated: 189.2, listings_claimed: 35, meals_provided: 757 },
          { rank: 3, name: 'Amma Unavagam', kg_donated: 156.8, listings_claimed: 28, meals_provided: 627 },
          { rank: 4, name: 'Hotel Saravana Bhavan', kg_donated: 98.4, listings_claimed: 18, meals_provided: 394 },
          { rank: 5, name: 'Taj Coromandel Kitchen', kg_donated: 67.1, listings_claimed: 12, meals_provided: 268 },
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-wrapper">
      <Navbar />
      <ImpactBanner />
      <div className="page-content page-enter">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="page-header">
            <div>
              <h1 className="page-title">🏆 Donor Leaderboard</h1>
              <p className="page-subtitle">Top food donors making a difference in Chennai this week.</p>
            </div>
          </div>

          {/* Top 3 podium */}
          {!loading && leaders.length >= 3 && (
            <div className="podium">
              {[1, 0, 2].map(idx => {
                const l = leaders[idx]
                if (!l) return null
                return (
                  <div key={idx} className={`podium-card podium-${l.rank}`}>
                    <div className="podium-medal">{MEDAL[l.rank - 1]}</div>
                    <div className="podium-name">{l.name}</div>
                    <div className="podium-kg">{l.kg_donated} kg</div>
                    <div className="podium-meals">{l.meals_provided} meals</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full table */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">All Rankings</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="lb-table">
                <thead>
                  <tr>
                    {['Rank', 'Donor', 'Food Donated', 'Claims', 'Meals Provided'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                      <Spinner size={28} />
                    </td></tr>
                  ) : leaders.length === 0 ? (
                    <tr><td colSpan={5} className="empty-cell">
                      <div className="empty-state-inline">
                        <span>🏆</span>No donors yet — be the first!
                      </div>
                    </td></tr>
                  ) : leaders.map(l => (
                    <tr key={l.rank} className={l.rank <= 3 ? 'top-row' : ''}>
                      <td className="rank-cell">
                        {l.rank <= 3 ? MEDAL[l.rank - 1] : <span className="rank-num">#{l.rank}</span>}
                      </td>
                      <td className="name-cell">{l.name}</td>
                      <td className="kg-cell">
                        <span className="kg-badge">{l.kg_donated} kg</span>
                      </td>
                      <td>{l.listings_claimed}</td>
                      <td>
                        <span className="meals-badge">{l.meals_provided} 🍽️</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
