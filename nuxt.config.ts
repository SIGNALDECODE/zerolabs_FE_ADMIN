// https://nuxt.com/docs/api/configuration/nuxt-config
import type { Nuxt } from 'nuxt/schema'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  runtimeConfig: {
    // 프록시 타겟 (server/api/[...].ts 가 사용). dev/prod 모두 BE 절대 URL 을 주입한다.
    apiBaseUrl: process.env.API_BASE_URL || '',
    public: {
      // CSR 호출 base. dev/prod 공통으로 '/api' (Nuxt 서버 프록시 경유, same-origin 우회).
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    }
  },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    'shadcn-nuxt',
    '@vueuse/nuxt',
    // shadcn-nuxt 가 components:dirs 에 unshift 한 { path: 'components/ui', extensions: [] } 은
    // Nuxt 의 fallback 으로 .vue 가 스캔돼 index.ts barrel 과 이름 충돌한다. 모듈 순서 기반으로
    // shadcn 이후 실행되도록 inline module 로 hook 등록해 dummy dir 을 제거한다.
    (_opts: Record<string, unknown>, nuxt: Nuxt) => {
      nuxt.hook('components:dirs', (dirs) => {
        for (let i = dirs.length - 1; i >= 0; i--) {
          const d = dirs[i]
          if (
            typeof d === 'object'
            && d !== null
            && typeof d.path === 'string'
            && d.path.replace(/\\/g, '/').endsWith('/components/ui')
            && Array.isArray(d.extensions)
            && d.extensions.length === 0
          ) {
            dirs.splice(i, 1)
          }
        }
      })
    }
  ],

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui'
  },

  // Nuxt 기본은 `app/components/` 를 자동 재귀 스캔한다. 이게 shadcn-nuxt 가 등록한
  // ~/components/ui/*/index.ts 의 Barrel 등록과 충돌("Two component files..."). 아래 설정으로 scan
  // 대상을 한정 + ui 하위를 명시적으로 제외한다.
  components: {
    dirs: [
      { path: '~/components', pathPrefix: false, ignore: ['**/ui/**'] }
    ]
  },

  css: ['~/assets/css/tailwind.css'],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ko' },
      title: 'ZeroLabs Admin',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },

  typescript: {
    strict: true,
    shim: false
  },

  experimental: {
    // Nuxt 3.21.2 의 dev 모드에서 "Failed to resolve import '#app-manifest'" Pre-transform error 가 반복 발생.
    // 관리자 패널은 payload-extraction / route rules 기반 클라이언트 prefetch 기능을 쓰지 않으므로 비활성화해도 안전.
    appManifest: false
  },

  vite: {
    server: {
      hmr: { port: 24680 }
    }
  }
})
