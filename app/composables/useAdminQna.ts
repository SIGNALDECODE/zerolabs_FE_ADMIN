import type { PageResponse } from '~/types/api'
import type { Qna } from '~/types/content'

export const useAdminQna = () => {
  const api = useApi()

  return {
    statuses: () => api.get<Array<{ code: string, description: string } | string>>('/admin/qnas/statuses'),
    list: (params: { status?: string, keyword?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Qna>>('/admin/qnas', params),
    detail: (id: number) => api.get<Qna>(`/admin/qnas/${id}`),
    answer: (id: number, body: { answer: string }) => api.patch<void>(`/admin/qnas/${id}/answer`, body),
    remove: (id: number) => api.del<void>(`/admin/qnas/${id}`)
  }
}
