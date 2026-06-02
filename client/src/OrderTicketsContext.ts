import { createContext, useContext } from 'react'
import type { useOrderTickets } from './hooks/useOrderTickets'

type OrderTicketsContextValue = ReturnType<typeof useOrderTickets>

export const OrderTicketsContext = createContext<OrderTicketsContextValue | null>(null)

export function useOrderTicketsContext() {
  const context = useContext(OrderTicketsContext)
  if (!context) {
    throw new Error('useOrderTicketsContext must be used within an OrderTicketsProvider')
  }
  return context
}
