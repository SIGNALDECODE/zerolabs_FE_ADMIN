import type { PolicyAllSettings } from '~/types/policy'

/**
 * 운영 정책 (주문/배송/상품/반품)
 */
export const useAdminPolicy = () => {
  const api = useApi()

  return {
    get: () => api.get<PolicyAllSettings>('/admin/policy'),
    update: (body: PolicyAllSettings) => api.put<void>('/admin/policy', body)
  }
}
