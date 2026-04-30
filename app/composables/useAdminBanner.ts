import type { PageResponse } from '~/types/api'
import type { Banner } from '~/types/marketing'
import type { BannerPosition, BannerStatus } from '~/types/common'

/** BE `BannerCreateRequest` */
export interface BannerCreateBody {
  title: string
  position: BannerPosition
  imageUrl: string
  mobileImageUrl?: string
  linkUrl?: string
  buttonColor?: string
  sortOrder?: number
  status?: BannerStatus
  startedAt?: string
  endedAt?: string
  noEndDate?: boolean
}

/** BE `BannerUpdateRequest` — 모든 필드 optional */
export type BannerUpdateBody = Partial<BannerCreateBody>

export const useAdminBanner = () => {
  const api = useApi()

  return {
    list: (params: { position?: string, status?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Banner>>('/admin/banners', params),
    detail: (id: number) => api.get<Banner>(`/admin/banners/${id}`),
    create: (body: BannerCreateBody) => api.post<{ id: number }>('/admin/banners', body),
    update: (id: number, body: BannerUpdateBody) => api.patch<void>(`/admin/banners/${id}`, body),
    remove: (id: number) => api.del<void>(`/admin/banners/${id}`)
  }
}
