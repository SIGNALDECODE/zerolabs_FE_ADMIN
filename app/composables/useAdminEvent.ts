import type { PageResponse } from '~/types/api'
import type { EventDetail, EventListItem } from '~/types/content'
import type { EventStatus } from '~/types/common'

/** BE `EventCreateRequest` */
export interface EventCreateBody {
  title: string
  summary?: string
  thumbnailUrl?: string
  contentHtml: string
  startedAt: string
  endedAt: string
  status?: EventStatus
  linkedCouponId?: number | null
}

export type EventUpdateBody = Partial<EventCreateBody>

export const useAdminEvent = () => {
  const api = useApi()

  return {
    list: (params: { status?: string, keyword?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<EventListItem>>('/admin/events', params),
    detail: (id: number) => api.get<EventDetail>(`/admin/events/${id}`),
    create: (body: EventCreateBody) => api.post<{ id: number }>('/admin/events', body),
    update: (id: number, body: EventUpdateBody) => api.patch<void>(`/admin/events/${id}`, body),
    remove: (id: number) => api.del<void>(`/admin/events/${id}`)
  }
}
