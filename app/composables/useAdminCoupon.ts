import type { PageResponse } from '~/types/api'
import type { CouponDetail, CouponListItem } from '~/types/marketing'
import type { CouponStatus, CouponType, DiscountType, ValidityType } from '~/types/common'

/** BE `CouponCreateRequest` */
export interface CouponCreateBody {
  name: string
  description?: string
  couponType: CouponType
  notice?: string
  discountType: DiscountType
  discountValue: number
  maxDiscountAmount?: number
  minOrderAmount?: number
  totalQuantity?: number
  validityType: ValidityType
  validityDays?: number
  validFrom?: string
  validTo?: string
  allowPromotionOverlap?: boolean
  allowDuplicateUse?: boolean
  gradeIds?: number[]
  categoryIds?: number[]
}

/** BE `CouponUpdateRequest` — 모든 필드 optional */
export type CouponUpdateBody = Partial<CouponCreateBody>

export const useAdminCoupon = () => {
  const api = useApi()

  return {
    list: (params: { status?: string, keyword?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<CouponListItem>>('/admin/coupons', params),
    detail: (id: number) => api.get<CouponDetail>(`/admin/coupons/${id}`),
    create: (body: CouponCreateBody) => api.post<{ id: number }>('/admin/coupons', body),
    update: (id: number, body: CouponUpdateBody) => api.patch<void>(`/admin/coupons/${id}`, body),
    updateStatus: (id: number, body: { status: CouponStatus }) =>
      api.patch<void>(`/admin/coupons/${id}/status`, body),
    toggleVisibility: (id: number) => api.patch<void>(`/admin/coupons/${id}/visibility`),
    recall: (id: number) => api.post<void>(`/admin/coupons/${id}/recall`),
    remove: (id: number) => api.del<void>(`/admin/coupons/${id}`)
  }
}
