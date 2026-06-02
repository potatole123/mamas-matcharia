import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { TutorialContext, type OrderStationTutorialStep } from './TutorialContext'
import { useAuth } from './auth'

type TutorialSession = {
  userId: string
  orderStationStep: OrderStationTutorialStep
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

  const setOrderStationStep = useCallback(
    (step: OrderStationTutorialStep) => {
      if (!profile || profile.tutorialCompleted) {
        return
      }

      setTutorialSession({
        userId: profile.userId,
        orderStationStep: step,
      })
    },
    [profile],
  )
  const value = useMemo(
    () => ({
      orderStationStep,
      setOrderStationStep,
    }),
    [orderStationStep, setOrderStationStep],
  )

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
}
