<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { Carrier, ShipmentTracking } from '~/composables/useAdminDelivery'
import type { OrderListItem } from '~/types/order'

useHead({ title: '배송 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const deliveryApi = useAdminDelivery()
const orderApi = useAdminOrder()
const toast = useToast()

const carriers = ref<Carrier[]>([])
const loadingCarriers = ref(false)

const orderIdInput = ref('')
const searched = ref<number | null>(null)
const trackings = ref<ShipmentTracking[]>([])
const searching = ref(false)

const recent = ref<OrderListItem[]>([])
const loadingRecent = ref(false)

const loadCarriers = async () => {
  loadingCarriers.value = true
  try {
    carriers.value = await deliveryApi.carriers()
  } finally { loadingCarriers.value = false }
}

const loadRecent = async () => {
  loadingRecent.value = true
  try {
    const data = await orderApi.list({ status: 'SHIPPING', page: 1, size: 10 })
    recent.value = data?.content || []
  } catch {
    recent.value = []
  } finally { loadingRecent.value = false }
}

const search = async (orderId?: number) => {
  const n = orderId ?? Number(orderIdInput.value)
  if (!n || Number.isNaN(n)) return
  orderIdInput.value = String(n)
  searching.value = true
  searched.value = n
  try {
    const data = await deliveryApi.trackingByOrder(n)
    trackings.value = Array.isArray(data) ? data : (data ? [data] : [])
  } catch {
    trackings.value = []
  } finally { searching.value = false }
}

const pickRecent = (row: OrderListItem) => {
  router.replace({ query: { ...route.query, orderId: String(row.id) } })
  search(row.id)
}

const clearSearch = () => {
  orderIdInput.value = ''
  searched.value = null
  trackings.value = []
  router.replace({ query: {} })
}

const refresh = async (shipmentId: number) => {
  try {
    await deliveryApi.refreshTracking(shipmentId)
    toast.success('배송 정보를 갱신했습니다.')
    if (searched.value) await search(searched.value)
  } catch (e) {
    toast.error(e, '갱신 실패')
  }
}

onMounted(() => {
  loadCarriers()
  loadRecent()
  const qid = Number(route.query.orderId)
  if (qid && !Number.isNaN(qid)) search(qid)
})
</script>

<template>
  <div class="p-4 sm:p-8">
    <PageHeader
      icon="lucide:truck"
      title="배송 관리"
      description="송장 추적 · 택배사 관리"
    />

    <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div class="space-y-4">
        <FilterBar @search="() => search()">
          <label class="text-sm text-muted-foreground whitespace-nowrap">주문 ID</label>
          <Input
            v-model="orderIdInput"
            type="number"
            placeholder="추적할 주문 ID 입력"
            class="max-w-xs"
            @keyup.enter="() => search()"
          />
          <template #actions>
            <Button variant="outline" v-if="searched !== null" @click="clearSearch">
              <Icon name="lucide:x" size="14" class="mr-1" /> 초기화
            </Button>
            <Button @click="() => search()">
              <Icon name="lucide:package-search" size="14" class="mr-1" /> 추적
            </Button>
          </template>
        </FilterBar>

        <div v-if="searched === null">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-base">배송 중 주문</CardTitle>
              <CardDescription>최근 10건 · 주문을 클릭하면 배송 이력이 표시됩니다.</CardDescription>
            </CardHeader>
            <CardContent class="p-0">
              <div v-if="loadingRecent" class="py-10 text-center text-muted-foreground text-sm">불러오는 중…</div>
              <ul v-else-if="recent.length" class="divide-y">
                <li
                  v-for="row in recent"
                  :key="row.id"
                  class="px-4 py-3 flex items-center gap-3 text-sm hover:bg-muted/40 cursor-pointer"
                  @click="pickRecent(row)"
                >
                  <img
                    v-if="row.productThumbnailUrl"
                    :src="row.productThumbnailUrl"
                    class="h-9 w-9 rounded border object-cover shrink-0"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs text-muted-foreground">{{ row.orderNumber }}</span>
                      <StatusBadge :status="row.status" />
                    </div>
                    <div class="truncate text-muted-foreground text-xs mt-0.5">
                      {{ row.productName ?? '-' }} · {{ row.itemCount ?? 0 }}개
                    </div>
                  </div>
                  <span class="shrink-0 text-xs text-muted-foreground font-mono">{{ formatDate(row.orderedAt) }}</span>
                  <Icon name="lucide:chevron-right" size="14" class="text-muted-foreground" />
                </li>
              </ul>
              <p v-else class="py-10 text-center text-muted-foreground text-sm">
                배송 중인 주문이 없습니다. 주문 ID 로 직접 추적할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>

        <div v-else>
          <div v-if="searching" class="text-center text-muted-foreground py-10">조회 중…</div>
          <div v-else-if="!trackings.length">
            <Card>
              <CardContent class="py-10 text-center text-muted-foreground text-sm">
                주문 #{{ searched }} 의 배송 정보가 없습니다.
              </CardContent>
            </Card>
          </div>
          <div v-else class="space-y-4">
            <Card v-for="t in trackings" :key="t.shipmentId">
              <CardHeader class="pb-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle class="text-base">
                      {{ t.carrierName ?? '-' }}
                      <span class="text-muted-foreground font-mono text-sm ml-2">
                        {{ t.trackingNumber ?? '-' }}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      배송 ID · {{ t.shipmentId }}
                      <span v-if="t.lastUpdated" class="ml-2">· 최근 업데이트 {{ formatDate(t.lastUpdated) }}</span>
                    </CardDescription>
                  </div>
                  <div class="flex items-center gap-2">
                    <StatusBadge :status="t.status" />
                    <Button variant="outline" size="sm" @click="refresh(t.shipmentId)">
                      <Icon name="lucide:refresh-cw" size="14" class="mr-1" /> 갱신
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ol v-if="t.events?.length" class="relative border-l border-border pl-4 space-y-4">
                  <li v-for="(e, i) in t.events" :key="i" class="relative">
                    <span
                      class="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full"
                      :class="i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'"
                    />
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-sm font-medium">{{ e.status }}</p>
                        <p class="text-xs text-muted-foreground">
                          {{ [e.location, e.description].filter(Boolean).join(' · ') }}
                        </p>
                      </div>
                      <span class="shrink-0 text-xs text-muted-foreground font-mono">{{ formatDate(e.trackedAt) }}</span>
                    </div>
                  </li>
                </ol>
                <p v-else class="text-center text-muted-foreground text-sm py-4">배송 이력이 없습니다.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <aside>
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">택배사</CardTitle>
            <CardDescription>연동 가능한 택배사 목록</CardDescription>
          </CardHeader>
          <CardContent class="p-0">
            <ul v-if="carriers.length" class="divide-y">
              <li v-for="c in carriers" :key="c.id ?? c.code" class="px-4 py-2 text-sm flex items-center justify-between">
                <span>{{ c.name }}</span>
                <span class="font-mono text-xs text-muted-foreground">{{ c.code }}</span>
              </li>
            </ul>
            <p v-else-if="loadingCarriers" class="text-center text-muted-foreground text-sm py-6">불러오는 중…</p>
            <p v-else class="text-center text-muted-foreground text-sm py-6">등록된 택배사가 없습니다.</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  </div>
</template>
