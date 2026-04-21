import type { ProductStatus, DiscountType } from './common'

export interface ProductListItem {
  id: number
  name: string
  thumbnailUrl?: string | null
  price?: {
    regularPrice?: number
    salePrice?: number
    finalPrice?: number
  } | number
  stock?: number
  status: ProductStatus
  createdAt?: string
}

export interface ProductImage {
  id?: number
  url: string
  altText?: string | null
  isPrimary?: boolean
  sortOrder?: number
}

export interface ProductCategory { id: number, name: string }
export interface ProductBrand { id: number, name: string, logoUrl?: string | null }
export interface ProductTag { id: number, name: string }

export interface ProductOptionValue { id?: number, name: string, sortOrder?: number }
export interface ProductOptionGroup {
  id?: number
  name: string
  values?: ProductOptionValue[]
  optionValues?: string[]  // for request
}

export interface ProductVariant {
  id?: number
  sku: string
  name?: string
  additionalPrice?: number
  stock?: number
  stockQuantity?: number
  stockStatus?: string
  salePrice?: number
  price?: number
  optionValues?: Array<ProductOptionValue | string>
  optionValueIds?: number[]
}

/**
 * 백엔드 ProductResponse 와 1:1 매핑.
 * 가격 필드는 DTO 상 top-level (price 객체로 래핑되어 있지 않음).
 * 이미지는 primaryImage 단일 객체 (multi-image 는 아직 미지원).
 */
export interface ProductDetail {
  id: number
  name: string
  summary?: string | null
  description?: string | null
  productType?: string
  status: ProductStatus
  categories?: ProductCategory[]
  tags?: ProductTag[]
  brand?: ProductBrand | null
  costPrice?: number | null
  regularPrice?: number | null
  salePrice?: number | null
  discountType?: DiscountType | null
  discountValue?: number | null
  maxPurchaseQuantity?: number | null
  viewCount?: number
  primaryImage?: ProductImage | null
  options?: ProductOptionGroup[]
  variants?: ProductVariant[]
  saleStartedAt?: string | null
  saleEndedAt?: string | null
  createdAt?: string
}

/**
 * 폼/요청 측 타입
 * - shape 는 app/components/domain/ProductOptionsEditor.vue 의 OptionGroup/Variant 와 일치해야 함.
 */
export interface ProductOptionGroupForm {
  name: string
  optionValues: string[]
}

export interface ProductVariantForm {
  sku: string
  name: string
  additionalPrice: number | string
  stockQuantity: number | string
  optionValueIds: number[]
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
  primaryImageAltText: string
  options: ProductOptionGroupForm[]
  variants: ProductVariantForm[]
}
