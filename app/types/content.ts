import type { NoticeType, NoticeStatus, InquiryStatus } from './common'

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

export interface Qna {
  id: number
  userId?: number
  productId: number
  title: string
  question: string
  isSecret: boolean
  isAnswered: boolean
  answer?: string | null
  answeredAt?: string | null
  createdAt: string
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
