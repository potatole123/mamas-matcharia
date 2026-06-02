import { createContext, useContext } from 'react'

export type OrderStationTutorialStep =
  | 'welcome'
  | 'take-order'
  | 'customer-talking'
  | 'order-ticket'
  | 'complete'

type TutorialContextValue = {
  orderStationStep: OrderStationTutorialStep | null
  setOrderStationStep: (step: OrderStationTutorialStep) => void
}

export const TutorialContext = createContext<TutorialContextValue | null>(null)

export function useTutorialContext() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorialContext must be used within a TutorialProvider')
  }
  return context
}
