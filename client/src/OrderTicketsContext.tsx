import { createContext, useContext, type ReactNode } from 'react'
import { useOrderTickets } from './components/OrderTicketBoard'

type OrderTicketsContextValue = ReturnType<typeof useOrderTickets>

const OrderTicketsContext = createContext<OrderTicketsContextValue | null>(null)

type OrderTicketsProviderProps = {
  children: ReactNode
}

export function OrderTicketsProvider({ children }: OrderTicketsProviderProps) {
  const value = useOrderTickets()
  return <OrderTicketsContext.Provider value={value}>{children}</OrderTicketsContext.Provider>
}

export function useOrderTicketsContext() {
  const context = useContext(OrderTicketsContext)
  if (!context) {
    throw new Error('useOrderTicketsContext must be used within an OrderTicketsProvider')
  }
  return context
}
