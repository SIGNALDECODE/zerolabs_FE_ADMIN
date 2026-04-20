import type { PageResponse } from '~/types/api'
import type { AdminAccount } from '~/types/user'
import type { UserStatus, UserType } from '~/types/common'

/**
 * 관리자 계정 관리
 * Base: /admin, /admin/admins
 */
export const useAdmins = () => {
  const api = useApi()

  return {
    me: () => api.get<AdminAccount>('/admin/me'),
    list: (params: { keyword?: string, userType?: string, status?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<AdminAccount> | AdminAccount[]>('/admin/admins', params),
    detail: (id: number) => api.get<AdminAccount>(`/admin/admins/${id}`),
    create: (body: { email: string, password: string, name: string, phone?: string, role: UserType }) =>
      api.post<{ id: number }>('/admin/admins', body),
    updateRole: (id: number, body: { role: UserType }) => api.patch<void>(`/admin/admins/${id}/role`, body),
    updateStatus: (id: number, body: { status: UserStatus }) => api.patch<void>(`/admin/admins/${id}/status`, body)
  }
}
