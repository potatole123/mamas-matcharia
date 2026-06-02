import type { ReactNode } from 'react'
import { OrderTicketsContext } from './OrderTicketsContext'
import { useOrderTickets } from './hooks/useOrderTickets'

export function OrderTicketsProvider({ children }: { children: ReactNode }) {
  const value = useOrderTickets()
  return <OrderTicketsContext.Provider value={value}>{children}</OrderTicketsContext.Provider>
}
