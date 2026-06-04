import { createContext, useContext } from 'react'

export type OrderStationTutorialStep =
  | 'welcome'
  | 'take-order'
  | 'customer-talking'
  | 'order-ticket'
  | 'complete'

export type WhiskingStationTutorialStep =
  | 'welcome'
  | 'add-matcha'
  | 'add-water'
  | 'whisk'
  | 'pour-into-cup'
  | 'go-to-topping'
  | 'complete'

export type BaseStationTutorialStep =
  | 'choose-cup'
  | 'add-ice'
  | 'add-milk'
  | 'review-flavor'
  | 'review-sweetener'
  | 'send-to-whisking'
  | 'go-to-whisking'
  | 'complete'

export type ToppingStationTutorialStep =
  | 'review-cream-top'
  | 'review-powder'
  | 'send-to-customer'
  | 'complete'

type TutorialContextValue = {
  orderStationStep: OrderStationTutorialStep | null
  setOrderStationStep: (step: OrderStationTutorialStep) => void
  baseStationStep: BaseStationTutorialStep | null
  setBaseStationStep: (step: BaseStationTutorialStep) => void
  whiskingStationStep: WhiskingStationTutorialStep | null
  setWhiskingStationStep: (step: WhiskingStationTutorialStep) => void
  toppingStationStep: ToppingStationTutorialStep | null
  setToppingStationStep: (step: ToppingStationTutorialStep) => void
  hasSeenFirstDrinkCongrats: boolean
  completeFirstDrinkTutorial: () => void
  resetTutorialProgress: () => void
}

export const TutorialContext = createContext<TutorialContextValue | null>(null)

export function useTutorialContext() {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorialContext must be used within a TutorialProvider')
  }
  return context
}
