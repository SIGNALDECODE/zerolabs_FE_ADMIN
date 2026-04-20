export interface HeaderMenuItem {
  id: string
  label: string
  order: number
}

/**
 * 쇼핑몰 전체 설정 (info/seo/settlement/maintenance/social/notification/security)
 */
export const useAdminTenant = () => {
  const api = useApi()

  return {
    get: () => api.get<any>('/admin/tenant'),
    /**
     * multipart (data = JSON, logo = File?, favicon = File?)
     */
    update: (formData: FormData) => api.put<void>('/admin/tenant', formData),

    headerMenu: () => api.get<{ menus: HeaderMenuItem[] } | HeaderMenuItem[]>('/admin/tenant/header-menu'),
    updateHeaderMenu: (body: { menus: HeaderMenuItem[] }) => api.put<void>('/admin/tenant/header-menu', body)
  }
}
