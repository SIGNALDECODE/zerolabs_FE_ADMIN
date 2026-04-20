import type { PageResponse } from '~/types/api'
import type { NoticeDetail, NoticeListItem } from '~/types/content'

export const useAdminNotice = () => {
  const api = useApi()

  return {
    list: (params: { status?: string, type?: string, keyword?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<NoticeListItem>>('/admin/notices', params),
    detail: (id: number) => api.get<NoticeDetail>(`/admin/notices/${id}`),
    create: (body: any) => api.post<{ id: number }>('/admin/notices', body),
    update: (id: number, body: any) => api.patch<void>(`/admin/notices/${id}`, body),
    remove: (id: number) => api.del<void>(`/admin/notices/${id}`)
  }
}
