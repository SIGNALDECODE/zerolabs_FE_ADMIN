import type { PageResponse } from '~/types/api'
import type { ClaimListItem, OrderClaim } from '~/types/claim'

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

    create: (body: any) => api.post<{ id: number }>('/admin/claims', body),
    listByOrder: (orderId: number) => api.get<OrderClaim[]>(`/admin/claims/orders/${orderId}`),

    updateReturnShipping: (claimId: number, body: any) =>
      api.post<void>(`/admin/claims/${claimId}/return-shipping`, body),
    approve: (claimId: number, body: any) => api.post<void>(`/admin/claims/${claimId}/approve`, body),
    reject: (claimId: number, body: any) => api.post<void>(`/admin/claims/${claimId}/reject`, body),
    reship: (claimId: number, body: any) => api.post<void>(`/admin/claims/${claimId}/reship`, body),
    receiveInspect: (claimId: number, body: any) =>
      api.post<void>(`/admin/claims/${claimId}/receive-inspect`, body),
    completeExchange: (claimId: number, body: any) =>
      api.post<void>(`/admin/claims/${claimId}/exchange/complete`, body)
  }
}
