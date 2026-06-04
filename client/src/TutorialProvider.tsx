import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  TutorialContext,
  type OrderStationTutorialStep,
  type WhiskingStationTutorialStep,
} from './TutorialContext'
import { useAuth } from './auth'

type TutorialSession = {
  userId: string
  orderStationStep: OrderStationTutorialStep
  whiskingStationStep: WhiskingStationTutorialStep
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [tutorialSession, setTutorialSession] = useState<TutorialSession | null>(null)
  const orderStationStep =
    profile?.tutorialCompleted === false
      ? tutorialSession?.userId === profile.userId
        ? tutorialSession.orderStationStep
        : 'welcome'
      : null

  const whiskingStationStep =
    profile?.tutorialCompleted === false
      ? tutorialSession?.userId === profile.userId
        ? tutorialSession.whiskingStationStep
        : 'welcome'
      : null

  const setOrderStationStep = useCallback(
    (step: OrderStationTutorialStep) => {
      if (!profile || profile.tutorialCompleted) {
        return
      }

      setTutorialSession((prev) => ({
        userId: profile.userId,
        orderStationStep: step,
        whiskingStationStep: prev?.whiskingStationStep || 'welcome',
      }))
    },
    [profile],
  )

  const setWhiskingStationStep = useCallback(
    (step: WhiskingStationTutorialStep) => {
      if (!profile || profile.tutorialCompleted) {
        return
      }

      setTutorialSession((prev) => ({
        userId: profile.userId,
        orderStationStep: prev?.orderStationStep || 'welcome',
        whiskingStationStep: step,
      }))
    },
    [profile],
  )

  const value = useMemo(
    () => ({
      orderStationStep,
      setOrderStationStep,
      whiskingStationStep,
      setWhiskingStationStep,
    }),
    [orderStationStep, setOrderStationStep, whiskingStationStep, setWhiskingStationStep],
  )

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
}
