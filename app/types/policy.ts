/**
 * 운영 정책 (주문/배송/상품/반품)
 * 백엔드: PolicyAllSettingsResponse
 */

export interface OrderPolicy {
  minOrderAmount?: number
  maxOrderAmount?: number
  maxOrderQuantity?: number
  cancelHours?: number
  autoConfirmDays?: number
  pointRate?: number
  pointMinOrder?: number
  pointMinUse?: number
  pointMaxUseRate?: number
  pointExpirationType?: 'UNLIMITED' | '1_YEAR' | '2_YEAR' | '3_YEAR' | string
}

export interface DeliveryPolicy {
  freeShippingAmount?: number
  baseShippingFee?: number
  islandExtraFee?: number
  islandRegions?: string
  estimatedDays?: string
  guideText?: string
}

export interface ProductPolicy {
  defaultTaxRate?: number
  lowStockThreshold?: number
  maxOptions?: number
  maxImages?: number
  showSoldout?: boolean
  showStock?: boolean
  guideText?: string
}

export interface ReturnPolicy {
  returnDays?: number
  exchangeDays?: number
  returnFee?: number
  exchangeFee?: number
  returnAddress?: string
  nonReturnable?: string
  guideText?: string
}

export interface PolicyAllSettings {
  order?: OrderPolicy
  delivery?: DeliveryPolicy
  product?: ProductPolicy
  returnPolicy?: ReturnPolicy
}

/**
 * 편집 폼 상태 — 숫자 필드는 Input 바인딩 편의상 number | string 허용.
 */
export interface OrderPolicyForm {
  minOrderAmount?: number | string
  maxOrderAmount?: number | string
  maxOrderQuantity?: number | string
  cancelHours?: number | string
  autoConfirmDays?: number | string
  pointRate?: number | string
  pointMinOrder?: number | string
  pointMinUse?: number | string
  pointMaxUseRate?: number | string
  pointExpirationType?: OrderPolicy['pointExpirationType']
}

export interface DeliveryPolicyForm {
  freeShippingAmount?: number | string
  baseShippingFee?: number | string
  islandExtraFee?: number | string
  islandRegions?: string
  estimatedDays?: string
  guideText?: string
}

export interface ProductPolicyForm {
  defaultTaxRate?: number | string
  lowStockThreshold?: number | string
  maxOptions?: number | string
  maxImages?: number | string
  showSoldout?: boolean
  showStock?: boolean
  guideText?: string
}

export interface ReturnPolicyForm {
  returnDays?: number | string
  exchangeDays?: number | string
  returnFee?: number | string
  exchangeFee?: number | string
  returnAddress?: string
  nonReturnable?: string
  guideText?: string
}

export interface PolicyFormState {
  order: OrderPolicyForm
  delivery: DeliveryPolicyForm
  product: ProductPolicyForm
  returnPolicy: ReturnPolicyForm
}
