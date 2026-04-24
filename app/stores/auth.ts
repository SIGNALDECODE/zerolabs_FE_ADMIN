import { defineStore } from 'pinia'

interface AdminUser {
  id: number
  email: string
  name: string
  role: string
  [key: string]: unknown
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AdminUser | null,
    isLoggedIn: false,
    loading: false,
    sessionExpired: false,
    sessionExpiredMessage: ''
  }),

  getters: {
    role: (state) => state.user?.role || null,
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isStaff: (state) => state.user?.role === 'STAFF'
  },

  actions: {
    async loginWith(credentials: { email: string, password: string }) {
      const auth = useAdminAuth()
      await auth.login(credentials)
      this.isLoggedIn = true
      if (import.meta.client) {
        localStorage.setItem('adminLoggedIn', 'true')
      }
      await this.fetchUser()
    },

    async logout() {
      try {
        await useAdminAuth().logout()
      } catch {
        // 백엔드 실패해도 FE 상태는 리셋
      }
      this.resetAuthState()
    },

    resetAuthState() {
      this.user = null
      this.isLoggedIn = false
      this.sessionExpired = false
      this.sessionExpiredMessage = ''
      if (import.meta.client) {
        localStorage.removeItem('adminLoggedIn')
      }
    }, 
    
    setSessionExpired(message = '') {
      this.sessionExpired = true
      this.sessionExpiredMessage = message
      this.user = null
      this.isLoggedIn = false
      if (import.meta.client) {
        localStorage.removeItem('adminLoggedIn')
      }
    },

    async fetchUser() {
      try {
        const user = await useAdminAuth().me()
        if (user) {
          this.user = user as AdminUser
          this.isLoggedIn = true
        }
      } catch {
        this.user = null
        this.isLoggedIn = false
      }
    },

    async ensureUser() {
      if (!this.user) {
        this.loading = true
        await this.fetchUser()
        this.loading = false
      }
    }
  }
})
