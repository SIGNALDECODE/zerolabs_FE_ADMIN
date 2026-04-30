/**
 * 백엔드/네트워크 에러를 사용자 친화적 한글 메시지로 변환.
 *
 * 우선순위:
 *   1) 코드별 override 매핑 (`CODE_MESSAGES`) — UX 상 BE 기본 메시지보다 더 안내가 필요한 케이스
 *   2) 백엔드가 내려준 `errorCode.message`
 *   3) HTTP status 기반 일반 메시지
 *   4) 호출부가 넘긴 fallback
 *
 * 절대 코드 문자열(`AUTH_006` 등) 자체는 사용자에게 노출하지 않는다.
 */

import { ERROR_CODE } from './errorCodes'

/** $fetch / ApiError / 일반 객체를 통합한 안전 접근용 shape. */
interface ErrorLike {
  statusCode?: number
  status?: number | string
  message?: string
  code?: string
  data?: { errorCode?: { code?: string, message?: string } }
  response?: { status?: number, _data?: { errorCode?: { code?: string, message?: string } } }
}

const asErrorLike = (e: unknown): ErrorLike =>
  (e && typeof e === 'object') ? e as ErrorLike : {}

/**
 * 운영자에게 BE 기본 메시지보다 친절히 보여주고 싶은 코드만 등록.
 * 빈 문자열을 두면 "BE 메시지 그대로 사용"하는 효과 (즉, 매핑 미등록과 동일).
 */
const CODE_MESSAGES: Record<string, string> = {
  [ERROR_CODE.AUTH_BAD_CREDENTIALS]: '이메일 또는 비밀번호가 올바르지 않습니다.',
  AUTH_010: '비밀번호가 올바르지 않습니다.',
  AUTH_009: '로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.',
  [ERROR_CODE.AUTH_INACTIVE]: '비활성화된 계정입니다. 관리자에게 문의하세요.',
  [ERROR_CODE.AUTH_SUSPENDED]: '정지된 계정입니다. 관리자에게 문의하세요.',
  AUTH_016_WITHDRAWN: '탈퇴 처리된 계정입니다.',
  [ERROR_CODE.AUTH_LOGIN_REQUIRED]: '로그인이 필요합니다. 다시 로그인해주세요.',
  [ERROR_CODE.AUTH_FORBIDDEN]: '접근 권한이 없습니다.',
  ADMIN_001: '관리자 계정을 찾을 수 없습니다.',
  ADMIN_006: '계정이 비활성화되었습니다.',
  ADMIN_007: '계정이 정지되었습니다.',
  ADMIN_008: '비밀번호가 올바르지 않습니다.'
}

/** HTTP status fallback — BE 메시지도 코드도 못 잡았을 때만 사용. */
const STATUS_MESSAGES: Record<number, string> = {
  400: '요청 정보가 올바르지 않습니다.',
  401: '로그인이 필요합니다.',
  403: '접근 권한이 없습니다.',
  404: '요청한 정보를 찾을 수 없습니다.',
  409: '이미 처리되었거나 다른 요청과 충돌했습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  500: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  502: '서버 응답이 원활하지 않습니다. 잠시 후 다시 시도해주세요.',
  503: '서비스가 일시적으로 사용 불가합니다.',
  504: '서버 응답 시간을 초과했습니다.'
}

/** 코드 같은 raw 토큰이 message 에 그대로 들어있는지 체크 (네트워크 에러 메시지 노출 방지). */
const looksLikeRawTechnicalMessage = (msg: string): boolean => {
  if (!msg) return true
  // "[POST] /api/...: 400 Bad Request" 같은 fetch 에러
  if (/^\[(GET|POST|PUT|PATCH|DELETE)\]/i.test(msg)) return true
  // "AUTH_006" 같은 순수 코드만 들어온 경우
  if (/^[A-Z]+_\d+/.test(msg.trim()) && msg.trim().length < 30) return true
  // "Failed to fetch" 등 영문만
  if (/^[A-Za-z\s:.\-_/]+$/.test(msg) && msg.length < 80) return true
  return false
}

const extractCode = (e: ErrorLike): string | undefined =>
  e.data?.errorCode?.code
  || e.response?._data?.errorCode?.code
  || e.code

const extractBackendMessage = (e: ErrorLike): string | undefined =>
  e.data?.errorCode?.message
  || e.response?._data?.errorCode?.message

const extractStatus = (e: ErrorLike): number | undefined => {
  const s = e.statusCode ?? e.response?.status ?? e.status
  return typeof s === 'string' ? Number(s) || undefined : s
}

/**
 * 사용자에게 노출할 한글 에러 메시지를 결정한다.
 *
 * @param err 어떤 형태의 에러든 (ApiError / FetchError / 문자열 / unknown)
 * @param fallback 위 단계 모두 실패 시 노출할 기본 문구
 */
export const resolveErrorMessage = (
  err: unknown,
  fallback = '요청 처리 중 오류가 발생했습니다.'
): string => {
  if (typeof err === 'string') return err

  const e = asErrorLike(err)
  const code = extractCode(e)

  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code]

  const beMessage = extractBackendMessage(e)
  if (beMessage) return beMessage

  const status = extractStatus(e)
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]

  if (e.message && !looksLikeRawTechnicalMessage(e.message)) return e.message

  return fallback
}
