import { useState } from 'react'
import { useDrinkProgress } from '../DrinkProgressContext'
import './DrinkDebugPanel.css'

/** Dev-only overlay to inspect in-progress drink recipes (also visible in React DevTools). */
function DrinkDebugPanel() {
  const [open, setOpen] = useState(false)
  const {
    drinks,
    drinkAtBase,
    drinkAtWhisking,
    drinkAtTopping,
    whiskingStation,
    benchMatcha,
    baseStation,
    lastOrderSubmission,
    orderSubmissions,
  } = useDrinkProgress()

  if (!import.meta.env.DEV) {
    return null
  }

  const drinkList = Object.values(drinks)

  const snapshot = {
    activeSlots: {
      base: drinkAtBase?.id ?? null,
      whisking: drinkAtWhisking?.id ?? null,
      topping: drinkAtTopping?.id ?? null,
    },
    drinks: drinkList.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      station: d.station,
      status: d.status,
      recipe: d.recipe,
    })),
    whiskingBench: drinkAtWhisking
      ? null
      : {
          bowl: whiskingStation,
          matcha: benchMatcha,
          note: 'No drink on whisking — bowl/matcha here until a cup arrives from base',
        },
    basePitcher: {
      hasMilk: baseStation.pitcherHasMilk,
      milk: baseStation.pitcherMilk,
    },
    lastSubmission: lastOrderSubmission,
    submissionCount: orderSubmissions.length,
    hints: [
      'Pick cup size on base to create a drink object',
      'Topping Ready → DrinkOrderSubmission (see scoring/scoreDrinkOrder.ts)',
      'ice: bucket → Light / Regular popup; temp iced if ice added',
      'milk: carton → cup (hot/iced) or carton → pitcher → heater → cup (hot)',
      'matcha: one whisking tin only (locks grade; extra scoops same tin)',
    ],
  }

  return (
    <aside className="drink-debug-panel" aria-label="Drink state debug">
      <button
        type="button"
        className="drink-debug-panel__toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'Hide drinks' : 'Drinks (dev)'}
      </button>
      {open && (
        <div className="drink-debug-panel__content">
          <div className="drink-debug-panel__title">Drinks (dev)</div>
          <pre className="drink-debug-panel__body">{JSON.stringify(snapshot, null, 2)}</pre>
        </div>
      )}
    </aside>
  )
}

export default DrinkDebugPanel
