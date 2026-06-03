import orderTicket from '../assets/station-shared/order-ticket.png'
import { ORDER_TICKET_FIELDS, type TicketStore } from '../hooks/useOrderTickets'

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
            aria-label={`Load order ${ticket.orderNumber}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              onHistoryTicketClick(ticket.orderId)
            }}
          >
            <img className="order-ticket-history-image" src={orderTicket} alt="" draggable="false" />
            <span className="order-ticket-history-label">#{ticket.orderNumber}</span>
          </button>
        ))}
      </div>

      <div className="station-order-ticket-wrap">
        <img className="station-order-ticket" src={orderTicket} alt="" draggable="false" />
        {showOrderTicketText && activeMainTicket && (
          <div className="station-order-ticket-text" aria-label="Customer order details">
            <p className="station-order-ticket-title">ORDER #{activeMainTicket.orderNumber}</p>
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
