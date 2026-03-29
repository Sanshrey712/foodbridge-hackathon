export const CATEGORY_META = {
  cooked:   { label: 'Cooked',   emoji: '🍛', color: '#2D6A4F', bg: '#E8F5E9', text: '#2D6A4F' },
  raw:      { label: 'Raw',      emoji: '🥕', color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  packaged: { label: 'Packaged', emoji: '📦', color: '#6366F1', bg: '#EDE9FE', text: '#4338CA' },
  bakery:   { label: 'Bakery',   emoji: '🍞', color: '#F4A261', bg: '#FEF3E2', text: '#92400E' },
  dairy:    { label: 'Dairy',    emoji: '🥛', color: '#0EA5E9', bg: '#E0F2FE', text: '#0369A1' },
}

export function timeLeft(expiresAt) {
  const now  = new Date()
  const exp  = new Date(expiresAt)
  const diff = (exp - now) / 1000 / 60 // minutes

  if (diff <= 0) return { label: 'Expired', urgent: true, expired: true }
  if (diff < 60) return { label: `${Math.round(diff)}m left`, urgent: true, expired: false }
  const hrs = Math.floor(diff / 60)
  const min = Math.round(diff % 60)
  if (hrs < 6) return { label: `${hrs}h ${min}m left`, urgent: hrs < 3, expired: false }
  if (hrs < 24) return { label: `${hrs}h left`, urgent: false, expired: false }
  return { label: `${Math.floor(hrs / 24)}d left`, urgent: false, expired: false }
}

export function scoreColor(score) {
  if (score >= 0.8) return '#2D6A4F'
  if (score >= 0.6) return '#52B788'
  if (score >= 0.4) return '#F4A261'
  return '#EF4444'
}

export function formatKg(kg) {
  return kg >= 1 ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(kg * 1000)} g`
}
