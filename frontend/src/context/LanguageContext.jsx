import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * LanguageContext — i18n for FoodBridge
 * Supports English and Tamil for key UI strings.
 */

const TRANSLATIONS = {
  en: {
    // Navbar
    'nav.map': 'Map',
    'nav.donor': 'Donor',
    'nav.recipient': 'Recipient',
    'nav.claims': 'My Claims',
    'nav.forecast': 'Forecast',
    'nav.leaderboard': 'Leaderboard',
    'nav.logout': 'Logout',
    // Pages
    'donor.title': 'Donor Dashboard',
    'donor.subtitle': 'Manage your food surplus listings and track your impact.',
    'donor.post': 'Post New Listing',
    'donor.postBtn': 'Publish Listing',
    'recipient.title': 'ML Matches',
    'recipient.subtitle': 'Top food listings ranked for you by the FoodBridge matching engine.',
    'claims.title': 'My Claims',
    'claims.subtitle': 'Track your food claims and see your personal impact.',
    'map.nearby': 'Nearby Listings',
    'forecast.title': 'Demand Forecast',
    'leaderboard.title': '🏆 Donor Leaderboard',
    // Actions
    'action.claim': 'Claim',
    'action.refresh': '🔄 Refresh',
    'action.pickup': 'Mark Picked Up',
    'action.search': 'Search food...',
    // Impact
    'impact.kgSaved': 'kg food saved',
    'impact.mealsServed': 'meals served',
    'impact.co2Prevented': 'kg CO₂ prevented',
    // General
    'general.loading': 'Loading...',
    'general.noResults': 'No results found',
    'general.language': 'தமிழ்',
  },
  ta: {
    // Navbar
    'nav.map': 'வரைபடம்',
    'nav.donor': 'நன்கொடையாளர்',
    'nav.recipient': 'பெறுநர்',
    'nav.claims': 'எனது கோரிக்கைகள்',
    'nav.forecast': 'கணிப்பு',
    'nav.leaderboard': 'தரவரிசை',
    'nav.logout': 'வெளியேறு',
    // Pages
    'donor.title': 'நன்கொடையாளர் டாஷ்போர்ட்',
    'donor.subtitle': 'உங்கள் உணவு உபரி பட்டியல்களை நிர்வகிக்கவும்.',
    'donor.post': 'புதிய பட்டியல் இடுகை',
    'donor.postBtn': 'பட்டியலை வெளியிடு',
    'recipient.title': 'ML பொருத்தங்கள்',
    'recipient.subtitle': 'FoodBridge ML இயந்திரம் உங்களுக்கு தரவரிசைப்படுத்திய பட்டியல்கள்.',
    'claims.title': 'எனது கோரிக்கைகள்',
    'claims.subtitle': 'உங்கள் உணவு கோரிக்கைகளை கண்காணிக்கவும்.',
    'map.nearby': 'அருகிலுள்ள பட்டியல்கள்',
    'forecast.title': 'தேவை கணிப்பு',
    'leaderboard.title': '🏆 நன்கொடையாளர் தரவரிசை',
    // Actions
    'action.claim': 'கோரிக்கை',
    'action.refresh': '🔄 புதுப்பிக்கவும்',
    'action.pickup': 'பிக்-அப் குறிக்கவும்',
    'action.search': 'உணவைத் தேடு...',
    // Impact
    'impact.kgSaved': 'கிலோ உணவு சேமிக்கப்பட்டது',
    'impact.mealsServed': 'உணவுகள் வழங்கப்பட்டன',
    'impact.co2Prevented': 'கிலோ CO₂ தடுக்கப்பட்டது',
    // General
    'general.loading': 'ஏற்றுகிறது...',
    'general.noResults': 'முடிவுகள் இல்லை',
    'general.language': 'English',
  },
}

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('fb_lang') || 'en')

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'en' ? 'ta' : 'en'
      localStorage.setItem('fb_lang', next)
      return next
    })
  }, [])

  const t = useCallback((key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider')
  return ctx
}
