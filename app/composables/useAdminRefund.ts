import type { RefundRecord } from '~/types/claim'
import type { ClaimType, ClaimReasonType, ClaimStatus } from '~/types/common'

/** BE `RefundRequest.ClaimItemRequest` (환불용 — ClaimItemRequest 와 별도) */
export interface RefundClaimItem {
  orderItemId: number
  quantity: number
}

/**
 * BE `RefundRequest`.
 * - 클레임 연동: claimId + fromStatus 필수
 * - 단독 환불: orderId + claimType + reasonType + claimItems 필수
 */
export interface RefundProcessBody {
  claimId?: number | null
  fromStatus?: ClaimStatus
  orderId?: number | null
  claimType?: ClaimType
  reasonType?: ClaimReasonType
  claimItems?: RefundClaimItem[]
  reason: string
  amount?: number
  deductShippingFee?: boolean
  deductReturnFee?: boolean
  deductOriginalFee?: boolean
  restoreStock?: boolean
}

export const useAdminRefund = () => {
  const api = useApi()

  return {
    process: (body: RefundProcessBody) => api.post<RefundRecord>('/admin/refunds', body),
    listByOrder: (orderId: number) => api.get<RefundRecord[]>(`/admin/refunds/orders/${orderId}`)
  }
}
