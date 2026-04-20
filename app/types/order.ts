import type { OrderStatus } from './common'

export interface OrderListItem {
  id: number
  orderId?: number
  orderNumber: string
  recipientName?: string
  status: OrderStatus
  grandTotal?: number
  createdAt?: string
}

export interface OrderItem {
  orderItemId: number
  id?: number
  productId?: number
  productName: string
  variantId?: number
  variantName?: string | null
  quantity: number
  price?: number
  totalPrice?: number
  status?: string
}

export interface OrderCustomer {
  userId?: number
  name?: string
  grade?: string
  phone?: string
  email?: string
}

export interface OrderShipping {
  recipientName?: string
  recipientPhone?: string
  postalCode?: string
  address?: string
  addressDetail?: string
  requestMessage?: string
}

export interface OrderPayment {
  method?: string
  cardCompany?: string
  cardNumber?: string
  installment?: number
  status?: string
  paidAt?: string | null
}

export interface OrderSummary {
  itemsTotal?: number
  shippingFee?: number
  couponDiscount?: number
  pointUsed?: number
  grandTotal?: number
}

export interface OrderHistoryEntry {
  status?: string
  type?: string
  at?: string
  createdAt?: string
  message?: string
  description?: string
  note?: string
}

export interface OrderDetail {
  orderId: number
  orderNumber: string
  status: OrderStatus
  orderedAt?: string
  customer?: OrderCustomer
  payment?: OrderPayment
  shipping?: OrderShipping
  items?: OrderItem[]
  summary?: OrderSummary
  history?: OrderHistoryEntry[]
  combinedHistory?: OrderHistoryEntry[]
  grandTotal?: number
}
