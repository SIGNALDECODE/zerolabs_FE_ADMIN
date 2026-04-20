import type { PageResponse } from '~/types/api'
import type { OrderDetail, OrderListItem } from '~/types/order'
import type { OrderStatus } from '~/types/common'

export interface OrderStatusChangeBody {
  orderIds: number[]
  status: OrderStatus
  reason?: string
  carrierId?: number
  trackingNumber?: string
}

export const useAdminOrder = () => {
  const api = useApi()

  return {
    list: (params: { status?: string, searchType?: string, keyword?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<OrderListItem>>('/admin/orders', params),
    detail: (id: number) => api.get<OrderDetail>(`/admin/orders/${id}`),
    statuses: () => api.get<string[]>('/admin/orders/statuses'),
    /**
     * 주문 상태 일괄 변경 (SHIPPING 시 carrierId, trackingNumber 필수)
     */
    changeStatuses: (body: OrderStatusChangeBody) => api.patch<void>('/admin/orders/statuses', body)
  }
}
