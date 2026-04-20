import type { PageResponse } from '~/types/api'
import type { ProductDetail, ProductListItem } from '~/types/product'

export const useAdminProduct = () => {
  const api = useApi()

  return {
    list: (params: {
      status?: string
      hasDiscount?: boolean
      tagId?: number
      searchType?: string
      keyword?: string
      page?: number
      size?: number
    } = {}) => api.get<PageResponse<ProductListItem>>('/admin/products', params),
    detail: (id: number) => api.get<ProductDetail>(`/admin/products/${id}`),

    /**
     * 등록: multipart (data = JSON string, primaryImage = File?)
     */
    create: (formData: FormData) => api.post<{ id: number }>('/admin/products', formData),

    /**
     * 수정: multipart (data = JSON string, primaryImage = File?)
     */
    update: (id: number, formData: FormData) => api.patch<void>(`/admin/products/${id}`, formData),

    remove: (id: number) => api.del<void>(`/admin/products/${id}`)
  }
}
