import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { listingsAPI, donorsAPI, claimsAPI, mlAPI } from '../utils/api'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''

// ── Live context fetcher ──────────────────────────────────────────
async function fetchLiveContext(user) {
  const ctx = {}
  const CHENNAI = { lat: 12.9716, lng: 80.2209 }

  try {
    const listingsRes = await listingsAPI.nearby(CHENNAI.lat, CHENNAI.lng, 15)
    const listings = listingsRes.data || []
    const active = listings.filter(l => !l.is_claimed)
    const expiringSoon = active.filter(l => {
      const hrs = (new Date(l.expires_at) - Date.now()) / 3600000
      return hrs > 0 && hrs < 2
    })

    const byCategory = active.reduce((acc, l) => {
      acc[l.category] = (acc[l.category] || 0) + 1
      return acc
    }, {})

    ctx.listings = {
      total: active.length,
      expiringSoon: expiringSoon.length,
      byCategory,
      topListings: active.slice(0, 3).map(l => ({
        title: l.title,
        kg: l.quantity_kg,
        category: l.category,
        expiresIn: Math.round((new Date(l.expires_at) - Date.now()) / 3600000 * 10) / 10,
      })),
    }
  } catch { ctx.listings = null }

  if (user?.role === 'donor') {
    try {
      const [profileRes, statsRes] = await Promise.all([donorsAPI.me(), donorsAPI.stats()])
      ctx.donorStats = statsRes.data
      const myListings = (profileRes.data?.listings || []).filter(l => !l.is_claimed)
      ctx.myActiveListings = myListings.length
      ctx.myExpiringListings = myListings.filter(l => {
        const hrs = (new Date(l.expires_at) - Date.now()) / 3600000
        return hrs > 0 && hrs < 1
      }).length
    } catch { ctx.donorStats = null }
  }

  if (user?.role === 'recipient') {
    try {
      const claimsRes = await claimsAPI.mine()
      const claims = claimsRes.data || []
      ctx.myClaimsCount = claims.length
      ctx.pendingPickups = claims.filter(c => !c.picked_up).length
    } catch { ctx.claimsData = null }
  }

  try {
    const forecastRes = await mlAPI.quickForecast(CHENNAI.lat, CHENNAI.lng)
    const forecast = forecastRes.data?.next_6_hours_kg || {}
    ctx.forecast = {
      total: forecastRes.data?.total_kg,
      byCategory: forecast,
      topCategory: Object.entries(forecast).sort((a, b) => b[1] - a[1])[0],
    }
  } catch { ctx.forecast = null }

  return ctx
}

