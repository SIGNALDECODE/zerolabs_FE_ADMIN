import type { OrderStatus } from './common'

/**
 * 백엔드 `OrderListResponse` 와 1:1 매핑.
 * 목록 API 는 `recipientName` 을 내려주지 않고, 대신 `productName`(대표 상품) 과
 * `productThumbnailUrl` 을 제공한다. 주문일은 `orderedAt` (not createdAt).
 */
export interface OrderListItem {
  id: number
  orderNumber: string
  orderedAt: string
  /** 비회원 주문이면 null */
  userId: number | null
  phone?: string | null
  address?: string | null
  itemCount: number
  paymentMethod?: string | null
  grandTotal: number
  status: OrderStatus
  productName?: string | null
  productThumbnailUrl?: string | null
}

/** 백엔드 `OrderItemInfo` */
export interface OrderItem {
  orderItemId: number
  imageUrl?: string | null
  productName: string
  variantName?: string | null
  options?: string[]
  quantity: number
  unitPrice: number
  subtotal: number
  orderItemStatus?: string
}

/**
 * 백엔드 `CustomerInfo`
 * - 비회원 주문이면 `userId == null` 이고 `name === "비회원"` 으로 내려옴
 *   (phone/email 은 `Order.guestPhone` / `Order.guestEmail` 에서 채워짐)
 */
export interface OrderCustomer {
  userId?: number | null
  name?: string
  grade?: string
  phone?: string
  email?: string
}

/** 백엔드 `ShippingInfo` */
export interface OrderShipping {
  recipientName?: string
  recipientPhone?: string
  postalCode?: string
  address?: string
  deliveryMessage?: string | null
  carrierCode?: string | null
  carrierName?: string | null
  trackingNumber?: string | null
}

/** 백엔드 `PaymentInfo` */
export interface OrderPayment {
  method?: string
  cardCompany?: string | null
  cardNumber?: string | null
  installment?: number
  status?: string
  paidAt?: string | null
  transactionId?: string | null
}

/** 백엔드 `OrderSummary` */
export interface OrderSummary {
  subtotal?: number
  discountTotal?: number
  shippingTotal?: number
  grandTotal?: number
}

/** 백엔드 `OrderHistoryInfo` */
export interface OrderHistoryEntry {
  fromStatus?: string
  toStatus?: string
  reason?: string | null
  createdAt?: string
  createdByName?: string
}

/** 백엔드 `CombinedHistoryInfo` — 주문/클레임 통합 이력 */
export interface CombinedHistoryEntry {
  type: 'ORDER' | 'CLAIM' | string
  claimType?: string | null
  claimId?: number | null
  fromStatus?: string
  toStatus?: string
  createdAt?: string
  createdByName?: string
  note?: string | null
}

/** 백엔드 `ShipmentItemInfo` */
export interface OrderShipmentItem {
  orderItemId: number
  quantity: number
}

/** 백엔드 `ShipmentInfo` */
export interface OrderShipment {
  shipmentId: number
  shipmentNumber: string
  carrierCode?: string | null
  carrierName?: string | null
  trackingNumber?: string | null
  status: string
  shippedAt?: string | null
  deliveredAt?: string | null
  items: OrderShipmentItem[]
}

/** 백엔드 `OrderDetailResponse` */
export interface OrderDetail {
  orderId: number
  orderNumber: string
  status: OrderStatus
  orderedAt?: string
  customer?: OrderCustomer
  payment?: OrderPayment
  shipping?: OrderShipping
  shipments?: OrderShipment[]
  items?: OrderItem[]
  summary?: OrderSummary
  history?: OrderHistoryEntry[]
  combinedHistory?: CombinedHistoryEntry[]
}
