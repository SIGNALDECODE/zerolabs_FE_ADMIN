import type { PageResponse } from '~/types/api'
import type { Banner } from '~/types/marketing'

export const useAdminBanner = () => {
  const api = useApi()

  return {
    list: (params: { position?: string, status?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Banner>>('/admin/banners', params),
    detail: (id: number) => api.get<Banner>(`/admin/banners/${id}`),
    create: (body: any) => api.post<{ id: number }>('/admin/banners', body),
    update: (id: number, body: any) => api.patch<void>(`/admin/banners/${id}`, body),
    remove: (id: number) => api.del<void>(`/admin/banners/${id}`)
  }
}
