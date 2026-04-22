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

/**
 * 백엔드 `OrderClaimResponse.ClaimItemInfo`
 * - 옵션값 단위 모델 전환 후 variant 관련 필드는 모두 제거됨
 * - 옵션 정보는 `selectedOptions` (주문 시점 스냅샷) 만 내려옴
 */
export interface ClaimItemSelectedOption {
  optionName?: string
  valueName?: string
  additionalPrice?: number
  [key: string]: unknown
}

export interface OrderClaimItem {
  orderItemId: number
  productName: string
  selectedOptions?: ClaimItemSelectedOption[] | null
  quantity: number
  orderItemStatus?: string
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
