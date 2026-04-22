import type { UserStatus, UserType, Gender, OrderStatus } from './common'

/**
 * 관리자용 회원 목록 row — BE `UsersResponse`
 * 주요 필드는 @JsonProperty 로 snake_case 고정.
 */
export interface UserListItem {
  user_id: number
  name?: string
  phone?: string
  email: string
  grade?: UserGradeShort | null
  status: UserStatus
  order_count?: number
  total_order_amount?: number
  created_at?: string
}

/** BE `UserGradeResponse` */
export interface UserGradeShort {
  grade_id?: number
  name: string
}

/**
 * BE `GradeResponse` — 등급 풀 정보 (`GET /admin/users/grades`).
 * 모든 필드 snake_case 직렬화.
 */
export interface UserGrade {
  grade_id: number
  name: string
  level?: number
  min_amount?: number
  icon_url?: string | null
  is_default?: boolean
  member_count?: number
  coupon_ids?: number[]
  has_pending_changes?: boolean
}

/** BE `AddressResponse` — 필드명 자체가 address1/address2 (recipient_name 등 snake) */
export interface UserAddress {
  id: number
  label?: string | null
  recipient_name?: string
  recipient_phone?: string
  postal_code?: string
  address1?: string
  address2?: string
  country_code?: string
  is_default?: boolean
}

/** BE `CsMemoResponse` */
export interface UserCsMemo {
  id: number
  content: string
  created_by?: number
  created_by_name?: string
  created_at?: string
}

/** BE `OrderStatisticsResponse` */
export interface UserOrderStatistics {
  total_order_count?: number
  total_order_amount?: number
  average_order_amount?: number
  cancelled_count?: number
  refunded_count?: number
}

/** BE `UsersDetailResponse` — 상세 */
export interface UserDetail {
  user_id: number
  email: string
  name?: string
  phone?: string
  gender?: Gender | null
  status: UserStatus
  grade?: UserGradeShort | null
  current_point?: number
  created_at?: string
  last_login_at?: string | null
  default_address?: UserAddress | null
  order_statistics?: UserOrderStatistics
  recent_orders?: UserOrderEntry[]
  cs_memos?: UserCsMemo[]
}

/**
 * BE `UserOrderResponse` — 회원의 주문 이력 한 건.
 * `GET /admin/users/{id}/orders` 및 `UsersDetailResponse.recent_orders` 에서 사용.
 */
export interface UserOrderEntry {
  order_id: number
  order_number: string
  ordered_at?: string
  product_summary?: string
  grand_total?: number
  status?: OrderStatus
}

/** BE `PointHistoryResponse` */
export interface PointHistoryEntry {
  id?: number
  transaction_type?: string
  amount: number
  balance_after?: number
  reason?: string
  created_at: string
}

/**
 * 관리자 계정 (세 응답이 모두 다른 shape):
 *  - /auth/admin/me, /admin/me → AdminMe (camelCase)
 *  - /admin/admins (list) → AdminListItem (snake · role 필드명 주의)
 *  - /admin/admins/{id} → AdminDetail (snake)
 */
export interface AdminMe {
  id: number
  email: string
  name?: string
  phone?: string
  profileImageUrl?: string | null
  role?: UserType | string
  /** 참고: BE 에서 .toLowerCase() 로 직렬화 ("active" 등). UserStatus 와는 다르게 소문자 문자열. */
  status?: string
  emailVerifiedAt?: string | null
  grade?: { id: number, name: string, level?: number } | null
  point?: { currentPoint: number, totalEarned: number, totalUsed: number } | null
  createdAt?: string
  lastLoginAt?: string | null
}

export interface AdminListItem {
  id: number
  email: string
  name?: string
  phone?: string
  status: UserStatus
  role?: UserType
  created_at?: string
}

export interface AdminDetail {
  id: number
  email: string
  name?: string
  phone?: string
  role?: UserType
  user_status?: UserStatus
  password_changed_at?: string | null
  last_login_at?: string | null
  last_login_ip?: string | null
  locked_until?: string | null
  created_at?: string
  updated_at?: string
}

