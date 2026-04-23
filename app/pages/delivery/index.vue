<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { Carrier, ShipmentTracking } from '~/composables/useAdminDelivery'

useHead({ title: '배송 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const deliveryApi = useAdminDelivery()
const toast = useToast()

const carriers = ref<Carrier[]>([])
const loadingCarriers = ref(false)

const orderIdInput = ref('')
const searched = ref<number | null>(null)
const trackings = ref<ShipmentTracking[]>([])
const searching = ref(false)

const loadCarriers = async () => {
  loadingCarriers.value = true
  try {
    carriers.value = await deliveryApi.carriers()
  } finally { loadingCarriers.value = false }
}

const search = async () => {
  const n = Number(orderIdInput.value)
  if (!n || Number.isNaN(n)) return
  searching.value = true
  searched.value = n
  try {
    const data = await deliveryApi.trackingByOrder(n)
    trackings.value = Array.isArray(data) ? data : (data ? [data] : [])
  } catch {
    trackings.value = []
  } finally { searching.value = false }
}

const refresh = async (shipmentId: number) => {
  try {
    await deliveryApi.refreshTracking(shipmentId)
    toast.success('배송 정보를 갱신했습니다.')
    if (searched.value) await search()
  } catch (e) {
    toast.error(e, '갱신 실패')
  }
}

onMounted(loadCarriers)
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
        <FilterBar @search="search">
          <label class="text-sm text-muted-foreground whitespace-nowrap">주문 ID</label>
          <Input
            v-model="orderIdInput"
            type="number"
            placeholder="추적할 주문 ID 입력"
            class="max-w-xs"
            @keyup.enter="search"
          />
          <template #actions>
            <Button @click="search">
              <Icon name="lucide:package-search" size="14" class="mr-1" /> 추적
            </Button>
          </template>
        </FilterBar>

        <div v-if="searched === null">
          <Card>
            <CardContent class="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div class="grid place-items-center h-12 w-12 rounded-full bg-muted/60">
                <Icon name="lucide:truck" size="22" class="opacity-60" />
              </div>
              <p class="text-sm">주문 ID 를 입력하고 추적하면 배송 이력이 표시됩니다.</p>
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
