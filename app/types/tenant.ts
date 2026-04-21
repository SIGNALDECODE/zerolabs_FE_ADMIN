/**
 * 쇼핑몰(Tenant) 전체 설정.
 * 백엔드: TenantAllSettingsResponse / TenantInfoResponse / TenantSettingsResponse.*
 */

export type BusinessType = 'INDIVIDUAL' | 'CORPORATE'

export interface TenantInfo {
  id?: number
  code?: string
  name?: string
  nameEn?: string
  logoUrl?: string | null
  faviconUrl?: string | null
  businessName?: string
  businessNumber?: string
  businessType?: BusinessType
  businessCategory?: string
  ecommerceLicense?: string
  ceoName?: string
  phone?: string
  email?: string
  zipCode?: string
  address?: string
  addressDetail?: string
  csPhone?: string
  csFax?: string
  csEmail?: string
  csHours?: string
  privacyOfficer?: string
  privacyEmail?: string
  copyrightText?: string
  isActive?: boolean
  theme?: string
}

export interface TenantSeo {
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
  ogImage?: string
  robotsTxt?: string
}

export interface TenantSettlement {
  bankName?: string
  bankAccount?: string
  bankHolder?: string
}

export interface TenantMaintenance {
  enabled?: boolean
  message?: string
  startAt?: string
  endAt?: string
}

export interface TenantSocial {
  instagram?: string
  facebook?: string
  youtube?: string
  blog?: string
  kakao?: string
}

export interface TenantNotification {
  orderEmail?: string
  claimEmail?: string
  inquiryEmail?: string
  orderEnabled?: boolean
  claimEnabled?: boolean
  inquiryEnabled?: boolean
}

export interface TenantSecurity {
  sessionTimeout?: number
  maxLoginAttempts?: number
  accountLockDuration?: number
  passwordChangeRequired?: boolean
  passwordChangeCycle?: number
}

export interface TenantAllSettings {
  info?: TenantInfo
  seo?: TenantSeo
  settlement?: TenantSettlement
  maintenance?: TenantMaintenance
  social?: TenantSocial
  notification?: TenantNotification
  security?: TenantSecurity
}

/**
 * 편집 폼 상태 — 모든 섹션을 부분 객체로 유지.
 * 숫자 필드는 Input 바인딩 편의상 number | string 허용.
 */
export interface TenantSecurityForm {
  sessionTimeout?: number | string
  maxLoginAttempts?: number | string
  accountLockDuration?: number | string
  passwordChangeRequired?: boolean
  passwordChangeCycle?: number | string
}

export interface TenantFormState {
  info: TenantInfo
  seo: TenantSeo
  settlement: TenantSettlement
  maintenance: TenantMaintenance
  social: TenantSocial
  notification: TenantNotification
  security: TenantSecurityForm
}

export interface HeaderMenuItem {
  id: string
  label: string
  order: number
}

export type HeaderMenuResponse = { menus: HeaderMenuItem[] } | HeaderMenuItem[]
