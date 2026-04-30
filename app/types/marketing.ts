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

export interface CouponFormState {
  name: string
  description: string
  notice: string
  couponType: CouponType
  discountType: DiscountType
  discountValue: number | string | undefined
  maxDiscountAmount: number | string | undefined
  minOrderAmount: number | string
  totalQuantity: number | string | undefined
  validityType: ValidityType
  validityDays: number | string
  validFrom: string
  validTo: string
  allowPromotionOverlap: boolean
  allowDuplicateUse: boolean
  /** 비어있으면 전체 등급. */
  gradeIds: number[]
  /** 비어있으면 전체 카테고리. (couponType=PRODUCT_DISCOUNT 일 때만 의미 있음) */
  categoryIds: number[]
}

export interface Banner {
  id: number
  title: string
  position: BannerPosition
  imageUrl: string
  mobileImageUrl?: string | null
  linkUrl?: string | null
  buttonColor?: string | null
  sortOrder?: number
  status: BannerStatus
  startedAt?: string | null
  endedAt?: string | null
  noEndDate?: boolean
  createdAt?: string
}

export interface BannerFormState {
  title: string
  position: BannerPosition
  imageUrl: string
  mobileImageUrl: string
  linkUrl: string
  buttonColor: string
  sortOrder: number | string
  status: BannerStatus
  startedAt: string
  endedAt: string
  noEndDate: boolean
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

export interface PopupFormState {
  name: string
  status: PopupStatus
  image: string
  linkUrl: string
  linkTarget: PopupLinkTarget
  closeOption: PopupCloseOption
  popupType: PopupType
  sortOrder: number | string
  startedAt: string
  endedAt: string
}

/**
 * 프로모션 — 백엔드는 list/detail 응답이 서로 다른 shape 이다.
 * - List (PromotionListResponse): `applicableTarget` (요약 문자열), `status` (진행중/예정 등 문자열)
 * - Detail (PromotionDetailResponse): `isActive`, `applicableCategories: number[]` (카테고리 ID 목록만)
 * 카테고리명은 BE 가 응답에 포함하지 않으므로 FE 에서 별도 조회 후 매핑.
 */
export interface Promotion {
  id: number
  name: string
  discountType: DiscountType
  discountValue: number
  startedAt?: string
  endedAt?: string | null
  /** list 전용 */
  applicableTarget?: string
  /** list 전용 (예: "진행중", "예정", "비활성", "종료") */
  status?: string
  /** detail 전용 */
  isActive?: boolean
  /** detail 전용 — 카테고리 ID 목록. 이름은 FE 에서 categories 조회로 매핑 */
  applicableCategories?: number[]
}

export interface PromotionFormState {
  isActive: boolean
  name: string
  discountType: DiscountType
  discountValue: number | string | undefined
  applicableCategories: number[]
  startedAt: string
  endedAt: string
}
