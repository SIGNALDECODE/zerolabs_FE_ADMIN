import type { PageResponse } from '~/types/api'
import type { NoticeDetail, NoticeListItem } from '~/types/content'
import type { NoticeType, NoticeStatus } from '~/types/common'

/** BE `NoticeCreateRequest` */
export interface NoticeCreateBody {
  type: NoticeType
  title: string
  content: string
  isPinned?: boolean
  status?: NoticeStatus
}

export type NoticeUpdateBody = Partial<NoticeCreateBody>

export const useAdminNotice = () => {
  const api = useApi()

  return {
    list: (params: { status?: string, type?: string, keyword?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<NoticeListItem>>('/admin/notices', params),
    detail: (id: number) => api.get<NoticeDetail>(`/admin/notices/${id}`),
    create: (body: NoticeCreateBody) => api.post<{ id: number }>('/admin/notices', body),
    update: (id: number, body: NoticeUpdateBody) => api.patch<void>(`/admin/notices/${id}`, body),
    remove: (id: number) => api.del<void>(`/admin/notices/${id}`)
  }
}
