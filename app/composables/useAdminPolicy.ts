/**
 * 운영 정책 (주문/배송/상품/반품)
 */
export const useAdminPolicy = () => {
  const api = useApi()

  return {
    get: () => api.get<any>('/admin/policy'),
    update: (body: any) => api.put<void>('/admin/policy', body)
  }
}
