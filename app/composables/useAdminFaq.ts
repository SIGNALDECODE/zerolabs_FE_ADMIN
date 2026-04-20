import type { PageResponse } from '~/types/api'
import type { Faq, FaqCategory } from '~/types/content'

export const useAdminFaq = () => {
  const api = useApi()

  return {
    categories: () => api.get<FaqCategory[]>('/admin/faqs/categories'),
    createCategory: (body: { name: string }) => api.post<{ id: number }>('/admin/faqs/categories', body),
    updateCategory: (id: number, body: any) => api.patch<void>(`/admin/faqs/categories/${id}`, body),
    removeCategory: (id: number) => api.del<void>(`/admin/faqs/categories/${id}`),

    list: (params: { categoryId?: number, keyword?: string, page?: number, size?: number } = {}) =>
      api.get<PageResponse<Faq>>('/admin/faqs', params),
    detail: (id: number) => api.get<Faq>(`/admin/faqs/${id}`),
    create: (body: { categoryId: number, question: string, answer: string }) =>
      api.post<{ id: number }>('/admin/faqs', body),
    update: (id: number, body: Partial<{ categoryId: number, question: string, answer: string }>) =>
      api.patch<void>(`/admin/faqs/${id}`, body),
    remove: (id: number) => api.del<void>(`/admin/faqs/${id}`)
  }
}
