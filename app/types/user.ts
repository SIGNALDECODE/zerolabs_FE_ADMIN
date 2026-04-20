import type { UserStatus, UserType, Gender } from './common'

export interface UserListItem {
  id: number
  email: string
  name?: string
  phone?: string
  grade?: { id?: number, name: string } | null
  point?: { currentPoint?: number } | null
  status: UserStatus
  createdAt?: string
}

export interface UserAddress {
  id: number
  recipientName: string
  recipientPhone?: string
  postalCode?: string
  address?: string
  addressDetail?: string
  isDefault?: boolean
}

export interface UserCsMemo {
  id: number
  content: string
  adminName?: string
  createdAt?: string
}

export interface UserDetail {
  id: number
  email: string
  name?: string
  phone?: string
  status: UserStatus
  gender?: Gender | null
  birthDate?: string | null
  grade?: { id?: number, name: string } | null
  point?: { currentPoint?: number }
  orderStatistics?: {
    totalPaid?: number
    orderCount?: number
    cancelCount?: number
  }
  addresses?: UserAddress[]
  csMemos?: UserCsMemo[]
  createdAt?: string
  lastLoginAt?: string | null
}

export interface AdminAccount {
  id: number
  email: string
  name?: string
  phone?: string
  userType?: UserType
  role?: UserType
  status: UserStatus
  createdAt?: string
  lastLoginAt?: string | null
}

export interface PointHistoryEntry {
  id?: number
  type?: string
  transactionType?: string
  amount: number
  balance?: number
  reason?: string
  description?: string
  createdAt: string
}
