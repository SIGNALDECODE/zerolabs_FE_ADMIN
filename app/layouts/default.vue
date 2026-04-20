<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()

const navSections = [
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
      { to: '/admins', label: '관리자', icon: 'lucide:shield' }
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

const handleLogout = async () => {
  await authStore.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-muted/20">
    <aside class="w-64 shrink-0 border-r bg-card flex flex-col">
      <div class="h-14 flex items-center px-6 border-b">
        <NuxtLink to="/" class="font-semibold tracking-tight text-sm">
          ZeroLabs <span class="text-muted-foreground">Admin</span>
        </NuxtLink>
      </div>

      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        <div v-for="section in navSections" :key="section.label">
          <p class="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {{ section.label }}
          </p>
          <ul class="space-y-0.5">
            <li v-for="item in section.items" :key="item.to">
              <NuxtLink
                :to="item.to"
                class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
                active-class="!bg-accent !text-accent-foreground font-medium"
                :exact-active-class="item.to === '/' ? '!bg-accent !text-accent-foreground font-medium' : ''"
              >
                <Icon :name="item.icon" size="16" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>

      <div class="p-3 border-t">
        <div class="flex items-center gap-3 px-3 py-2 mb-2">
          <div class="h-8 w-8 rounded-full bg-primary/10 grid place-items-center text-primary text-xs font-semibold">
            {{ authStore.user?.name?.[0] ?? 'A' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ authStore.user?.name || '관리자' }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ authStore.user?.role }}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" class="w-full justify-start" @click="handleLogout">
          <Icon name="lucide:log-out" size="16" class="mr-2" />
          로그아웃
        </Button>
      </div>
    </aside>

    <main class="flex-1 min-w-0">
      <slot />
    </main>
  </div>
</template>
