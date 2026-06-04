import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  TutorialContext,
  type BaseStationTutorialStep,
  type OrderStationTutorialStep,
  type ToppingStationTutorialStep,
  type WhiskingStationTutorialStep,
} from './TutorialContext'
import { useAuth } from './auth'

type TutorialSession = {
  userId: string
  orderStationStep: OrderStationTutorialStep
  baseStationStep: BaseStationTutorialStep
  whiskingStationStep: WhiskingStationTutorialStep
  toppingStationStep: ToppingStationTutorialStep
  hasSeenFirstDrinkCongrats: boolean
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

  const baseStationStep =
    profile?.tutorialCompleted === false
      ? tutorialSession?.userId === profile.userId
        ? tutorialSession.baseStationStep
        : 'choose-cup'
      : null

  const toppingStationStep =
    profile?.tutorialCompleted === false
      ? tutorialSession?.userId === profile.userId
        ? tutorialSession.toppingStationStep
        : 'review-cream-top'
      : null
  const hasSeenFirstDrinkCongrats =
    profile?.tutorialCompleted === false &&
    tutorialSession?.userId === profile.userId &&
    tutorialSession.hasSeenFirstDrinkCongrats

  const setOrderStationStep = useCallback(
    (step: OrderStationTutorialStep) => {
      if (!profile || profile.tutorialCompleted) {
        return
      }

      setTutorialSession((prev) => ({
        userId: profile.userId,
        orderStationStep: step,
        baseStationStep: prev?.baseStationStep || 'choose-cup',
        whiskingStationStep: prev?.whiskingStationStep || 'welcome',
        toppingStationStep: prev?.toppingStationStep || 'review-cream-top',
        hasSeenFirstDrinkCongrats: prev?.hasSeenFirstDrinkCongrats || false,
      }))
    },
    [profile],
  )

  const setBaseStationStep = useCallback(
    (step: BaseStationTutorialStep) => {
      if (!profile || profile.tutorialCompleted) {
        return
      }

      setTutorialSession((prev) => ({
        userId: profile.userId,
        orderStationStep: prev?.orderStationStep || 'welcome',
        baseStationStep: step,
        whiskingStationStep: prev?.whiskingStationStep || 'welcome',
        toppingStationStep: prev?.toppingStationStep || 'review-cream-top',
        hasSeenFirstDrinkCongrats: prev?.hasSeenFirstDrinkCongrats || false,
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
        baseStationStep: prev?.baseStationStep || 'choose-cup',
        whiskingStationStep: step,
        toppingStationStep: prev?.toppingStationStep || 'review-cream-top',
        hasSeenFirstDrinkCongrats: prev?.hasSeenFirstDrinkCongrats || false,
      }))
    },
    [profile],
  )

  const setToppingStationStep = useCallback(
    (step: ToppingStationTutorialStep) => {
      if (!profile || profile.tutorialCompleted) {
        return
      }

      setTutorialSession((prev) => ({
        userId: profile.userId,
        orderStationStep: prev?.orderStationStep || 'welcome',
        baseStationStep: prev?.baseStationStep || 'choose-cup',
        whiskingStationStep: prev?.whiskingStationStep || 'welcome',
        toppingStationStep: step,
        hasSeenFirstDrinkCongrats: prev?.hasSeenFirstDrinkCongrats || false,
      }))
    },
    [profile],
  )

  const completeFirstDrinkTutorial = useCallback(() => {
    if (!profile || profile.tutorialCompleted) {
      return
    }

    setTutorialSession((prev) => ({
      userId: profile.userId,
      orderStationStep: prev?.orderStationStep || 'complete',
      baseStationStep: 'complete',
      whiskingStationStep: 'complete',
      toppingStationStep: 'complete',
      hasSeenFirstDrinkCongrats: true,
    }))
  }, [profile])

  const resetTutorialProgress = useCallback(() => {
    setTutorialSession(null)
  }, [])

  const value = useMemo(
    () => ({
      orderStationStep,
      setOrderStationStep,
      baseStationStep,
      setBaseStationStep,
      whiskingStationStep,
      setWhiskingStationStep,
      toppingStationStep,
      setToppingStationStep,
      hasSeenFirstDrinkCongrats,
      completeFirstDrinkTutorial,
      resetTutorialProgress,
    }),
    [
      orderStationStep,
      setOrderStationStep,
      baseStationStep,
      setBaseStationStep,
      whiskingStationStep,
      setWhiskingStationStep,
      toppingStationStep,
      setToppingStationStep,
      hasSeenFirstDrinkCongrats,
      completeFirstDrinkTutorial,
      resetTutorialProgress,
    ],
  )

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
}
