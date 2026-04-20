import { ERROR_CODE } from '~/utils/api/errorCodes'
import { ApiError, type ApiResponse } from '~/types/api'

let isRefreshing = false
let refreshPromise: Promise<unknown> | null = null

interface FetchOptions {
  method?: string
  body?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

/**
 * 백엔드 admin-api 호출용 컴포저블.
 * - SSR: config.apiBaseUrl 직접 호출
 * - CSR: /api 프록시 경유
 * - 401 + AUTH_016 → /auth/refresh 자동 재시도
 * - 401 + AUTH_002 → 세션 만료 처리
 * - ApiResponse<T> 자동 unwrap → .data 반환, errorCode 면 ApiError throw
 */
export const useApi = () => {
  const config = useRuntimeConfig()
  const cookieHeaders = import.meta.server ? useRequestHeaders(['cookie']) : {}

  const buildUrl = (endpoint: string) => {
    if (import.meta.server) return `${config.apiBaseUrl}${endpoint}`
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

  const extractErrorCode = (error: any) =>
    error?.data?.errorCode?.code || error?.response?._data?.errorCode?.code || null

  const extractErrorMessage = (error: any) =>
    error?.data?.errorCode?.message
      || error?.response?._data?.errorCode?.message
      || error?.message
      || '요청 처리 중 오류가 발생했습니다.'

  const apiFetch = async <T>(endpoint: string, options: FetchOptions = {}, isRetry = false): Promise<ApiResponse<T>> => {
    const url = buildUrl(endpoint)
    const headers = buildHeaders(options)

    try {
      return await $fetch<ApiResponse<T>>(url, {
        credentials: 'include',
        ...(options as any),
        headers
      })
    } catch (error: any) {
      if (import.meta.client && !isRetry) {
        const authStore = useAuthStore()
        const wasLoggedIn = authStore.isLoggedIn
        const status = error?.statusCode || error?.response?.status || error?.status
        const code = extractErrorCode(error)

        if (status === 401 && code === ERROR_CODE.AUTH_LOGIN_REQUIRED && wasLoggedIn) {
          try {
            await refreshToken()
            return await apiFetch<T>(endpoint, options, true)
          } catch (refreshError: any) {
            authStore.setSessionExpired(extractErrorMessage(refreshError))
          }
        }

        if (status === 401 && code === ERROR_CODE.AUTH_TOKEN_EXPIRED && wasLoggedIn) {
          authStore.setSessionExpired(extractErrorMessage(error))
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

  const get = async <T = any>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'GET', params }))

  const post = async <T = any>(endpoint: string, body: unknown = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'POST', body }))

  const put = async <T = any>(endpoint: string, body: unknown = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'PUT', body }))

  const patch = async <T = any>(endpoint: string, body: unknown = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'PATCH', body }))

  const del = async <T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> =>
    unwrap<T>(await apiFetch<T>(endpoint, { method: 'DELETE', ...options }))

  const useApiData = <T = any>(key: string, endpoint: string, params: Record<string, unknown> = {}, options: any = {}) =>
    useAsyncData<T>(key, () => get<T>(endpoint, params), { lazy: true, ...options })

  return { apiFetch, get, post, put, patch, del, useApiData, extractErrorCode, extractErrorMessage }
}
