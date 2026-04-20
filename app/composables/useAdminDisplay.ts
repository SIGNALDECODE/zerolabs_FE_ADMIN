export interface DisplaySection {
  id: number
  keyword?: string
  keywordCode?: string
  sortOrder?: number
  isActive?: boolean
  title?: string | null
  description?: string | null
  subtitle?: string | null
  bannerImageUrl?: string | null
  linkUrl?: string | null
}

export const useAdminDisplay = () => {
  const api = useApi()

  return {
    list: () => api.get<DisplaySection[]>('/admin/displays'),
    /**
     * 전시 섹션 일괄 수정 (multipart: data = JSON string, bannerImage = File?)
     */
    update: (formData: FormData) => api.put<void>('/admin/displays', formData)
  }
}
