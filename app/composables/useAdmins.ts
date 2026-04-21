import type { PageResponse } from '~/types/api'
import type { AdminMe, AdminListItem, AdminDetail } from '~/types/user'
import type { UserStatus, UserType } from '~/types/common'

/**
 * 관리자 계정 관리
 * - /admin/me → AdminMe (camelCase)
 * - /admin/admins (list) → AdminListItem[] (snake created_at)
 * - /admin/admins/{id} (detail) → AdminDetail (snake user_status, *_at)
 */
export const useAdmins = () => {
  const api = useApi()

  return {
    me: () => api.get<AdminMe>('/admin/me'),
    list: (params: { keyword?: string, userType?: string, status?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<AdminListItem> | AdminListItem[]>('/admin/admins', params),
    detail: (id: number) => api.get<AdminDetail>(`/admin/admins/${id}`),
    create: (body: { email: string, password: string, name: string, phone?: string, role: UserType }) =>
      api.post<{ id: number }>('/admin/admins', body),
    updateRole: (id: number, body: { role: UserType }) => api.patch<void>(`/admin/admins/${id}/role`, body),
    updateStatus: (id: number, body: { status: UserStatus }) => api.patch<void>(`/admin/admins/${id}/status`, body)
  }
}
