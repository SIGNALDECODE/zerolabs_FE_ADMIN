/**
 * 전역 인증 가드
 * - /login 은 항상 공개
 * - 나머지는 로그인 필요. 세션 확인 후 미로그인이면 /login 으로 이동
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const authStore = useAuthStore()

  if (!authStore.user) {
    await authStore.fetchUser()
  }

  if (!authStore.isLoggedIn) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`, { replace: true })
  }
})