// ── System prompt with live context ───────────────────────────────
function getSystemPrompt(user, hour, liveCtx) {
  const role = user?.role || 'user'
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const name = user?.name || localStorage.getItem('fb_user_name') || ''
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  let ctxSection = ''

  if (liveCtx?.listings) {
    const l = liveCtx.listings
    const cats = Object.entries(l.byCategory || {}).map(([c, n]) => `${n} ${c}`).join(', ')
    ctxSection += `\n\n--- LIVE PLATFORM DATA (right now) ---`
    ctxSection += `\nActive food listings near Chennai: ${l.total} total`
    ctxSection += `\nExpiring within 2 hours: ${l.expiringSoon}`
    if (cats) ctxSection += `\nBreakdown: ${cats}`
    if (l.topListings?.length) {
      ctxSection += `\nTop available listings:`
      l.topListings.forEach(t => {
        ctxSection += `\n  • "${t.title}" — ${t.kg}kg ${t.category}, expires in ${t.expiresIn}h`
      })
    }
  }

  if (liveCtx?.forecast) {
    const f = liveCtx.forecast
    ctxSection += `\n\nDemand forecast (next 6h): ~${f.total} kg total expected`
    if (f.topCategory) ctxSection += `\nHighest demand: ${f.topCategory[0]} (${f.topCategory[1]} kg)`
    if (f.byCategory) {
      const cats = Object.entries(f.byCategory).map(([c, kg]) => `${c}: ${kg}kg`).join(', ')
      ctxSection += `\nForecast breakdown: ${cats}`
    }
  }

  if (role === 'donor' && liveCtx?.donorStats) {
    const s = liveCtx.donorStats
    ctxSection += `\n\nThis donor's stats: ${s.total_listings} listings posted, ${s.total_kg_donated}kg donated, ${s.claimed_listings} claimed`
    if (liveCtx.myActiveListings !== undefined) ctxSection += `, ${liveCtx.myActiveListings} currently active`
    if (liveCtx.myExpiringListings > 0) ctxSection += `\n⚠️ URGENT: ${liveCtx.myExpiringListings} of their listings expire within 1 hour!`
  }

  if (role === 'recipient') {
    if (liveCtx?.myClaimsCount !== undefined) ctxSection += `\n\nThis recipient has ${liveCtx.myClaimsCount} total claims, ${liveCtx.pendingPickups || 0} pending pickup`
  }

  const base = `You are FoodBridge AI — the intelligent assistant built into the FoodBridge platform, a real-time food redistribution app for Chennai, India.
${name ? `You are talking to ${name}.` : ''}
Current time: ${now} (${period}). User role: ${role}.
${ctxSection}

--- YOUR CAPABILITIES ---
You have access to LIVE data from the platform (shown above). Use it to give specific, accurate answers.
You know everything about the app:
• Pages: Map (live Leaflet map with pins + heatmap), Matches/Recipient page (ML-ranked listings), Donor Dashboard (post listings, see stats, badges), Forecast page (12h ML demand chart by category), My Claims (track pickups with QR codes), Leaderboard (donor rankings), Landing page
• ML matching: urgency 35% + distance 30% + category preference 20% + quantity 15%
• Food categories: cooked (4-6h expiry), bakery (8h), dairy (12h), raw (24h), packaged (48h)
• Peak donation times: 7-9AM breakfast, 1-2PM lunch, 7-9PM dinner
• Features: heatmap toggle, live countdown timers, confetti on claim, CO₂ impact calculator, need board, waste analytics, Tamil/English i18n, dark/light mode, voice input, PWA installable

Keep responses under 90 words. Be warm, direct, and use the live data when relevant. Use 1-2 emojis max. Never say "I don't have access to" — you DO have live data. If data is missing, say "checking..." or give the most recent known answer.`

  return base
}

