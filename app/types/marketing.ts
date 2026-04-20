import type {
  CouponStatus, CouponType, ValidityType, DiscountType,
  BannerPosition, BannerStatus,
  PopupStatus, PopupType, PopupLinkTarget, PopupCloseOption
} from './common'

export interface CouponListItem {
  id: number
  name: string
  couponType: CouponType
  status: CouponStatus
  discountType: DiscountType
  discountValue: number
  issuedQuantity?: number
  totalQuantity?: number | null
  isVisible?: boolean
  createdAt: string
}

export interface CouponGradeInfo { id: number, name: string }
export interface CouponCategoryInfo { id: number, name: string }

export interface CouponDetail {
  id: number
  name: string
  description?: string | null
  couponType: CouponType
  notice?: string | null
  status: CouponStatus
  discountType: DiscountType
  discountValue: number
  maxDiscountAmount?: number | null
  minOrderAmount?: number
  totalQuantity?: number | null
  issuedQuantity?: number
  validityType: ValidityType
  validityDays?: number | null
  validFrom?: string | null
  validTo?: string | null
  allowPromotionOverlap?: boolean
  allowDuplicateUse?: boolean
  isVisible?: boolean
  grades?: CouponGradeInfo[]
  categories?: CouponCategoryInfo[]
  createdAt: string
  updatedAt?: string
}

export interface Banner {
  id: number
  title: string
  position: BannerPosition
  imageUrl: string
  linkUrl?: string | null
  sortOrder?: number
  status: BannerStatus
  startedAt?: string | null
  endedAt?: string | null
  noEndDate?: boolean
  createdAt?: string
}

export interface Popup {
  id: number
  name: string
  status: PopupStatus
  image?: string | null
  linkUrl?: string | null
  linkTarget?: PopupLinkTarget
  closeOption?: PopupCloseOption
  popupType?: PopupType
  sortOrder?: number
  startedAt?: string | null
  endedAt?: string | null
}

export interface Promotion {
  id: number
  name: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  applicableTarget?: string
  startedAt?: string
  endedAt?: string | null
  status?: string
  isActive?: boolean
  categories?: { id: number, name: string }[]
  applicableCategories?: number[]
  createdAt?: string
}
