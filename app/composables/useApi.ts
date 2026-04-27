import type { AsyncDataOptions } from '#app'
import { ERROR_CODE } from '~/utils/api/errorCodes'
import { ApiError, type ApiResponse } from '~/types/api'

let isRefreshing = false
let refreshPromise: Promise<unknown> | null = null
let redirectingToLogin = false

interface FetchOptions {
  method?: string
  body?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

/** $fetch / nuxt error shape — refresh / extract 헬퍼에서 안전 접근용. */
interface NuxtFetchError {
  statusCode?: number
  status?: number
  message?: string
  data?: { errorCode?: { code?: string, message?: string, status?: number } }
  response?: { status?: number, _data?: { errorCode?: { code?: string, message?: string } } }
}

const asFetchError = (err: unknown): NuxtFetchError =>
  (err && typeof err === 'object') ? err as NuxtFetchError : {}

/**
 * 백엔드 admin-api 호출용 컴포저블.
 * - CSR: public.apiBase 로 호출 — '/api' 면 Nuxt 프록시 경유(dev), 절대 URL 이면 BE 직통(prod)
 * - SSR: apiBaseUrl 우선(내부 호스트). 비어있고 public.apiBase 가 절대 URL 이면 그것을 사용.
 * - 401 + AUTH_016 → /auth/refresh 자동 재시도 (1회)
 * - 401 (그 외) → 토스트 알림 + /login 리다이렉트
 *   · /login 페이지에서 발생한 에러는 페이지가 자체 처리하도록 스킵
 * - ApiResponse<T> 자동 unwrap → .data 반환, errorCode 면 ApiError throw
 */
export const useApi = () => {
  const config = useRuntimeConfig()
  const cookieHeaders = import.meta.server ? useRequestHeaders(['cookie']) : {}

  const buildUrl = (endpoint: string) => {
    if (import.meta.server) {
      // SSR 은 server-side 라 same-origin 프록시가 의미 없음. 절대 URL 필요.
      const base = config.apiBaseUrl
        || (config.public.apiBase.startsWith('http') ? config.public.apiBase : '')
      return `${base}${endpoint}`
    }
    return `${config.public.apiBase}${endpoint}`
  }

  const buildHeaders = (options: FetchOptions) => {
    const isFormData = options.body instanceof FormData
    const base = { ...cookieHeaders, ...(options.headers || {}) }
    if (!isFormData) {
      return { 'Content-Type': 'application/json', ...base }
    }
    return base
  }

  const refreshToken = async () => {
    if (isRefreshing) return refreshPromise
    isRefreshing = true
    refreshPromise = $fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include'
    })
      .then((r) => { isRefreshing = false; refreshPromise = null; return r })
      .catch((e) => { isRefreshing = false; refreshPromise = null; throw e })
    return refreshPromise
  }

  const extractErrorCode = (error: unknown): string | null => {
    const e = asFetchError(error)
    return e.data?.errorCode?.code || e.response?._data?.errorCode?.code || null
  }

  const extractErrorMessage = (error: unknown): string => {
    const e = asFetchError(error)
    return e.data?.errorCode?.message
      || e.response?._data?.errorCode?.message
      || e.message
      || '요청 처리 중 오류가 발생했습니다.'
  }

  /**
   * 401 공통 처리. 중복 호출/동시 요청 스팸 방지용 플래그로 de-dupe.
   * 리다이렉트 시작 후 resolve 되지 않는 Promise 를 반환해, 호출부의 catch
   * 로직(두 번째 토스트 등)이 페이지 언마운트 전에 실행되지 않도록 한다.
   */
  const redirectToLogin = async (): Promise<never> => {
    if (!import.meta.client) return new Promise<never>(() => {})
    if (redirectingToLogin) return new Promise<never>(() => {})

    redirectingToLogin = true
    useAuthStore().resetAuthState()
    useToast().error('로그인이 필요합니다. 다시 로그인해주세요.')

    const route = useRoute()
    await Promise.resolve(
      navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`, { replace: true })
    ).catch(() => {})
    // 동일 tick 에 발생한 다른 401 들은 위의 guard 로 이미 차단됨.
    // 다음 요청은 새 페이지(/login) 에서 진행되므로 플래그는 넉넉히 풀어준다.
    setTimeout(() => { redirectingToLogin = false }, 1000)

    return new Promise<never>(() => {})
  }

  const apiFetch = async <T>(endpoint: string, options: FetchOptions = {}, isRetry = false): Promise<ApiResponse<T>> => {
    const url = buildUrl(endpoint)
    const headers = buildHeaders(options)

    try {
      // $fetch 옵션 타입(NitroFetchOptions)이 method 를 string literal union 으로 좁혀 받기 때문에
      // FetchOptions.method (string) 와 직접 호환되지 않는다. 의도적 cast.
      return await $fetch<ApiResponse<T>>(url, {
        credentials: 'include',
        ...(options as Parameters<typeof $fetch>[1]),
        headers
      })
    } catch (error) {
      if (import.meta.client && !isRetry) {
        const route = useRoute()
        // /login 페이지에서 발생한 401 (예: 잘못된 자격증명) 은 페이지가 직접 처리.
        if (route.path === '/login') throw error

        const authStore = useAuthStore()
        const wasLoggedIn = authStore.isLoggedIn
        const e = asFetchError(error)
        const status = e.statusCode || e.response?.status || e.status
        const code = extractErrorCode(error)

        if (status === 401 && code === ERROR_CODE.AUTH_LOGIN_REQUIRED && wasLoggedIn) {
          try {
            await refreshToken()
            return await apiFetch<T>(endpoint, options, true)
          } catch {
            return await redirectToLogin()
          }
        }

        if (status === 401) {
          return await redirectToLogin()
        }
      }

      throw error
    }
  }

  const unwrap = <T>(res: ApiResponse<T>): T => {
    if (res?.success === true) return res.data as T
    if (res?.success === false && res?.errorCode) {
      throw new ApiError(res.errorCode.message || '요청 실패', res.errorCode.code, res.errorCode.status)
    }
    return res as unknown as T
  }

  const get = async <T = unknown>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'GET', params }))

  const post = async <T = unknown>(endpoint: string, body: unknown = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'POST', body }))

  const put = async <T = unknown>(endpoint: string, body: unknown = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'PUT', body }))

  const patch = async <T = unknown>(endpoint: string, body: unknown = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'PATCH', body }))

  const del = async <T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'DELETE', ...options }))

  const useApiData = <T = unknown>(
    key: string,
    endpoint: string,
    params: Record<string, unknown> = {},
    options: AsyncDataOptions<T> = {}
  ) => useAsyncData<T>(key, () => get<T>(endpoint, params), { lazy: true, ...options })

  return { apiFetch, get, post, put, patch, del, useApiData, extractErrorCode, extractErrorMessage }
}
