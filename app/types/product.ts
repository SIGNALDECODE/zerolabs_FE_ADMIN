import type { ProductStatus, DiscountType } from './common'

/** 백엔드 `StockStatus` enum */
export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'BACKORDER'

/**
 * 백엔드 `AdminProductListResponse` (GET /admin/products)
 * - 썸네일, 카테고리/태그 이름, 재고 합계 포함
 * - `discountRate` 는 "-10%" 같이 부호 포함 문자열 (할인 없으면 null)
 */
export interface ProductListItem {
  id: number
  thumbnailUrl?: string | null
  name: string
  optionCount: number
  categoryNames?: string[]
  regularPrice?: number
  salePrice?: number
  discountRate?: string | null
  stockQuantity: number
  tags?: string[]
  status: ProductStatus
}

/** 백엔드 `ProductImageResponse` */
export interface ProductImage {
  id?: number
  url: string
  altText?: string | null
}

export interface ProductCategory { id: number, name: string }
export interface ProductTag { id: number, name: string }

/**
 * 백엔드 `ProductOptionValueResponse`
 * - `value` 가 옵션값 이름 (저장 요청의 `name` 에 대응)
 * - 재고·추가가격은 옵션값 단위로 관리됨 (variant 제거 이후 모델)
 */
export interface ProductOptionValue {
  id?: number
  value: string
  displayValue?: string | null
  additionalPrice: number
  stockQuantity: number
  stockStatus?: StockStatus | null
  sortOrder?: number
}

/** 백엔드 `AdminProductOptionResponse` */
export interface ProductOption {
  id?: number
  name: string
  optionValues: ProductOptionValue[]
}

/**
 * 백엔드 `ProductResponse` (GET /admin/products/{id}).
 * - 옵션이 없는 상품은 top-level `stockQuantity` 에 재고 저장
 * - 옵션이 있는 상품은 각 `options[].optionValues[].stockQuantity` 합계
 */
export interface ProductDetail {
  id: number
  name: string
  summary?: string | null
  description?: string | null
  status: ProductStatus
  costPrice?: number | null
  regularPrice?: number | null
  salePrice?: number | null
  maxPurchaseQuantity?: number | null
  stockQuantity?: number | null
  stockStatus?: StockStatus | null
  discountType?: DiscountType | null
  discountValue?: number | null
  categories?: ProductCategory[]
  tags?: ProductTag[]
  primaryImage?: ProductImage | null
  options?: ProductOption[]
}

/* ======================= FE 폼 측 타입 ======================= */

/** 옵션값 폼 상태 — 사용자가 입력하는 과정 중에는 문자열도 허용. */
export interface ProductOptionValueForm {
  id?: number
  name: string
  additionalPrice: number | string
  stockQuantity: number | string
  sortOrder?: number
}

export interface ProductOptionForm {
  id?: number
  name: string
  values: ProductOptionValueForm[]
}

export interface ProductFormState {
  name: string
  summary: string
  description: string
  categoryIds: number[]
  tagIds: number[]
  costPrice: number | string | undefined
  regularPrice: number | string | undefined
  salePrice: number | string | undefined
  discountType: DiscountType
  discountValue: number | string
  status: ProductStatus
  maxPurchaseQuantity: number | string | undefined
  /** 옵션 없는 상품의 top-level 재고. 옵션 있으면 무시. */
  stockQuantity: number | string
  primaryImageAltText: string
  options: ProductOptionForm[]
}
