import type { CategoryNode, CategorySyncResponse } from '~/types/content'

export const useAdminCategory = () => {
  const api = useApi()

  return {
    list: () => api.get<CategoryNode[]>('/admin/categories'),
    /**
     * 카테고리 동기화 (multipart: data = JSON string, categoryImages = File[]).
     * 생성/수정 실패는 예외 throw. 삭제 실패만 응답 바디로 부분 리포트.
     */
    sync: (formData: FormData) => api.put<CategorySyncResponse>('/admin/categories/sync', formData)
  }
}
