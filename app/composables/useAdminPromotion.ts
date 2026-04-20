import type { PageResponse } from '~/types/api'
import type { Promotion } from '~/types/marketing'

export const useAdminPromotion = () => {
  const api = useApi()

  return {
    list: (params: { keyword?: string, categoryId?: number, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Promotion>>('/admin/promotions', params),
    detail: (id: number) => api.get<Promotion>(`/admin/promotions/${id}`),
    create: (body: any) => api.post<{ id: number }>('/admin/promotions', body),
    update: (id: number, body: any) => api.put<void>(`/admin/promotions/${id}`, body)
  }
}
