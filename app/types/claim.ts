import type { ClaimType, ClaimStatus, ClaimReasonType, RefundStatus } from './common'

export interface ClaimListItem {
  id: number
  claimNumber?: string
  orderId: number
  orderNumber: string
  claimType: ClaimType
  claimTypeDescription?: string
  status: ClaimStatus
  statusDescription?: string
  reasonType: ClaimReasonType
  reasonTypeDescription?: string
  refundAmount?: number
  itemCount?: number
  representativeProductName?: string | null
  representativeProductThumbnailUrl?: string | null
  requestedAt: string
  createdAt?: string
}

export interface OrderClaimItem {
  orderItemId: number
  productName: string
  variantName?: string | null
  quantity: number
  orderItemStatus?: string
  exchangeVariantId?: number
  exchangeProductName?: string | null
  exchangeVariantName?: string | null
}

export interface OrderClaim {
  claimId: number
  claimType: ClaimType
  status: ClaimStatus
  reasonType: ClaimReasonType
  reason?: string
  requestedAt: string
  processedAt?: string | null
  adminNote?: string | null
  rejectReason?: string | null
  returnShippingCarrier?: string | null
  returnTrackingNumber?: string | null
  returnTrackingUrl?: string | null
  exchangeShippingCarrier?: string | null
  exchangeTrackingNumber?: string | null
  exchangeTrackingUrl?: string | null
  refundAmount?: number | null
  actualRefundAmount?: number | null
  items: OrderClaimItem[]
}

export interface RefundRecord {
  id: number
  refundNumber: string
  paymentNumber?: string
  orderNumber?: string
  amount: number
  reason?: string
  status: RefundStatus
  pgTid?: string | null
  completedAt?: string | null
  createdAt: string
}