// ── Smart fallback (no API key) ───────────────────────────────────
function getSmartFallback(msg, role, liveCtx) {
  const m = msg.toLowerCase()

  if (m.match(/^(hi|hello|hey|hii+|yo)\b/)) {
    return role === 'donor'
      ? "Hey! 👋 I can see your dashboard live. What do you need help with?"
      : "Hey! 👋 I can see current food listings near you. What are you looking for?"
  }

  if ((m.includes('how many') || m.includes('how much') || m.includes('what') && m.includes('listing')) && liveCtx?.listings) {
    const l = liveCtx.listings
    const cats = Object.entries(l.byCategory || {}).map(([c, n]) => `${n} ${c}`).join(', ')
    return `Right now there are ${l.total} active listings near Chennai (${cats}). ${l.expiringSoon > 0 ? `⚡ ${l.expiringSoon} expiring in under 2h!` : ''}`
  }

  if (m.includes('forecast') || m.includes('predict') || m.includes('expect')) {
    if (liveCtx?.forecast) {
      const f = liveCtx.forecast
      const top = f.topCategory
      return `📊 Next 6h forecast: ~${f.total}kg total expected. ${top ? `Highest demand is ${top[0]} (${top[1]}kg).` : ''} Check the Forecast page for the full 12h chart!`
    }
    return "Forecast page 📊 predicts food surplus by category for next 12h using Random Forest ML. Check it out!"
  }

  if (m.includes('expir') || m.includes('urgent')) {
    if (liveCtx?.listings?.expiringSoon > 0) return `⚡ ${liveCtx.listings.expiringSoon} listing(s) expiring in under 2h right now — highest match scores. Claim them fast!`
    return "⚡ 'EXPIRING SOON' badges = under 1h left. Those have highest match scores — grab them first!"
  }

  if ((m.includes('my') || m.includes('i have')) && m.includes('listing') && role === 'donor' && liveCtx?.myActiveListings !== undefined) {
    return `You have ${liveCtx.myActiveListings} active listings right now.${liveCtx.myExpiringListings > 0 ? ` ⚠️ ${liveCtx.myExpiringListings} expiring within 1h!` : ' Looking good! 🌿'}`
  }

  if (m.includes('claim') && liveCtx?.pendingPickups !== undefined) {
    return `You have ${liveCtx.pendingPickups} pending pickups! Go to My Claims to mark them as collected. 📋`
  }

  if (m.includes('map')) return "The Map 🗺️ shows all active listings as color-coded pins. Toggle to Heatmap for density view — larger blobs = more urgent listings!"
  if (m.includes('match') || m.includes('score')) return "Match score = urgency 35% + distance 30% + category preference 20% + quantity 15%. Above 75 is excellent! 🎯"
  if (m.includes('post') || m.includes('list') || m.includes('add')) return "Dashboard → fill title + category + quantity + expiry → Publish! Specific titles like 'Biryani — 20 portions' claim 3× faster. 🚀"
  if (m.includes('leaderboard') || m.includes('rank')) return "Leaderboard 🏆 ranks donors by kg donated all-time. Every kg = 4 meals. Badges unlock at 1, 5, 10 listings and 50, 100, 250 kg!"
  if (m.includes('co2') || m.includes('impact') || m.includes('environment')) return "Go to Recipient → CO₂ Impact tab for the Mission Control dashboard 🌍 and interactive calculator showing exact environmental impact!"
  if (m.includes('qr') || m.includes('pickup') || m.includes('verify')) return "After claiming, open My Claims → tap 'Show QR' to get your pickup verification code. Show it to the donor at handoff! 📱"
  if (m.includes('voice') || m.includes('speak') || m.includes('mic')) return "Tap the 🎤 mic button to speak your message! Voice input uses Chrome's speech recognition (works best in Chrome). 🎙️"
  if (m.includes('dark') || m.includes('light') || m.includes('theme')) return "Toggle dark/light mode with the 🌙/☀️ button in the navbar! Your preference is saved automatically."
  if (m.includes('tamil') || m.includes('language') || m.includes('translate')) return "Tap the language button in the navbar to switch between English and Tamil 🌐 — all major UI text translates!"

  const donorTips = [
    liveCtx?.forecast?.topCategory
      ? `📊 Live forecast: ${liveCtx.forecast.topCategory[0]} has highest demand right now (${liveCtx.forecast.topCategory[1]}kg expected). Post that category!`
      : "Check the Forecast page before posting — it shows which categories are in demand right now. 📊",
    "Cooked food posted at 7PM gets claimed within 30min on average in Chennai. Timing matters! 🍛",
    "Set expiry to 4-6h for cooked food and 48h for packaged. Accurate expiry = more claims! ⏱️",
    "Your Dashboard shows claim rate. Below 60%? Try more specific titles and shorter expiry windows.",
  ]
  const recipientTips = [
    liveCtx?.listings ? `There are ${liveCtx.listings.total} active listings near you right now. 🌿 ${liveCtx.listings.expiringSoon > 0 ? `${liveCtx.listings.expiringSoon} expiring soon!` : 'Check Matches for top picks!'}` : "Check ML Matches page — it ranks food by urgency, distance, and your preferences! 🎯",
    "Listings expiring in under 2h appear as larger blobs on the heatmap — claim those first! ⚡",
    "Set your preferred categories in the Matches filter for better, more personalized results. 📍",
    "After claiming, get your QR pickup code in My Claims — it verifies handoff with the donor! 📱",
  ]
  const tips = role === 'donor' ? donorTips : recipientTips
  return tips[(msg.length + (msg.charCodeAt(0) || 0)) % tips.length]
}

