import React, { useMemo } from 'react'

const TIME_SUGGESTIONS = {
  morning: {
    range: [6, 11],
    message: "🌅 It's morning — breakfast surplus gets claimed fast! Post leftover idli, dosa, or bread.",
    titles: {
      cooked: ['Fresh Breakfast Meals', 'Morning Idli & Sambar', 'Leftover Poha & Upma'],
      raw: ['Fresh Morning Vegetables', 'Today\'s Market Produce'],
      packaged: ['Sealed Breakfast Packs', 'Cereal & Snack Boxes'],
      bakery: ['Fresh Morning Breads', 'Bakery Surplus — Croissants & Buns'],
      dairy: ['Fresh Milk & Curd', 'Morning Dairy — Paneer & Butter'],
    }
  },
  lunch: {
    range: [11, 15],
    message: "🍛 It's lunchtime — cooked food claims peak NOW! Post lunch meals for fastest pickup.",
    titles: {
      cooked: ['Fresh Lunch Meals — Rice & Curry', 'Biryani — Ready to Serve', 'Lunch Boxes Available'],
      raw: ['Fresh Vegetables for Cooking', 'Raw Ingredients — Rice & Dal'],
      packaged: ['Packed Lunch Boxes', 'Sealed Meal Trays'],
      bakery: ['Fresh Afternoon Pastries', 'Bread & Sandwich Surplus'],
      dairy: ['Fresh Paneer & Curd', 'Dairy Products — Use Today'],
    }
  },
  evening: {
    range: [15, 19],
    message: "🌇 Evening approaching — snack and tea-time items get claimed quickly!",
    titles: {
      cooked: ['Evening Snacks Available', 'Tea-time Samosa & Vada'],
      raw: ['End-of-Day Produce', 'Fresh Veggies — Must Use Today'],
      packaged: ['Snack Packs Available', 'Biscuits & Chips Surplus'],
      bakery: ['Evening Bakery Surplus', 'Cakes & Pastries — End of Day'],
      dairy: ['Evening Dairy — Must Consume Today', 'Fresh Lassi & Buttermilk'],
    }
  },
  dinner: {
    range: [19, 23],
    message: "🌙 Dinner time — surplus dinner meals are in high demand. Post now!",
    titles: {
      cooked: ['Dinner Surplus — Rice & Curry', 'Evening Meals Available', 'Fresh Dinner Portions'],
      raw: ['Fresh Produce — Last Call', 'Raw Ingredients Available'],
      packaged: ['Sealed Dinner Packs', 'Ready-to-Eat Meals'],
      bakery: ['Closing Time Bakery Surplus', 'Bread & Rolls — Must Go'],
      dairy: ['Dairy Products — Use Tonight', 'Fresh Milk & Curd'],
    }
  },
}

function getTimePeriod(hour) {
  for (const [period, config] of Object.entries(TIME_SUGGESTIONS)) {
    if (hour >= config.range[0] && hour < config.range[1]) return period
  }
  return 'lunch'
}

export default function SmartSuggestions({ category, onSuggestTitle }) {
  const suggestion = useMemo(() => {
    const hour = new Date().getHours()
    const period = getTimePeriod(hour)
    const config = TIME_SUGGESTIONS[period]
    const titles = config.titles[category] || config.titles.cooked
    return { message: config.message, titles }
  }, [category])

  return (
    <div className="smart-suggestion">
      <div className="smart-suggestion-header">
        <span className="smart-suggestion-badge">🧠 AI Suggestion</span>
      </div>
      <div className="smart-suggestion-message">{suggestion.message}</div>
      <div className="smart-suggestion-titles">
        <span className="smart-suggestion-label">Quick titles:</span>
        {suggestion.titles.map(t => (
          <button
            key={t}
            className="smart-suggestion-chip"
            onClick={() => onSuggestTitle(t)}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
