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

export interface ProductDetail {
  id: number
  name: string
  summary?: string | null
  description?: string | null
  productType?: string
  status: ProductStatus
  categories?: ProductCategory[]
  brand?: ProductBrand | null
  price?: {
    regularPrice?: number
    salePrice?: number
    finalPrice?: number
    costPrice?: number
    discountType?: DiscountType
    discountValue?: number
  }
  viewCount?: number
  images?: ProductImage[]
  optionGroups?: ProductOptionGroup[]
  variants?: ProductVariant[]
  tags?: ProductTag[]
  maxPurchaseQuantity?: number | null
  saleStartedAt?: string | null
  saleEndedAt?: string | null
  createdAt?: string
}
