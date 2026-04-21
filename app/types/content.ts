import type { NoticeType, NoticeStatus, InquiryStatus, QnaStatus } from './common'

export interface NoticeListItem {
  id: number
  type: NoticeType
  title: string
  isPinned?: boolean
  status: NoticeStatus
  viewCount?: number
  createdAt: string
}

export interface NoticeDetail extends NoticeListItem {
  typeDescription?: string
  content: string
}

export interface Faq {
  id: number
  categoryId: number
  categoryName?: string
  question: string
  answer: string
  createdAt: string
}

export interface FaqCategory {
  id: number
  name: string
  isActive?: boolean
  createdAt?: string
}

export interface InquiryListItem {
  id: number
  userId: number
  userName?: string
  inquiryType: string
  title: string
  status: InquiryStatus
  createdAt: string
}

export interface InquiryDetail extends InquiryListItem {
  orderNumber?: string | null
  content: string
  attachmentUrls?: string[]
  answerContent?: string | null
  answeredAt?: string | null
}

/** 백엔드 `QnaResponse` */
export interface Qna {
  id: number
  userId?: number
  productId: number
  productName?: string
  productThumbnailUrl?: string | null
  title: string
  question: string
  isSecret: boolean
  isAnswered: boolean
  answer?: string | null
  answeredBy?: number | null
  answeredAt?: string | null
  status?: QnaStatus
  isVisible?: boolean
  createdAt: string
  updatedAt?: string
}

export interface Review {
  id: number
  productId?: number
  productName?: string
  productPrimaryImageUrl?: string | null
  userId?: number
  userName?: string
  authorName?: string
  rating: number
  title?: string | null
  content: string
  images?: string[]
  isVerifiedPurchase?: boolean
  isBest?: boolean
  isVisible?: boolean
  helpfulCount?: number
  adminReply?: string | null
  adminRepliedAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface CategoryNode {
  id: number
  name: string
  sortOrder?: number
  imageUrl?: string | null
  children?: CategoryNode[]
}

/**
 * /admin/categories/sync 응답.
 * - 생성/수정 실패는 트랜잭션 내에서 예외 throw → ApiError 로 매핑 (여기엔 포함되지 않음)
 * - 여기에 실리는 실패는 **삭제 실패만** 해당 (하위 상품·하위 카테고리 존재 등)
 * - Jackson 이 Map<Long, String> 을 JSON object 로 직렬화하므로 key 는 string.
 */
export interface CategorySyncResponse {
  deletedIds: number[]
  failedIds: number[]
  failedReasons: Record<string, string>
}
