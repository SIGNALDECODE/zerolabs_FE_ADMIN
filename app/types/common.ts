/**
 * 공용 타입 · 백엔드 enum 미러.
 */

export type OrderStatus =
  | 'PENDING' | 'PAID' | 'PREPARING' | 'SHIPPING' | 'DELIVERED'
  | 'COMPLETED' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED'

export type ProductStatus = 'ON_SALE' | 'DISCONTINUED' | 'SOLD_OUT'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'WITHDRAWN'
export type UserType = 'ADMIN' | 'STAFF' | 'USER'

export type CouponStatus = 'REGISTERED' | 'ACTIVE' | 'STOPPED' | 'ENDED' | 'RECALLED'
export type CouponType = 'PRODUCT_DISCOUNT' | 'FREE_SHIPPING'
export type ValidityType = 'DAYS_FROM_DOWNLOAD' | 'FIXED_PERIOD'

export type DiscountType = 'RATE' | 'AMOUNT' | 'NONE'

export type ClaimType = 'CANCEL' | 'RETURN' | 'EXCHANGE'
export type ClaimStatus = 'REQUESTED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
export type ClaimReasonType =
  | 'CHANGE_OF_MIND' | 'DEFECTIVE' | 'WRONG_DELIVERY'
  | 'DELAYED_DELIVERY' | 'OUT_OF_STOCK' | 'OTHER'

export type RefundStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export type InquiryStatus = 'WAITING' | 'ANSWERED'
export type NoticeType = 'NOTICE' | 'INSPECTION' | 'GUIDELINES' | 'EVENT'
export type NoticeStatus = 'ACTIVE' | 'INACTIVE'

export type BannerPosition = 'HERO' | 'SLIDE' | 'HALF' | 'FULL'
export type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED'
export type PopupType = 'CENTER' | 'FLOATING'
export type PopupStatus = 'ACTIVE' | 'INACTIVE'
export type PopupLinkTarget = '_self' | '_blank'
export type PopupCloseOption = 'CLOSE' | 'TODAY' | 'WEEK'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
