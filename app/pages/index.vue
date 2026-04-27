<script setup lang="ts">
import { formatCurrency, formatDate } from '~/utils/format'
import type { OrderListItem } from '~/types/order'

useHead({ title: '대시보드 | ZeroLabs Admin' })

const orderApi = useAdminOrder()
const claimApi = useAdminClaim()
const router = useRouter()

// 상태별 집계 (pending/preparing/shipping)는 현재 BE 에 전용 엔드포인트가 없어
// 각 상태를 병렬로 count 조회 (size=1 로 total_elements 만 사용).
const orderStats = ref({ pending: 0, preparing: 0, shipping: 0 })
const recentOrders = ref<OrderListItem[]>([])
const pendingClaims = ref(0)
const loading = ref(false)

const countByStatus = async (status: string): Promise<number> => {
  const res = await orderApi.list({ status, page: 1, size: 1 }).catch(() => null)
  return res?.total_elements ?? 0
}

const loadDashboard = async () => {
  loading.value = true
  try {
    const [orders, claims, pending, preparing, shipping] = await Promise.all([
      orderApi.list({ page: 1, size: 5 }).catch(() => null),
      claimApi.list({ status: 'REQUESTED', page: 1, size: 1 }).catch(() => null),
      countByStatus('PENDING'),
      countByStatus('PREPARING'),
      countByStatus('SHIPPING')
    ])

    recentOrders.value = orders?.content ?? []
    orderStats.value = { pending, preparing, shipping }
    pendingClaims.value = claims?.total_elements ?? 0
  } finally {
    loading.value = false
  }
}

/**
 * KPI 카드 정의. 각 카드는 클릭하면 해당 작업 페이지로 이동 (운영자 시선:
 * "이 숫자를 본 직후 바로 처리하러 가고 싶다").
 * 톤은 시각적 우선순위를 의미: warning(즉시 응대 필요) → info(진행) → success(흐름) → danger(이슈).
 */
const kpis = computed(() => [
  {
    label: '입금대기',
    value: orderStats.value.pending,
    icon: 'lucide:clock',
    to: '/orders?status=PENDING',
    tone: 'warning' as const,
    hint: '결제 확인 필요'
  },
  {
    label: '배송준비',
    value: orderStats.value.preparing,
    icon: 'lucide:package',
    to: '/orders?status=PREPARING',
    tone: 'info' as const,
    hint: '출고 대기'
  },
  {
    label: '배송중',
    value: orderStats.value.shipping,
    icon: 'lucide:truck',
    to: '/orders?status=SHIPPING',
    tone: 'success' as const,
    hint: '배송 진행 중'
  },
  {
    label: '클레임 대기',
    value: pendingClaims.value,
    icon: 'lucide:alert-triangle',
    to: '/claims?status=REQUESTED',
    tone: 'danger' as const,
    hint: '취소·반품·교환 응대'
  }
])

const TONE_STYLE: Record<'warning' | 'info' | 'success' | 'danger', { ring: string, bg: string, text: string, dot: string }> = {
  warning: { ring: 'hover:ring-amber-300/60 hover:border-amber-300/80', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  info: { ring: 'hover:ring-blue-300/60 hover:border-blue-300/80', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  success: { ring: 'hover:ring-emerald-300/60 hover:border-emerald-300/80', bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  danger: { ring: 'hover:ring-rose-300/60 hover:border-rose-300/80', bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="p-4 sm:p-8">
    <PageHeader
      icon="lucide:layout-dashboard"
      title="대시보드"
      description="쇼핑몰 운영 현황 한눈에 보기"
    >
      <template #actions>
        <Button variant="outline" size="sm" :disabled="loading" @click="loadDashboard">
          <Icon name="lucide:refresh-cw" size="14" class="mr-1" :class="loading ? 'animate-spin' : ''" />
          새로고침
        </Button>
      </template>
    </PageHeader>

    <!-- KPI 카드: 클릭 시 해당 작업 화면으로 직행 (즉시 처리 흐름) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <NuxtLink
        v-for="kpi in kpis"
        :key="kpi.label"
        :to="kpi.to"
        class="group block"
      >
        <Card
          class="relative h-full transition-all hover:shadow-md hover:-translate-y-0.5 ring-0 ring-offset-2 hover:ring-2"
          :class="TONE_STYLE[kpi.tone].ring"
        >
          <!-- 좌측 톤 인디케이터 -->
          <span
            class="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
            :class="TONE_STYLE[kpi.tone].dot"
            aria-hidden="true"
          />
          <CardContent class="p-5 pl-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {{ kpi.label }}
                </p>
                <p class="mt-2 text-3xl font-bold tabular-nums leading-none" :class="TONE_STYLE[kpi.tone].text">
                  <span v-if="loading" class="inline-block h-7 w-12 rounded bg-muted animate-pulse" />
                  <span v-else>{{ kpi.value.toLocaleString() }}</span>
                </p>
                <p class="mt-2 text-[11px] text-muted-foreground">{{ kpi.hint }}</p>
              </div>
              <span
                class="grid place-items-center h-10 w-10 rounded-lg shrink-0"
                :class="[TONE_STYLE[kpi.tone].bg, TONE_STYLE[kpi.tone].text]"
              >
                <Icon :name="kpi.icon" size="20" />
              </span>
            </div>
            <div class="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 group-hover:text-foreground transition-colors">
              바로가기
              <Icon name="lucide:arrow-right" size="11" class="transition-transform group-hover:translate-x-0.5" />
            </div>
          </CardContent>
        </Card>
      </NuxtLink>
    </div>

    <!-- 최근 주문 -->
    <DetailSection title="최근 주문" description="최근 5건" icon="lucide:list">
      <div class="col-span-2">
        <Table>
          <TableHeader>
            <TableRow class="bg-muted/50 hover:bg-muted/50 border-b-2">
              <TableHead class="text-[11px] font-bold uppercase tracking-wider">주문번호</TableHead>
              <TableHead class="text-[11px] font-bold uppercase tracking-wider">상태</TableHead>
              <TableHead class="text-[11px] font-bold uppercase tracking-wider text-right">금액</TableHead>
              <TableHead class="text-[11px] font-bold uppercase tracking-wider">주문일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell colspan="4" class="text-center text-muted-foreground py-8">
                <Icon name="lucide:loader-2" size="14" class="inline animate-spin mr-1" />
                불러오는 중…
              </TableCell>
            </TableRow>
            <TableRow v-else-if="!recentOrders.length">
              <TableCell colspan="4" class="text-center text-muted-foreground py-10">
                <div class="grid place-items-center h-10 w-10 mx-auto mb-2 rounded-full bg-muted/60">
                  <Icon name="lucide:shopping-cart" size="18" class="opacity-60" />
                </div>
                최근 주문이 없습니다.
              </TableCell>
            </TableRow>
            <tr
              v-for="(order, i) in recentOrders"
              :key="order.id"
              :class="[
                'border-b transition-colors cursor-pointer hover:bg-accent/50',
                i % 2 === 1 ? 'bg-muted/20' : ''
              ]"
              @click="router.push(`/orders/${order.id}`)"
            >
              <TableCell class="font-mono text-xs font-medium">{{ order.orderNumber }}</TableCell>
              <TableCell><StatusBadge :status="order.status" /></TableCell>
              <TableCell class="text-right font-medium tabular-nums">{{ formatCurrency(order.grandTotal) }}</TableCell>
              <TableCell class="text-xs text-muted-foreground">{{ formatDate(order.orderedAt) }}</TableCell>
            </tr>
          </TableBody>
        </Table>
      </div>
    </DetailSection>
  </div>
</template>
