import { useCallback, useState } from 'react'
import type { Recipe } from '../types/game'

export type TicketData = {
  orderId: number
  orderNumber: number
  recipe: Recipe
}

export type TicketStore = {
  mainTicket: TicketData | null
  completedTickets: TicketData[]
}

export const ORDER_TICKET_FIELDS: Array<{ label: string; key: keyof Omit<Recipe, 'recipeId'> }> = [
  { label: 'Cup Size', key: 'cupSize' },
  { label: 'Temp', key: 'temp' },
  { label: 'Ice', key: 'iceLevel' },
  { label: 'Milk', key: 'milk' },
  { label: 'Flavor', key: 'flavor' },
  { label: 'Sweetener', key: 'sweetener' },
  { label: 'Sweetness', key: 'sweetnessLevel' },
  { label: 'Matcha', key: 'matcha' },
  { label: 'Cream Top', key: 'creamTop' },
  { label: 'Powder', key: 'powder' },
]

const MAX_COMPLETED_TICKETS = 8

export function useOrderTickets() {
  const [ticketStore, setTicketStore] = useState<TicketStore>({
    mainTicket: null,
    completedTickets: [],
  })
  const [showOrderTicketText, setShowOrderTicketText] = useState(false)
  const [revealedOrderLineCount, setRevealedOrderLineCount] = useState(0)

  const beginNewOrder = useCallback(() => {
    setTicketStore((currentStore) => ({
      mainTicket: null,
      completedTickets: currentStore.mainTicket
        ? [...currentStore.completedTickets, currentStore.mainTicket].slice(-MAX_COMPLETED_TICKETS)
        : currentStore.completedTickets,
    }))
    setShowOrderTicketText(false)
    setRevealedOrderLineCount(0)
  }, [])

  const showGeneratedOrder = useCallback((ticket: TicketData) => {
    setTicketStore((currentStore) => ({ ...currentStore, mainTicket: ticket }))
    setShowOrderTicketText(true)
    setRevealedOrderLineCount(0)
  }, [])

  const revealNextLine = useCallback(() => {
    setRevealedOrderLineCount((currentCount) =>
      Math.min(currentCount + 1, ORDER_TICKET_FIELDS.length),
    )
  }, [])

  const markOrderFullyRevealed = useCallback(() => {
    setRevealedOrderLineCount(ORDER_TICKET_FIELDS.length)
  }, [])

  const swapMainWithHistory = useCallback((selectedOrderId: number) => {
    setTicketStore((currentStore) => {
      const selectedIndex = currentStore.completedTickets.findIndex(
        (ticket) => ticket.orderId === selectedOrderId,
      )
      if (selectedIndex < 0) {
        return currentStore
      }

      const selectedTicket = currentStore.completedTickets[selectedIndex]
      const remainingTickets = currentStore.completedTickets.filter(
        (ticket) => ticket.orderId !== selectedOrderId,
      )

      return {
        mainTicket: selectedTicket,
        completedTickets: currentStore.mainTicket
          ? [...remainingTickets, currentStore.mainTicket].slice(-MAX_COMPLETED_TICKETS)
          : remainingTickets,
      }
    })
    setShowOrderTicketText(true)
    setRevealedOrderLineCount(ORDER_TICKET_FIELDS.length)
  }, [])

  const consumeTicket = useCallback((orderId: number) => {
    setTicketStore((currentStore) => {
      const isMainTicketConsumed = currentStore.mainTicket?.orderId === orderId

      return {
        mainTicket: isMainTicketConsumed ? null : currentStore.mainTicket,
        completedTickets: currentStore.completedTickets.filter(
          (ticket) => ticket.orderId !== orderId,
        ),
      }
    })
    setShowOrderTicketText(false)
    setRevealedOrderLineCount(0)
  }, [])

  const resetTickets = useCallback(() => {
    setTicketStore({
      mainTicket: null,
      completedTickets: [],
    })
    setShowOrderTicketText(false)
    setRevealedOrderLineCount(0)
  }, [])

  return {
    ticketStore,
    showOrderTicketText,
    revealedOrderLineCount,
    beginNewOrder,
    showGeneratedOrder,
    revealNextLine,
    markOrderFullyRevealed,
    swapMainWithHistory,
    consumeTicket,
    resetTickets,
  }
}
