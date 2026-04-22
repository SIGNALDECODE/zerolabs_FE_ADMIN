import type { PageResponse } from '~/types/api'
import type { PointHistoryEntry } from '~/types/user'

export const useAdminPoint = () => {
  const api = useApi()

  return {
    getUserPoints: (userId: number, page = 1, size = 20) =>
      api.get<PageResponse<PointHistoryEntry> | PointHistoryEntry[]>(`/admin/users/${userId}/points`, { page, size }),
    adjust: (userId: number, body: { amount: number, reason: string }) =>
      api.post<void>(`/admin/users/${userId}/points`, body)
  }
}
