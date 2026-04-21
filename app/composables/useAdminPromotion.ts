import type { PageResponse } from '~/types/api'
import type { Promotion } from '~/types/marketing'
import type { DiscountType } from '~/types/common'

/** BE `PromotionCreateRequest` */
export interface PromotionCreateBody {
  isActive: boolean
  name: string
  discountType: DiscountType
  discountValue: number
  applicableCategories?: number[]
  startedAt: string
  endedAt?: string
}

export type PromotionUpdateBody = Partial<PromotionCreateBody>

export const useAdminPromotion = () => {
  const api = useApi()

  return {
    list: (params: { keyword?: string, categoryId?: number, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Promotion>>('/admin/promotions', params),
    detail: (id: number) => api.get<Promotion>(`/admin/promotions/${id}`),
    create: (body: PromotionCreateBody) => api.post<{ id: number }>('/admin/promotions', body),
    update: (id: number, body: PromotionUpdateBody) => api.put<void>(`/admin/promotions/${id}`, body)
  }
}