// ── Main component ────────────────────────────────────────────────
export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const [liveCtx, setLiveCtx] = useState(null)
  const [ctxLoading, setCtxLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const { user } = useAuth()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch live context when opening or every 2 minutes
  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      setCtxLoading(true)
      const ctx = await fetchLiveContext(user)
      setLiveCtx(ctx)
      setCtxLoading(false)
    }
    fetch()
    const id = setInterval(fetch, 120_000)
    return () => clearInterval(id)
  }, [user])

  const handleOpen = () => {
    setIsOpen(true)
    if (!hasGreeted) {
      const name = user?.name || localStorage.getItem('fb_user_name') || ''
      const firstName = name ? ' ' + name.split(' ')[0] : ''
      let greeting
      if (user?.role === 'donor' && liveCtx?.donorStats) {
        const s = liveCtx.donorStats
        greeting = `Hi${firstName}! 👋 You've donated ${s.total_kg_donated}kg so far — that's ${Math.round(s.total_kg_donated * 4)} meals! ${liveCtx.myExpiringListings > 0 ? `⚠️ You have ${liveCtx.myExpiringListings} listing(s) expiring soon.` : 'What can I help you with today?'}`
      } else if (user?.role === 'recipient' && liveCtx?.listings) {
        const l = liveCtx.listings
        greeting = `Hi${firstName}! 👋 There are ${l.total} active food listings near you right now.${l.expiringSoon > 0 ? ` ⚡ ${l.expiringSoon} expiring soon!` : ''} How can I help?`
      } else {
        greeting = user?.role === 'donor'
          ? `Hi${firstName}! 👋 I'm your FoodBridge AI with live access to the platform. Ask me about your listings, demand forecast, or anything! What do you have to donate today?`
          : `Hi${firstName}! 👋 I'm your FoodBridge AI with live access to current food listings. Ask me what's available, check forecasts, or get help claiming food!`
      }
      setMessages([{ role: 'assistant', content: greeting }])
      setHasGreeted(true)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userInput = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userInput }])
    setInput('')
    setLoading(true)

    if (!OPENROUTER_API_KEY) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: getSmartFallback(userInput, user?.role, liveCtx) }])
        setLoading(false)
      }, 400)
      return
    }

    try {
      const hour = new Date().getHours()
      const systemPrompt = getSystemPrompt(user, hour, liveCtx)

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'FoodBridge',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4-5',
          messages: [
            { role: 'user', content: systemPrompt + '\n\n---\nNow respond to the user.' },
            ...messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userInput },
          ],
          max_tokens: 180,
          temperature: 0.7,
        }),
      })

      if (!response.ok) throw new Error(`${response.status}`)
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content?.trim()
      if (reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      } else {
        throw new Error('Empty response')
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: getSmartFallback(userInput, user?.role, liveCtx) }])
    } finally {
      setLoading(false)
    }
  }

  // Voice input
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'assistant', content: '🎤 Voice input not supported. Try Chrome!' }])
      return
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
      setTimeout(() => { if (transcript.trim()) { setInput(t => { if (t.trim()) window.dispatchEvent(new Event('voice-send')); return t }) } }, 500)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)
  }, [isListening])

  useEffect(() => {
    const handler = () => { if (input.trim()) sendMessage() }
    window.addEventListener('voice-send', handler)
    return () => window.removeEventListener('voice-send', handler)
  }, [input])

  if (!user) return null

  return (
    <>
      {!isOpen && (
        <button className="chat-bubble" onClick={handleOpen} aria-label="Open AI assistant">
          <span className="chat-bubble-icon">🤖</span>
          <span className="chat-bubble-pulse" />
        </button>
      )}

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="chat-header-icon">🤖</span>
              <div>
                <div className="chat-header-title">FoodBridge AI</div>
                <div className="chat-header-sub">
                  {ctxLoading ? '⟳ Syncing live data...' : liveCtx?.listings ? `${liveCtx.listings.total} active listings · Live` : 'Smart Assistant · Always here'}
                </div>
              </div>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
                {msg.role === 'assistant' && <span className="chat-msg-avatar">🤖</span>}
                <div className="chat-msg-bubble">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg chat-msg-assistant">
                <span className="chat-msg-avatar">🤖</span>
                <div className="chat-msg-bubble chat-typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={user?.role === 'donor' ? 'Ask about your listings...' : 'Ask about available food...'}
            />
            <button
              className="chat-send"
              onClick={toggleVoice}
              title={isListening ? 'Stop listening' : 'Voice input'}
              style={{ background: isListening ? '#EF4444' : undefined, animation: isListening ? 'pulse 1s infinite' : undefined }}
            >🎤</button>
            <button className="chat-send" onClick={sendMessage} disabled={!input.trim() || loading}>↑</button>
          </div>
        </div>
      )}
    </>
  )
}