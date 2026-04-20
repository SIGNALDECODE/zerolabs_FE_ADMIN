import type { PageResponse } from '~/types/api'
import type { InquiryDetail, InquiryListItem } from '~/types/content'

export const useAdminInquiry = () => {
  const api = useApi()

  return {
    types: () => api.get<Array<{ code: string, description: string } | string>>('/admin/inquiries/types'),
    list: (params: {
      status?: string
      inquiryType?: string
      keyword?: string
      page?: number
      size?: number
    } = {}) => api.get<PageResponse<InquiryListItem>>('/admin/inquiries', params),
    detail: (id: number) => api.get<InquiryDetail>(`/admin/inquiries/${id}`),
    answer: (id: number, body: { answerContent: string }) =>
      api.patch<void>(`/admin/inquiries/${id}/answer`, body),
    remove: (id: number) => api.del<void>(`/admin/inquiries/${id}`),
    bulkRemove: (ids: number[]) => api.del<void>('/admin/inquiries', { body: ids })
  }
}
