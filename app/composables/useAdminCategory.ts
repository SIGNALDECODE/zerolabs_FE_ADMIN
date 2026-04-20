import type { CategoryNode } from '~/types/content'

export const useAdminCategory = () => {
  const api = useApi()

  return {
    list: () => api.get<CategoryNode[]>('/admin/categories'),
    /**
     * 카테고리 동기화 (multipart: data = JSON string, categoryImages = File[])
     */
    sync: (formData: FormData) => api.put<void>('/admin/categories/sync', formData)
  }
}
