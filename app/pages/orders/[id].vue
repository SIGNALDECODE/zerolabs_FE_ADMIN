<script setup lang="ts">
import { formatCurrency, formatDate, formatPhone } from '~/utils/format'
import type { OrderDetail, OrderItem, OrderShipping } from '~/types/order'
import type { Carrier } from '~/composables/useAdminDelivery'

definePageMeta({ layout: 'default' })

const route = useRoute()
const orderApi = useAdminOrder()
const deliveryApi = useAdminDelivery()
const toast = useToast()
const confirm = useConfirm()

const id = Number(route.params.id)
const order = ref<OrderDetail | null>(null)
const loading = ref(true)

/** 백엔드는 비회원이면 customer.userId == null 로 내려줌 (name 은 "비회원"). */
const isGuest = computed(() => order.value?.customer?.userId == null)

const SHIPMENT_ALLOWED_STATUSES = ['PREPARING', 'SHIPPING', 'PARTIAL_DELIVERED'] as const
// 단일배송 정책: 송장은 주문당 1건만 등록. 이미 등록되어 있으면 버튼 비노출.
const canCreateShipment = computed(() =>
  !!order.value
  && SHIPMENT_ALLOWED_STATUSES.includes(order.value.status as typeof SHIPMENT_ALLOWED_STATUSES[number])
  && !(order.value.shipments?.length)
)
const canMarkPreparing = computed(() => order.value?.status === 'PAID')
const canMarkDelivered = computed(() =>
  order.value?.status === 'SHIPPING' || order.value?.status === 'PARTIAL_DELIVERED'
)

const markingDelivered = ref(false)
const markDelivered = async () => {
  if (!order.value) return
  const ok = await confirm.ask('배송완료로 변경할까요?', {
    description: '택배사 자동 갱신을 기다리지 않고 주문을 배송완료 상태로 강제 변경합니다. (주의: 송장 추적 상태와 일시적으로 어긋날 수 있습니다.)',
    confirmText: '배송완료',
    tone: 'danger'
  })
  if (!ok) return
  markingDelivered.value = true
  try {
    await orderApi.changeStatuses({ orderIds: [id], status: 'DELIVERED' })
    toast.success('배송완료로 변경했습니다.')
    await load()
  } catch (e) {
    toast.error(e, '상태 변경 실패')
  } finally { markingDelivered.value = false }
}

const markingPreparing = ref(false)
const markPreparing = async () => {
  if (!order.value) return
  const ok = await confirm.ask('상품 준비중으로 변경할까요?', {
    description: '주문 상태가 결제완료 → 상품준비중으로 변경됩니다. 이후 송장을 등록할 수 있습니다.',
    confirmText: '변경'
  })
  if (!ok) return
  markingPreparing.value = true
  try {
    await orderApi.changeStatuses({ orderIds: [id], status: 'PREPARING' })
    toast.success('상품준비중으로 변경했습니다.')
    await load()
  } catch (e) {
    toast.error(e, '상태 변경 실패')
  } finally { markingPreparing.value = false }
}

const shipmentOpen = ref(false)
const carriers = ref<Carrier[]>([])
const creatingShipment = ref(false)
const shipmentForm = reactive<{
  carrierId: number | null
  trackingNumber: string
}>({
  carrierId: null,
  trackingNumber: ''
})

const shipmentCarrierIdStr = computed<string | undefined>({
  get: () => shipmentForm.carrierId != null ? String(shipmentForm.carrierId) : undefined,
  set: v => { shipmentForm.carrierId = v != null ? Number(v) : null }
})

const load = async () => {
  loading.value = true
  try {
    order.value = await orderApi.detail(id)
  } finally {
    loading.value = false
  }
}

const loadCarriers = async () => {
  try { carriers.value = await deliveryApi.carriers() } catch { carriers.value = [] }
}

const openShipment = () => {
  shipmentForm.carrierId = null
  shipmentForm.trackingNumber = ''
  shipmentOpen.value = true
}

