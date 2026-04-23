<script setup lang="ts">
/**
 * /refunds/[id] — id는 orderId로 취급 (백엔드에 단일 환불 조회 엔드포인트 없음).
 */
import { formatCurrency, formatDate } from '~/utils/format'
import type { RefundRecord } from '~/types/claim'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const refundApi = useAdminRefund()

const orderId = Number(route.params.id)
const refunds = ref<RefundRecord[]>([])
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    const data = await refundApi.listByOrder(orderId)
    refunds.value = Array.isArray(data) ? data : []
  } finally {
    loading.value = false
  }
}

const statusLabels: Record<string, string> = {
  PENDING: '대기',
  COMPLETED: '완료',
  FAILED: '실패'
}

onMounted(load)
useHead({ title: `주문 #${orderId} 환불 이력 | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-4xl">
    <DetailHeader
      :title="`주문 #${orderId} 환불 이력`"
      :subtitle="`환불 ${refunds.length}건`"
      back-to="/refunds"
    >
      <template #actions>
        <Button variant="outline" size="sm" @click="router.push(`/orders/${orderId}`)">
          <Icon name="lucide:external-link" size="14" class="mr-1" /> 주문 상세
        </Button>
        <Button variant="outline" size="sm" @click="load">
          <Icon name="lucide:refresh-cw" size="14" class="mr-1" /> 새로고침
        </Button>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <div v-else class="space-y-4">
      <Card v-for="r in refunds" :key="r.id">
        <CardContent class="pt-6">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <p class="font-mono text-sm">{{ r.refundNumber }}</p>
              <p class="text-xs text-muted-foreground mt-1">결제 · {{ r.paymentNumber }}</p>
            </div>
            <StatusBadge :label="statusLabels[r.status] ?? r.status" :status="r.status" />
          </div>
          <dl class="grid grid-cols-2 gap-x-6">
            <DetailField label="환불 금액" :value="formatCurrency(r.amount)" />
            <DetailField label="PG 거래번호" :value="r.pgTid" mono />
            <DetailField label="요청일시" :value="formatDate(r.createdAt)" />
            <DetailField label="완료일시" :value="formatDate(r.completedAt)" />
            <DetailField label="사유" full>
              <div class="whitespace-pre-wrap">{{ r.reason ?? '-' }}</div>
            </DetailField>
          </dl>
        </CardContent>
      </Card>

      <Card v-if="!refunds.length">
        <CardContent class="py-12 text-center text-muted-foreground text-sm">
          환불 이력이 없습니다.
        </CardContent>
      </Card>
    </div>
  </div>
</template>
