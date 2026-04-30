const IMAGE_URL_RE = /^https:\/\/[^\s]+$/
const LINK_URL_RE = /^(https:\/\/[^\s]+|\/[^\s]*)$/
const SOCIAL_URL_RE = /^https:\/\/[^\s]+$/
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

export const isImageUrl = (v?: string | null): boolean =>
  !v || IMAGE_URL_RE.test(v)

export const isLinkUrl = (v?: string | null): boolean =>
  !v || LINK_URL_RE.test(v)

export const isSocialUrl = (v?: string | null): boolean =>
  !v || SOCIAL_URL_RE.test(v)

export const isHexColor = (v?: string | null): boolean =>
  !v || HEX_COLOR_RE.test(v)

export const IMAGE_URL_MESSAGE = '이미지 URL은 https:// 로 시작해야 합니다'
export const LINK_URL_MESSAGE = '링크 URL은 https:// 또는 / 로 시작하는 내부 경로여야 합니다'
export const SOCIAL_URL_MESSAGE = '소셜 URL은 https:// 로 시작해야 합니다'
export const HEX_COLOR_MESSAGE = '색상은 #RRGGBB 형식이어야 합니다'
