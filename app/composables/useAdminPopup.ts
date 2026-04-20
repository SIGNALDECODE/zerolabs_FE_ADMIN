import type { PageResponse } from '~/types/api'
import type { Popup } from '~/types/marketing'

export const useAdminPopup = () => {
  const api = useApi()

  return {
    list: (params: { status?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Popup>>('/admin/popups', params),
    detail: (id: number) => api.get<Popup>(`/admin/popups/${id}`),
    create: (body: any) => api.post<{ id: number }>('/admin/popups', body),
    update: (id: number, body: any) => api.patch<void>(`/admin/popups/${id}`, body),
    remove: (id: number) => api.del<void>(`/admin/popups/${id}`)
  }
}
