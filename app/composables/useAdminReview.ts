import type { PageResponse } from '~/types/api'
import type { Review } from '~/types/content'

export const useAdminReview = () => {
  const api = useApi()

  return {
    list: (params: { keyword?: string, rating?: number, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Review>>('/admin/reviews', params),
    detail: (id: number) => api.get<Review>(`/admin/reviews/${id}`),
    toggleVisibility: (reviewIds: number[]) =>
      api.patch<void>('/admin/reviews/visibility', { reviewIds }),
    writeReply: (reviewId: number, reply: string) =>
      api.put<void>(`/admin/reviews/${reviewId}/reply`, { reply }),
    deleteReply: (reviewId: number) =>
      api.del<void>(`/admin/reviews/${reviewId}/reply`)
  }
}
