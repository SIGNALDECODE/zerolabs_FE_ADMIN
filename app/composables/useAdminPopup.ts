import type { PageResponse } from '~/types/api'
import type { Popup } from '~/types/marketing'
import type { PopupStatus, PopupType, PopupLinkTarget, PopupCloseOption } from '~/types/common'

/** BE `PopupCreateRequest` */
export interface PopupCreateBody {
  name: string
  status?: PopupStatus
  image?: string
  linkUrl?: string
  linkTarget?: PopupLinkTarget
  closeOption?: PopupCloseOption
  popupType?: PopupType
  sortOrder?: number
  startedAt?: string
  endedAt?: string
}

/** BE `PopupUpdateRequest` — 모든 필드 optional */
export type PopupUpdateBody = Partial<PopupCreateBody>

export const useAdminPopup = () => {
  const api = useApi()

  return {
    list: (params: { status?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Popup>>('/admin/popups', params),
    detail: (id: number) => api.get<Popup>(`/admin/popups/${id}`),
    create: (body: PopupCreateBody) => api.post<{ id: number }>('/admin/popups', body),
    update: (id: number, body: PopupUpdateBody) => api.patch<void>(`/admin/popups/${id}`, body),
    remove: (id: number) => api.del<void>(`/admin/popups/${id}`)
  }
}
