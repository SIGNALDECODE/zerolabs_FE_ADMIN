<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

/**
 * 소비자몰(zerolabs_FE) 통합 전까지 메뉴에서 숨길 경로.
 * 라우트 자체는 살아있어 직접 URL 접근(개발/QA)은 가능.
 * 통합 완료 후 Set 에서 제거하면 다시 노출됨.
 */
const HIDDEN_NAV_PATHS = new Set(['/displays', '/popups'])

/**
 * `adminOnly: true` 항목은 최고관리자(ADMIN)에게만 사이드바에 노출됨.
 * 라우트 자체는 살아있어 직접 URL 접근은 가능 (현재 BE가 ADMIN/STAFF 권한 차이 없음).
 */
type NavItem = { to: string, label: string, icon: string, adminOnly?: boolean }

const rawNavSections: { label: string, items: NavItem[] }[] = [
  {
    label: '운영',
    items: [
      { to: '/', label: '대시보드', icon: 'lucide:layout-dashboard' },
      { to: '/orders', label: '주문', icon: 'lucide:shopping-cart' },
      { to: '/claims', label: '클레임', icon: 'lucide:refresh-cw' },
      { to: '/refunds', label: '환불', icon: 'lucide:banknote' },
      { to: '/delivery', label: '배송', icon: 'lucide:truck' }
    ]
  },
  {
    label: '상품',
    items: [
      { to: '/products', label: '상품', icon: 'lucide:package' },
      { to: '/categories', label: '카테고리', icon: 'lucide:folder-tree' },
      { to: '/promotions', label: '프로모션', icon: 'lucide:percent' },
      { to: '/coupons', label: '쿠폰', icon: 'lucide:ticket' }
    ]
  },
  {
    label: '회원',
    items: [
      { to: '/users', label: '회원', icon: 'lucide:users' },
      { to: '/admins', label: '관리자', icon: 'lucide:shield', adminOnly: true }
    ]
  },
  {
    label: '콘텐츠',
    items: [
      { to: '/banners', label: '배너', icon: 'lucide:image' },
      { to: '/popups', label: '팝업', icon: 'lucide:square-stack' },
      { to: '/displays', label: '전시 섹션', icon: 'lucide:layers' },
      { to: '/reviews', label: '리뷰', icon: 'lucide:star' },
      { to: '/qnas', label: 'Q&A', icon: 'lucide:help-circle' },
      { to: '/inquiries', label: '1:1 문의', icon: 'lucide:mail' },
      { to: '/notices', label: '공지사항', icon: 'lucide:megaphone' },
      { to: '/faqs', label: 'FAQ', icon: 'lucide:book-open' }
    ]
  },
  {
    label: '설정',
    items: [
      { to: '/tenant', label: '쇼핑몰 설정', icon: 'lucide:store' },
      { to: '/policy', label: '운영 정책', icon: 'lucide:scroll-text' }
    ]
  }
]

const navSections = computed(() =>
  rawNavSections
    .map(s => ({
      ...s,
      items: s.items.filter(it =>
        !HIDDEN_NAV_PATHS.has(it.to)
        && (!it.adminOnly || authStore.isAdmin)
      )
    }))
    .filter(s => s.items.length > 0)
)

const handleLogout = async () => {
  await authStore.logout()
  router.replace('/login')
}

/**
 * 모바일 사이드 드로어 상태.
 * - lg(>=1024px) 이상: 좌측 aside 항상 표시
 * - lg 미만: 상단 모바일 바 + 햄버거. 클릭 시 drawer slide-in
 */
const mobileNavOpen = ref(false)

// 라우트 변경 시 drawer 자동 닫기 (모바일에서 메뉴 클릭 후 화면 전환 자연스럽게)
watch(() => route.fullPath, () => { mobileNavOpen.value = false })

// drawer 열린 동안 ESC 로 닫기
if (import.meta.client) {
  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && mobileNavOpen.value) mobileNavOpen.value = false
  })
}

// 현재 페이지의 메뉴명을 모바일 헤더에 표기 (어디 있는지 즉시 인지)
const currentNav = computed(() => {
  const all = navSections.value.flatMap(s => s.items)
  // 정확 일치 → 가장 긴 prefix 매칭 순으로
  const exact = all.find(i => i.to === route.path)
  if (exact) return exact
  const candidates = all.filter(i => i.to !== '/' && route.path.startsWith(i.to))
  return candidates.sort((a, b) => b.to.length - a.to.length)[0]
})
</script>

