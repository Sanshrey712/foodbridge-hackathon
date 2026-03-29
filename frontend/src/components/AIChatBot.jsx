import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''

function getSystemPrompt(user, hour) {
  const role = user?.role || 'user'
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const name = user?.name || localStorage.getItem('fb_user_name') || ''

  const base = `You are FoodBridge AI, a helpful assistant for a food redistribution platform in Chennai, India.
${name ? `The user's name is ${name}.` : ''}
Current time period: ${period}. User role: ${role}.
Keep ALL responses under 80 words. Be warm, practical, and use 1-2 emojis max.
Only discuss food donation, claiming, the app features, or Chennai food waste topics.
Never make up data. If unsure, suggest they check the app.`

  if (role === 'donor') {
    return base + `

The user is a FOOD DONOR posting surplus food.
App features they can use: Dashboard (post listings), Map (see activity), Forecast (predict demand), Leaderboard (rankings).
Key tips: Post cooked food 30min before meal peaks (7AM, 1PM, 7PM). Specific titles get claimed faster. Set expiry to 4-6h for cooked food.`
  }

  return base + `

The user is a FOOD RECIPIENT or NGO looking to claim food.
App features they can use: Map (find listings), Matches (ML-ranked listings), My Claims (track pickups), Forecast (plan ahead).
Key tips: Match score = urgency(35%) + distance(30%) + category(20%) + quantity(15%). Check app at 7-9AM and 6-9PM for freshest listings.`
}

// Smart keyword-based fallback for when API is unavailable
function getSmartFallback(userMessage, role) {
  const msg = userMessage.toLowerCase()

  if (msg.match(/^(hi|hello|hey|hii+|yo)\b/)) {
    return role === 'donor'
      ? "Hey! 👋 I can help you post food smarter and track your impact. What do you have today?"
      : "Hey! 👋 I can help you find food nearby and understand your match scores. What are you looking for?"
  }
  if (msg.includes('map')) return "The Map page 🗺️ shows all active listings near you. Green pins = available, grey = claimed. Try the heatmap toggle for density view!"
  if (msg.includes('claim')) return "To claim: Map or Matches → click listing → Claim button. After pickup, mark it collected in My Claims. 🎉"
  if (msg.includes('score') || msg.includes('match')) return "Match score = urgency 35% + distance 30% + your category preference 20% + quantity 15%. Above 75% is excellent! 🎯"
  if (msg.includes('when') || msg.includes('peak') || msg.includes('time')) return "⏰ Peak donation times: 7–9 AM (breakfast), 1–2 PM (lunch), 7–9 PM (dinner). Post 30min before for fastest claims!"
  if (msg.includes('post') || msg.includes('list') || msg.includes('add')) return "Dashboard → fill title + category + quantity + expiry → Publish! Specific titles like 'Biryani — 20 portions' claim 3x faster. 🚀"
  if (msg.includes('forecast')) return "Forecast page 📊 predicts food surplus by category for next 12h using ML. Great for planning when to post or pickup!"
  if (msg.includes('leaderboard') || msg.includes('rank')) return "Leaderboard 🏆 ranks donors by kg donated. Every kg = 4 meals. Top 3 get medals!"
  if (msg.includes('expir')) return "⚡ 'EXPIRING' badges = under 1 hour left. Those have highest match scores — claim them first!"
  if (msg.includes('categor') || msg.includes('type')) {
    return role === 'donor'
      ? "Cooked food 🍛 claims fastest (1-2h). Bakery 🍞 peaks mornings. Packaged 📦 lasts up to 48h."
      : "Set preferred categories in Matches page for better recommendations. Cooked = fastest, Packaged = most flexible."
  }
  if (msg.includes('thank') || msg.includes('great') || msg.includes('awesome')) {
    return role === 'donor' ? "You're making Chennai better! 🌿 Every kg = 4 meals for someone in need." : "Happy to help! 🌿 Don't forget to mark pickups as collected!"
  }
  if (msg.includes('help') || msg.includes('what')) {
    return role === 'donor'
      ? "I can help with: posting tips, best times to donate, reading forecast data, and understanding your stats. Ask away!"
      : "I can help with: finding food, match scores, pickup planning, and using app features. Ask away!"
  }

  // Vary default by message so it doesn't repeat
  const donorTips = [
    "Tip: Set expiry to 4-6h for cooked food and 48h for packaged. Accurate expiry = more claims! ⏱️",
    "Check the Forecast page before posting — it shows which categories are in demand right now. 📊",
    "Your Dashboard shows claim rate. Below 60%? Try more specific titles and shorter expiry windows.",
    "Cooked food posted at 7PM gets claimed within 30min on average in Chennai. Timing matters! 🍛",
  ]
  const recipientTips = [
    "Check the heatmap 🔥 on Map page to spot which areas have the most active listings right now.",
    "Listings expiring in under 2h appear as larger blobs on the heatmap — grab those first! ⚡",
    "Set your max distance to 5km in Matches for fresher food and faster pickups. 📍",
    "ML Matches page ranks food specifically for you — better than browsing the full map! 🎯",
  ]
  const tips = role === 'donor' ? donorTips : recipientTips
  return tips[(userMessage.length + (userMessage.charCodeAt(0) || 0)) % tips.length]
}

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const messagesEndRef = useRef(null)
  const { user } = useAuth()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleOpen = () => {
    setIsOpen(true)
    if (!hasGreeted) {
      const name = user?.name || localStorage.getItem('fb_user_name') || ''
      const firstName = name ? ' ' + name.split(' ')[0] : ''
      const greeting = user?.role === 'donor'
        ? `Hi${firstName}! 👋 I'm your FoodBridge AI. I can help you post smarter, pick the best times, and track your impact. What food do you have today?`
        : `Hi${firstName}! 👋 I'm your FoodBridge AI. I can help you find food, understand match scores, and plan pickups. What are you looking for?`
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

    // No API key — use smart fallback immediately
    if (!OPENROUTER_API_KEY) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: getSmartFallback(userInput, user?.role) }])
        setLoading(false)
      }, 500)
      return
    }

    try {
      const hour = new Date().getHours()
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'FoodBridge',
        },
        body: JSON.stringify({
          // anthropic/claude-haiku-4-5 is reliable on OpenRouter free tier
          model: 'anthropic/claude-haiku-4-5',
          messages: [
            { role: 'user', content: getSystemPrompt(user, hour) + '\n\n---\nNow respond to the user.' },
            ...messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userInput },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('OpenRouter error:', response.status, errText)
        throw new Error(`${response.status}`)
      }

      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content?.trim()

      if (reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      } else {
        throw new Error('Empty response')
      }
    } catch (err) {
      console.error('Chat error:', err)
      // Always give a useful response, never show raw error
      setMessages(prev => [...prev, { role: 'assistant', content: getSmartFallback(userInput, user?.role) }])
    } finally {
      setLoading(false)
    }
  }

  // ── Voice Input (Web Speech API) ──
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'assistant', content: '🎤 Voice input is not supported in this browser. Try Chrome!' }])
      return
    }
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
      // Auto-send after a short delay so user sees the text
      setTimeout(() => {
        setInput(prev => {
          if (prev.trim()) {
            // Trigger send
            const fakeEvent = new Event('voice-send')
            window.dispatchEvent(fakeEvent)
          }
          return prev
        })
      }, 500)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)
  }, [isListening])

  // Listen for voice auto-send
  useEffect(() => {
    const handler = () => {
      if (input.trim()) sendMessage()
    }
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
                  {OPENROUTER_API_KEY ? 'Powered by Claude · Always here' : 'Smart Assistant · Always here'}
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
                <div className="chat-msg-bubble chat-typing">
                  <span /><span /><span />
                </div>
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
              placeholder={user?.role === 'donor' ? 'Ask about posting food...' : 'Ask about finding food...'}
            />
            <button
              className="chat-send"
              onClick={toggleVoice}
              title={isListening ? 'Stop listening' : 'Voice input'}
              style={{
                background: isListening ? '#EF4444' : undefined,
                color: isListening ? '#fff' : undefined,
                animation: isListening ? 'pulse 1s infinite' : undefined,
              }}
            >
              🎤
            </button>
            <button
              className="chat-send"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  )
}