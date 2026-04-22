import type { PageResponse } from '~/types/api'
import type { ClaimListItem, OrderClaim } from '~/types/claim'
import type { ClaimType, ClaimReasonType, ClaimStatus } from '~/types/common'

/** BE `ClaimItemRequest` — orderItemId + quantity 만. variant/옵션 변경은 백엔드 미지원. */
export interface ClaimItemBody {
  orderItemId: number
  quantity: number
}

/** BE `ClaimCreateRequest` */
export interface ClaimCreateBody {
  orderId: number
  claimType: ClaimType
  reasonType: ClaimReasonType
  reason?: string
  items: ClaimItemBody[]
  estimatedRefundAmount?: number
  refundMethod?: string
  bankName?: string
  bankAccount?: string
  bankHolder?: string
}

/** BE `ClaimApproveRequest` */
export interface ClaimApproveBody {
  fromStatus: ClaimStatus | undefined
  adminNote?: string
  restoreStock?: boolean
  processExchange?: boolean
}

/** BE `ClaimRejectRequest` */
export interface ClaimRejectBody {
  fromStatus: ClaimStatus | undefined
  rejectReason: string
}

/** BE `ReturnShippingRequest` — return-shipping / reship 공용 */
export interface ClaimShippingBody {
  fromStatus: ClaimStatus | undefined
  shippingCarrier: string
  trackingNumber: string
}

/** BE `ReceiveInspectRequest` */
export interface ClaimReceiveInspectBody {
  fromStatus: ClaimStatus | undefined
  result: 'ACCEPT' | 'REJECT'
  restoreStock?: boolean
  rejectReason?: string
}

/** BE `ExchangeCompleteRequest` */
export interface ClaimExchangeCompleteBody extends ClaimShippingBody {
  adminNote?: string
}

export const useAdminClaim = () => {
  const api = useApi()

  return {
    list: (params: {
      claimType?: string
      status?: string
      searchType?: string
      keyword?: string
      page?: number
      size?: number
    } = {}) => api.get<PageResponse<ClaimListItem>>('/admin/claims', params),

    create: (body: ClaimCreateBody) => api.post<{ id: number }>('/admin/claims', body),
    listByOrder: (orderId: number) => api.get<OrderClaim[]>(`/admin/claims/orders/${orderId}`),

    updateReturnShipping: (claimId: number, body: ClaimShippingBody) =>
      api.post<void>(`/admin/claims/${claimId}/return-shipping`, body),
    approve: (claimId: number, body: ClaimApproveBody) =>
      api.post<void>(`/admin/claims/${claimId}/approve`, body),
    reject: (claimId: number, body: ClaimRejectBody) =>
      api.post<void>(`/admin/claims/${claimId}/reject`, body),
    reship: (claimId: number, body: ClaimShippingBody) =>
      api.post<void>(`/admin/claims/${claimId}/reship`, body),
    receiveInspect: (claimId: number, body: ClaimReceiveInspectBody) =>
      api.post<void>(`/admin/claims/${claimId}/receive-inspect`, body),
    completeExchange: (claimId: number, body: ClaimExchangeCompleteBody) =>
      api.post<void>(`/admin/claims/${claimId}/exchange/complete`, body)
  }
}
