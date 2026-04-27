/**
 * 공용 타입 · 백엔드 enum 미러.
 */

export type OrderStatus =
  | 'PENDING' | 'PAID' | 'PREPARING' | 'SHIPPING'
  | 'PARTIAL_DELIVERED' | 'DELIVERED' | 'CONFIRMED'
  | 'CANCELLED' | 'REFUNDED'
  | 'RETURN_REQUESTED' | 'RETURN_IN_PROGRESS' | 'RETURN_COMPLETED'
  | 'PARTIAL_RETURN_IN_PROGRESS' | 'PARTIAL_RETURN_COMPLETED'
  | 'EXCHANGE_REQUESTED' | 'EXCHANGE_IN_PROGRESS' | 'EXCHANGE_COMPLETED'
  | 'PARTIAL_EXCHANGE_IN_PROGRESS' | 'PARTIAL_EXCHANGE_COMPLETED'

export type ProductStatus = 'ON_SALE' | 'DISCONTINUED' | 'SOLD_OUT'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'WITHDRAWN'
export type UserType = 'ADMIN' | 'STAFF' | 'CUSTOMER'

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

export type InquiryStatus = 'PENDING' | 'ANSWERED' | 'CLOSED'
export type QnaStatus = 'PENDING' | 'ANSWERED' | 'CLOSED'
export type NoticeType = 'NOTICE' | 'INSPECTION' | 'GUIDELINES' | 'EVENT'
export type NoticeStatus = 'ACTIVE' | 'INACTIVE'

export type BannerPosition = 'HERO' | 'SLIDE' | 'HALF' | 'FULL'
export type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'SCHEDULED'
export type PopupType = 'CENTER' | 'FLOATING'
export type PopupStatus = 'ACTIVE' | 'INACTIVE'
export type PopupLinkTarget = '_self' | '_blank'
export type PopupCloseOption = 'CLOSE' | 'TODAY' | 'WEEK'

export type Gender = 'MALE' | 'FEMALE'
