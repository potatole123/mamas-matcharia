import { useCallback, useRef, useState } from 'react'
import orderTicket from '../assets/station-shared/order-ticket.png'
import {
  CREAM_TOP_TYPES,
  CUP_SIZES,
  FLAVOR_TYPES,
  ICE_LEVELS,
  MATCHA_TYPES,
  MILK_TYPES,
  POWDER_TYPES,
  SWEETENER_TYPES,
  SWEETNESS_LEVELS,
  TEMPS,
  type Recipe,
} from '../types/recipe'

export type TicketData = {
  orderId: number
  recipe: Recipe
}

export type TicketStore = {
  mainTicket: TicketData | null
  completedTickets: TicketData[]
}

const DISPLAYED_RECIPE_KEYS: Array<keyof Omit<Recipe, 'recipeId'>> = [
  'cupSize',
  'temp',
  'iceLevel',
  'matcha',
  'milk',
  'flavor',
  'sweetener',
  'sweetnessLevel',
  'creamTop',
  'powder',
]

export const ORDER_TICKET_FIELDS: Array<{ label: string; key: keyof Omit<Recipe, 'recipeId'> }> = [
  { label: 'Cup Size', key: 'cupSize' },
  { label: 'Temp', key: 'temp' },
  { label: 'Ice', key: 'iceLevel' },
  { label: 'Matcha', key: 'matcha' },
  { label: 'Milk', key: 'milk' },
  { label: 'Flavor', key: 'flavor' },
  { label: 'Sweetener', key: 'sweetener' },
  { label: 'Sweetness', key: 'sweetnessLevel' },
  { label: 'Cream Top', key: 'creamTop' },
  { label: 'Powder', key: 'powder' },
]

const MAX_COMPLETED_TICKETS = 8

function randomChoice<T>(values: readonly T[]): T {
  const randomIndex = Math.floor(Math.random() * values.length)
  return values[randomIndex]
}

function generateRandomRecipe(recipeIdSeed: number): Recipe {
  return {
    recipeId: `recipe-demo-${recipeIdSeed}`,
    cupSize: randomChoice(CUP_SIZES),
    temp: randomChoice(TEMPS),
    iceLevel: randomChoice(ICE_LEVELS),
    matcha: randomChoice(MATCHA_TYPES),
    milk: randomChoice(MILK_TYPES),
    flavor: randomChoice(FLAVOR_TYPES),
    sweetener: randomChoice(SWEETENER_TYPES),
    sweetnessLevel: randomChoice(SWEETNESS_LEVELS),
    creamTop: randomChoice(CREAM_TOP_TYPES),
    powder: randomChoice(POWDER_TYPES),
  }
}

function hasSameDisplayedValues(a: Recipe, b: Recipe): boolean {
  return DISPLAYED_RECIPE_KEYS.every((key) => a[key] === b[key])
}

function generateDifferentRecipe(previousRecipe: Recipe, recipeIdSeed: number): Recipe {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = generateRandomRecipe(recipeIdSeed + attempt)
    if (!hasSameDisplayedValues(candidate, previousRecipe)) {
      return candidate
    }
  }

  return generateRandomRecipe(recipeIdSeed + 99)
}

export function useOrderTickets() {
  const [ticketStore, setTicketStore] = useState<TicketStore>({
    mainTicket: null,
    completedTickets: [],
  })
  const [showOrderTicketText, setShowOrderTicketText] = useState(false)
  const [revealedOrderLineCount, setRevealedOrderLineCount] = useState(0)
  const nextOrderIdRef = useRef(1)
  const lastGeneratedRecipeRef = useRef<Recipe>(generateRandomRecipe(1))

  const beginNewOrder = useCallback((): TicketData => {
    const orderId = nextOrderIdRef.current
    nextOrderIdRef.current += 1

    setTicketStore((currentStore) => ({
      mainTicket: null,
      completedTickets: currentStore.mainTicket
        ? [...currentStore.completedTickets, currentStore.mainTicket].slice(-MAX_COMPLETED_TICKETS)
        : currentStore.completedTickets,
    }))
    setShowOrderTicketText(false)
    setRevealedOrderLineCount(0)

    const generatedRecipe = generateDifferentRecipe(lastGeneratedRecipeRef.current, orderId)
    lastGeneratedRecipeRef.current = generatedRecipe
    return { orderId, recipe: generatedRecipe }
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

  return {
    ticketStore,
    showOrderTicketText,
    revealedOrderLineCount,
    beginNewOrder,
    showGeneratedOrder,
    revealNextLine,
    markOrderFullyRevealed,
    swapMainWithHistory,
  }
}

type OrderTicketBoardProps = {
  ticketStore: TicketStore
  showOrderTicketText: boolean
  revealedOrderLineCount: number
  onHistoryTicketClick: (orderId: number) => void
  disabled?: boolean
}

function OrderTicketBoard({
  ticketStore,
  showOrderTicketText,
  revealedOrderLineCount,
  onHistoryTicketClick,
  disabled = false,
}: OrderTicketBoardProps) {
  const activeMainTicket = ticketStore.mainTicket

  return (
    <>
      <div className="order-ticket-history" aria-label="Completed orders">
        {ticketStore.completedTickets.map((ticket) => (
          <button
            key={ticket.orderId}
            className="order-ticket-history-item"
            type="button"
            aria-label={`Load order ${ticket.orderId}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              onHistoryTicketClick(ticket.orderId)
            }}
          >
            <img className="order-ticket-history-image" src={orderTicket} alt="" draggable="false" />
            <span className="order-ticket-history-label">#{ticket.orderId}</span>
          </button>
        ))}
      </div>

      <div className="station-order-ticket-wrap">
        <img className="station-order-ticket" src={orderTicket} alt="" draggable="false" />
        {showOrderTicketText && activeMainTicket && (
          <div className="station-order-ticket-text" aria-label="Customer order details">
            <p className="station-order-ticket-title">ORDER #{activeMainTicket.orderId}</p>
            <ul className="station-order-ticket-list">
              {ORDER_TICKET_FIELDS.slice(0, revealedOrderLineCount).map((field) => (
                <li key={field.key}>
                  <span>{field.label}</span>
                  <span>{activeMainTicket.recipe[field.key]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

export default OrderTicketBoard
