import React, { useState } from 'react'

const ORG_TYPES = [
  { val: 'ngo', label: 'NGO / Non-profit', icon: '🏢' },
  { val: 'shelter', label: 'Shelter / Home', icon: '🏠' },
  { val: 'community', label: 'Community Kitchen', icon: '🍲' },
  { val: 'individual', label: 'Individual', icon: '👤' },
]

const FOOD_PREFS = [
  { val: 'cooked', label: 'Cooked Meals', icon: '🍛' },
  { val: 'raw', label: 'Raw Produce', icon: '🥕' },
  { val: 'packaged', label: 'Packaged Food', icon: '📦' },
  { val: 'bakery', label: 'Bakery Items', icon: '🍞' },
  { val: 'dairy', label: 'Dairy Products', icon: '🥛' },
]

const DISTANCES = [
  { val: 5, label: '5 km' },
  { val: 10, label: '10 km' },
  { val: 15, label: '15 km' },
  { val: 25, label: '25 km' },
]

export default function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(0)
  const [orgType, setOrgType] = useState('')
  const [prefs, setPrefs] = useState([])
  const [maxDist, setMaxDist] = useState(10)

  const togglePref = cat => {
    setPrefs(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const handleComplete = () => {
    const data = { orgType, prefs, maxDist, onboarded: true }
    localStorage.setItem('fb_recipient_prefs', JSON.stringify(data))
    onComplete(data)
  }

  const steps = [
    // Step 1: Org type
    <div className="onboarding-step" key="org">
      <div className="onboarding-emoji">🏢</div>
      <h3 className="onboarding-title">What type of organization are you?</h3>
      <p className="onboarding-desc">This helps us personalize your food matching experience.</p>
      <div className="onboarding-options">
        {ORG_TYPES.map(o => (
          <div
            key={o.val}
            className={`onboarding-option ${orgType === o.val ? 'active' : ''}`}
            onClick={() => setOrgType(o.val)}
          >
            <span>{o.icon}</span> {o.label}
          </div>
        ))}
      </div>
    </div>,
    // Step 2: Food preferences
    <div className="onboarding-step" key="food">
      <div className="onboarding-emoji">🥗</div>
      <h3 className="onboarding-title">What food types do you prefer?</h3>
      <p className="onboarding-desc">Select all that apply. This feeds into our ML matching engine.</p>
      <div className="onboarding-options grid">
        {FOOD_PREFS.map(f => (
          <div
            key={f.val}
            className={`onboarding-option ${prefs.includes(f.val) ? 'active' : ''}`}
            onClick={() => togglePref(f.val)}
          >
            <span>{f.icon}</span> {f.label}
          </div>
        ))}
      </div>
    </div>,
    // Step 3: Max distance
    <div className="onboarding-step" key="dist">
      <div className="onboarding-emoji">📍</div>
      <h3 className="onboarding-title">Maximum pickup distance?</h3>
      <p className="onboarding-desc">We'll only show food listings within this range.</p>
      <div className="onboarding-options">
        {DISTANCES.map(d => (
          <div
            key={d.val}
            className={`onboarding-option ${maxDist === d.val ? 'active' : ''}`}
            onClick={() => setMaxDist(d.val)}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>,
  ]

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Progress */}
        <div className="onboarding-progress">
          {[0, 1, 2].map(i => (
            <div key={i} className={`onboarding-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>

        {steps[step]}

        <div className="onboarding-actions">
          {step > 0 && (
            <button className="onboarding-btn-back" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          )}
          {step < 2 ? (
            <button
              className="onboarding-btn-next"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !orgType}
            >
              Next →
            </button>
          ) : (
            <button className="onboarding-btn-next" onClick={handleComplete}>
              🚀 Start Matching
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