const submitShipment = async () => {
  if (!shipmentForm.carrierId) return toast.error('택배사를 선택하세요.')
  if (!shipmentForm.trackingNumber.trim()) return toast.error('송장번호를 입력하세요.')
  // 단일배송: 주문의 모든 품목을 전체 수량으로 한 번에 등록.
  const items = (order.value?.items ?? []).map((it: OrderItem) => ({
    orderItemId: it.orderItemId,
    quantity: it.quantity ?? 1
  }))
  if (!items.length) return toast.error('배송할 상품이 없습니다.')
  const carrierName = carriers.value.find(c => c.id === shipmentForm.carrierId)?.name ?? '-'
  const ok = await confirm.ask('송장을 등록할까요?', {
    description: `택배사: ${carrierName}\n송장번호: ${shipmentForm.trackingNumber.trim()}\n\n⚠ 한 번 등록한 송장은 수정·삭제할 수 없습니다. 정확한지 다시 확인하세요.`,
    confirmText: '등록',
    tone: 'danger'
  })
  if (!ok) return
  creatingShipment.value = true
  try {
    await deliveryApi.createShipment(id, {
      carrierId: shipmentForm.carrierId,
      trackingNumber: shipmentForm.trackingNumber,
      items
    })
    toast.success('송장을 등록했습니다.')
    shipmentOpen.value = false
    await load()
  } catch (e) {
    toast.error(e, '송장 등록 실패')
  } finally { creatingShipment.value = false }
}

onMounted(() => { load(); loadCarriers() })
useHead({ title: () => `주문 ${order.value?.orderNumber ?? ''} | ZeroLabs Admin` })

const addressLine = (s: OrderShipping | undefined) =>
  [s?.postalCode, s?.address].filter(Boolean).join(' ')
</script>