<template>
  <div class="flex min-h-screen bg-muted/20">
    <!-- 데스크톱 사이드바 (lg 이상에서만) -->
    <aside class="hidden lg:flex w-64 shrink-0 border-r bg-card flex-col">
      <div class="h-14 flex items-center px-6 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <NuxtLink to="/" class="font-bold tracking-tight text-base flex items-center gap-2">
          <span class="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground text-xs font-bold">Z</span>
          ZeroLabs <span class="text-muted-foreground font-normal text-sm">Admin</span>
        </NuxtLink>
      </div>

      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        <div v-for="section in navSections" :key="section.label">
          <p class="px-3 mb-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
            {{ section.label }}
          </p>
          <ul class="space-y-0.5">
            <li v-for="item in section.items" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="group relative flex items-center gap-2.5 rounded-md pl-4 pr-3 py-2 text-sm text-foreground/75 hover:text-foreground hover:bg-accent/60 transition-colors"
                active-class="!bg-accent !text-accent-foreground font-semibold [&>.nav-indicator]:opacity-100 [&_svg]:text-primary"
                :exact-active-class="item.to === '/' ? '!bg-accent !text-accent-foreground font-semibold [&>.nav-indicator]:opacity-100 [&_svg]:text-primary' : ''"
              >
                <span
                  class="nav-indicator absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r opacity-0 transition-opacity"
                  aria-hidden="true"
                />
                <Icon :name="item.icon" size="16" class="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>

      <div class="p-3 border-t bg-muted/30">
        <div class="flex items-center gap-3 px-2 py-2 mb-2">
          <div class="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold shadow-sm">
            {{ authStore.user?.name?.[0] ?? 'A' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ authStore.user?.name || '관리자' }}</p>
            <p class="text-[11px] text-muted-foreground truncate uppercase tracking-wider">{{ authStore.user?.role }}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" class="w-full justify-start" @click="handleLogout">
          <Icon name="lucide:log-out" size="14" class="mr-2" />
          로그아웃
        </Button>
      </div>
    </aside>

    <!-- 모바일 드로어 (lg 미만) -->
    <Teleport to="body">
      <Transition
        enter-from-class="opacity-0"
        enter-active-class="transition-opacity duration-200"
        leave-to-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
      >
        <div
          v-if="mobileNavOpen"
          class="lg:hidden fixed inset-0 z-40 bg-black/50"
          @click="mobileNavOpen = false"
        />
      </Transition>
      <Transition
        enter-from-class="-translate-x-full"
        enter-active-class="transition-transform duration-200"
        leave-to-class="-translate-x-full"
        leave-active-class="transition-transform duration-150"
      >
        <aside
          v-if="mobileNavOpen"
          class="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col shadow-xl"
        >
          <div class="h-14 flex items-center justify-between px-6 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <NuxtLink to="/" class="font-bold tracking-tight text-base flex items-center gap-2" @click="mobileNavOpen = false">
              <span class="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground text-xs font-bold">Z</span>
              ZeroLabs <span class="text-muted-foreground font-normal text-sm">Admin</span>
            </NuxtLink>
            <button
              type="button"
              class="grid place-items-center h-8 w-8 rounded-md hover:bg-accent text-muted-foreground"
              @click="mobileNavOpen = false"
            >
              <Icon name="lucide:x" size="18" />
            </button>
          </div>

          <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            <div v-for="section in navSections" :key="section.label">
              <p class="px-3 mb-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
                {{ section.label }}
              </p>
              <ul class="space-y-0.5">
                <li v-for="item in section.items" :key="item.to">
                  <NuxtLink
                    :to="item.to"
                    class="group relative flex items-center gap-2.5 rounded-md pl-4 pr-3 py-2 text-sm text-foreground/75 hover:text-foreground hover:bg-accent/60 transition-colors"
                    active-class="!bg-accent !text-accent-foreground font-semibold [&>.nav-indicator]:opacity-100 [&_svg]:text-primary"
                    :exact-active-class="item.to === '/' ? '!bg-accent !text-accent-foreground font-semibold [&>.nav-indicator]:opacity-100 [&_svg]:text-primary' : ''"
                  >
                    <span
                      class="nav-indicator absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r opacity-0 transition-opacity"
                      aria-hidden="true"
                    />
                    <Icon :name="item.icon" size="16" class="text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                    <span>{{ item.label }}</span>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </nav>

          <div class="p-3 border-t bg-muted/30">
            <div class="flex items-center gap-3 px-2 py-2 mb-2">
              <div class="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-bold shadow-sm">
                {{ authStore.user?.name?.[0] ?? 'A' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold truncate">{{ authStore.user?.name || '관리자' }}</p>
                <p class="text-[11px] text-muted-foreground truncate uppercase tracking-wider">{{ authStore.user?.role }}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" class="w-full justify-start" @click="handleLogout">
              <Icon name="lucide:log-out" size="14" class="mr-2" />
              로그아웃
            </Button>
          </div>
        </aside>
      </Transition>
    </Teleport>

    <main class="flex-1 min-w-0 flex flex-col">
      <!-- 모바일 상단 바 (lg 미만): 햄버거 + 현재 페이지명 -->
      <header class="lg:hidden h-12 px-3 border-b bg-card flex items-center gap-2 sticky top-0 z-30">
        <button
          type="button"
          class="grid place-items-center h-9 w-9 rounded-md hover:bg-accent text-foreground/80"
          aria-label="메뉴 열기"
          @click="mobileNavOpen = true"
        >
          <Icon name="lucide:menu" size="20" />
        </button>
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <Icon
            v-if="currentNav?.icon"
            :name="currentNav.icon"
            size="16"
            class="text-primary shrink-0"
          />
          <span class="text-sm font-semibold truncate">
            {{ currentNav?.label ?? 'ZeroLabs Admin' }}
          </span>
        </div>
      </header>

      <div class="flex-1 min-w-0">
        <slot />
      </div>
    </main>
  </div>
</template>
