<script setup lang="ts">
/**
 * /delivery/[id] — id = shipmentId
 */
import { formatDate } from '~/utils/format'
import type { ShipmentTracking } from '~/composables/useAdminDelivery'

definePageMeta({ layout: 'default' })

const route = useRoute()
const deliveryApi = useAdminDelivery()
const toast = useToast()

const shipmentId = Number(route.params.id)
const tracking = ref<ShipmentTracking | null>(null)
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    tracking.value = await deliveryApi.tracking(shipmentId)
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  try {
    await deliveryApi.refreshTracking(shipmentId)
    toast.success('배송 정보를 갱신했습니다.')
    await load()
  } catch (e) {
    toast.error(e, '갱신 실패')
  }
}

onMounted(load)
useHead({ title: () => `배송 #${shipmentId} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-3xl">
    <DetailHeader
      icon="lucide:truck"
      :title="`배송 #${shipmentId}`"
      :subtitle="tracking?.carrierName ? `${tracking.carrierName} · ${tracking.trackingNumber}` : null"
      back-to="/delivery"
      back-label="배송 목록으로"
    >
      <template #actions>
        <StatusBadge v-if="tracking" :status="tracking.status" />
        <Button variant="outline" size="sm" @click="refresh">
          <Icon name="lucide:refresh-cw" size="14" class="mr-1" /> 갱신
        </Button>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <div v-else-if="tracking" class="space-y-6">
      <DetailSection title="배송 정보">
        <DetailField label="택배사" :value="tracking.carrierName" />
        <DetailField label="택배사 코드" :value="tracking.carrierCode" mono />
        <DetailField label="송장번호" :value="tracking.trackingNumber" mono />
        <DetailField label="상태" :value="tracking.status" />
        <DetailField label="상태 코드" :value="tracking.deliveryStatusCode" mono />
        <DetailField label="최근 업데이트" :value="formatDate(tracking.lastUpdated)" />
      </DetailSection>

      <DetailSection title="추적 이력" :description="`${tracking.events?.length ?? 0}건`">
        <div class="col-span-2">
          <ol v-if="tracking.events?.length" class="relative border-l border-border pl-4 space-y-4">
            <li v-for="(e, i) in tracking.events" :key="i" class="relative">
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
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">배송 정보를 찾을 수 없습니다.</div>
  </div>
</template>
