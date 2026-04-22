import type { UserGrade } from '~/types/user'

/**
 * BE `GET /admin/users/grades` 응답.
 * - `grades` 만 admin FE 의 다른 화면 (쿠폰 폼 등) 에서 등급 선택지로 사용
 * - `coupons` 는 등급 정책 화면 전용이라 여기서는 무시
 */
export interface GradeListResponse {
  grades: UserGrade[]
}

export const useAdminGrade = () => {
  const api = useApi()
  return {
    list: () => api.get<GradeListResponse>('/admin/users/grades')
  }
}