<template>
  <div class="p-4 sm:p-8 max-w-5xl">
    <DetailHeader
      icon="lucide:shopping-cart"
      :title="order?.orderNumber ?? (loading ? '…' : '주문')"
      :subtitle="order ? `주문 ID · ${order.orderId}` : null"
      back-to="/orders"
      back-label="주문 목록으로"
    >
      <template #actions>
        <span
          v-if="order && isGuest"
          class="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
          title="비회원 주문"
        >
          비회원
        </span>
        <StatusBadge v-if="order" :status="order.status" />
        <Button
          v-if="canMarkPreparing"
          variant="outline"
          size="sm"
          :disabled="markingPreparing"
          @click="markPreparing"
        >
          <Icon name="lucide:package-check" size="14" class="mr-1" /> 상품 준비중으로 변경
        </Button>
        <Button v-if="canCreateShipment" variant="outline" size="sm" @click="openShipment">
          <Icon name="lucide:truck" size="14" class="mr-1" /> 송장 등록
        </Button>
        <Button
          v-if="canMarkDelivered"
          variant="outline"
          size="sm"
          :disabled="markingDelivered"
          @click="markDelivered"
        >
          <Icon name="lucide:check-circle-2" size="14" class="mr-1" /> 배송완료 처리
        </Button>
        <Button
          v-if="order && (order.status === 'SHIPPING' || order.status === 'DELIVERED')"
          variant="outline"
          size="sm"
          @click="$router.push(`/delivery?orderId=${order.orderId}`)"
        >
          <Icon name="lucide:package-search" size="14" class="mr-1" /> 배송 추적
        </Button>
        <Button variant="outline" size="sm" @click="load">
          <Icon name="lucide:refresh-cw" size="14" class="mr-1" /> 새로고침
        </Button>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <div v-else-if="order" class="space-y-6">
      <DetailSection title="주문 정보">
        <DetailField label="주문번호" :value="order.orderNumber" mono />
        <DetailField label="주문일시" :value="formatDate(order.orderedAt)" />
        <DetailField label="상태">
          <StatusBadge :status="order.status" />
        </DetailField>
        <DetailField label="상품 수" :value="order.items?.length ?? 0" />
      </DetailSection>

      <div class="grid gap-6 md:grid-cols-2">
        <DetailSection :title="isGuest ? '주문자 (비회원)' : '주문 회원'">
          <template v-if="isGuest">
            <DetailField label="구분">
              <span class="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                비회원 주문
              </span>
            </DetailField>
            <DetailField label="이름" :value="order.customer?.name ?? '비회원'" />
            <DetailField label="연락처" :value="formatPhone(order.customer?.phone)" />
            <DetailField label="이메일" :value="order.customer?.email" full />
          </template>
          <template v-else>
            <DetailField label="회원 ID" :value="order.customer?.userId" />
            <DetailField label="이름" :value="order.customer?.name" />
            <DetailField label="등급" :value="order.customer?.grade" />
            <DetailField label="연락처" :value="formatPhone(order.customer?.phone)" />
            <DetailField label="이메일" :value="order.customer?.email" full />
          </template>
        </DetailSection>

        <DetailSection title="배송지">
          <DetailField label="수령인" :value="order.shipping?.recipientName" />
          <DetailField label="연락처" :value="formatPhone(order.shipping?.recipientPhone)" />
          <DetailField label="주소" :value="addressLine(order.shipping)" full />
          <DetailField label="배송 요청" :value="order.shipping?.deliveryMessage ?? '-'" full />
        </DetailSection>
      </div>

      <DetailSection title="상품" :description="`${order.items?.length ?? 0}개 품목`">
        <div class="col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품</TableHead>
                <TableHead>옵션</TableHead>
                <TableHead class="text-right">수량</TableHead>
                <TableHead class="text-right">금액</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in order.items" :key="item.orderItemId">
                <TableCell class="max-w-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <img
                      v-if="item.imageUrl"
                      :src="item.imageUrl"
                      class="h-8 w-8 rounded border object-cover shrink-0"
                    />
                    <span class="font-medium truncate" :title="item.productName">{{ item.productName }}</span>
                  </div>
                </TableCell>
                <TableCell class="max-w-[200px] truncate" :title="item.variantName ?? ''">{{ item.variantName ?? '-' }}</TableCell>
                <TableCell class="text-right">{{ item.quantity }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(item.subtotal) }}</TableCell>
                <TableCell><StatusBadge :status="item.orderItemStatus" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DetailSection>

      <div class="grid gap-6 md:grid-cols-2">
        <DetailSection title="결제">
          <DetailField label="결제수단" :value="order.payment?.method" />
          <DetailField label="결제상태" :value="order.payment?.status" />
          <DetailField label="카드사" :value="order.payment?.cardCompany" />
          <DetailField label="카드번호" :value="order.payment?.cardNumber" />
          <DetailField label="할부" :value="order.payment?.installment ? `${order.payment.installment}개월` : '일시불'" />
          <DetailField label="결제일시" :value="formatDate(order.payment?.paidAt)" />
        </DetailSection>

        <DetailSection title="금액 요약">
          <DetailField label="상품 금액" :value="formatCurrency(order.summary?.subtotal)" />
          <DetailField label="배송비" :value="formatCurrency(order.summary?.shippingTotal)" />
          <DetailField label="할인" :value="formatCurrency(order.summary?.discountTotal)" />
          <DetailField label="총 결제금액" :value="formatCurrency(order.summary?.grandTotal)" />
        </DetailSection>
      </div>

      <DetailSection v-if="order.combinedHistory?.length || order.history?.length" title="처리 이력">
        <div class="col-span-2">
          <ul class="space-y-2">
            <li
              v-for="(h, i) in (order.combinedHistory ?? order.history ?? [])"
              :key="i"
              class="flex items-start gap-3 text-sm pb-2 border-b last:border-0"
            >
              <span class="shrink-0 text-xs text-muted-foreground font-mono">{{ formatDate(h.createdAt) }}</span>
              <span class="shrink-0"><StatusBadge :status="h.toStatus" /></span>
              <span class="text-muted-foreground flex-1">
                {{ 'note' in h ? h.note : ('reason' in h ? h.reason : '') }}
              </span>
              <span v-if="h.createdByName" class="shrink-0 text-xs text-muted-foreground">{{ h.createdByName }}</span>
            </li>
          </ul>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">주문을 찾을 수 없습니다.</div>

    <!-- 송장 등록 Dialog -->
    <Dialog v-model:open="shipmentOpen">
      <DialogContent class="max-w-md grid-cols-1">
        <div class="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive">
          <p class="font-semibold mb-0.5">⚠ 등록 후 수정·삭제 불가</p>
          <p class="text-destructive/90">
            한 번 등록한 송장은 변경할 수 없습니다. 택배사와 송장번호를 반드시 다시 확인한 후 등록하세요.
          </p>
        </div>

        <DialogHeader>
          <DialogTitle>송장 등록</DialogTitle>
          <DialogDescription>
            주문의 전체 품목 ({{ order?.items?.length ?? 0 }}개) 을 한 건의 송장으로 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2 min-w-0">
          <div>
            <Label class="mb-1.5 block text-xs">택배사 <span class="text-destructive">*</span></Label>
            <Select v-model="shipmentCarrierIdStr">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="선택…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in carriers" :key="c.id" :value="String(c.id)">{{ c.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">송장번호 <span class="text-destructive">*</span></Label>
            <Input v-model="shipmentForm.trackingNumber" class="font-mono" placeholder="송장번호 입력" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="creatingShipment" @click="shipmentOpen = false">취소</Button>
          <Button :disabled="creatingShipment" @click="submitShipment">
            <Icon name="lucide:truck" size="14" class="mr-1" /> 등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
