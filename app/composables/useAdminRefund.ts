import type { RefundRecord } from '~/types/claim'

export const useAdminRefund = () => {
  const api = useApi()

  return {
    process: (body: any) => api.post<RefundRecord>('/admin/refunds', body),
    listByOrder: (orderId: number) => api.get<RefundRecord[]>(`/admin/refunds/orders/${orderId}`)
  }
}
