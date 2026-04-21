import type { AdminMe } from '~/types/user'

export interface LoginSuccessResponse {
  message: string
  expiresIn: number
}

/**
 * Admin Auth
 * - 소비자몰과 같은 AuthController를 쓰지만 로그인 유저는 ADMIN/STAFF 롤이어야 함.
 */
export const useAdminAuth = () => {
  const api = useApi()

  return {
    login: (body: { email: string, password: string }) => api.post<LoginSuccessResponse>('/auth/login', body),
    logout: () => api.post<void>('/auth/logout'),
    refresh: () => api.post<LoginSuccessResponse>('/auth/refresh'),
    me: () => api.get<AdminMe>('/auth/admin/me'),

    sendPasswordResetCode: (body: { email: string }) => api.post<void>('/auth/password-reset/send', body),
    resetPassword: (body: { email: string, code: string, newPassword: string }) =>
      api.patch<void>('/auth/password-reset', body)
  }
}
