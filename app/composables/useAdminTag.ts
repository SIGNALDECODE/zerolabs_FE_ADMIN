import type { ProductTag } from '~/types/product'

export const useAdminTag = () => {
  const api = useApi()

  return {
    list: () => api.get<ProductTag[]>('/admin/tags'),
    create: (body: { name: string }) => api.post<ProductTag>('/admin/tags', body),
    remove: (id: number) => api.del<void>(`/admin/tags/${id}`)
  }
}
