<script setup lang="ts">
import { formatCurrency, formatDate, formatPhone } from '~/utils/format'

definePageMeta({ layout: 'default' })

const route = useRoute()
const orderApi = useAdminOrder()
const deliveryApi = useAdminDelivery()
const toast = useToast()

const id = Number(route.params.id)
const order = ref<any>(null)
const loading = ref(true)

const shipmentOpen = ref(false)
const carriers = ref<any[]>([])
const creatingShipment = ref(false)
const shipmentForm = reactive({
  carrierId: null as number | null,
  trackingNumber: '',
  items: [] as { orderItemId: number, quantity: number, productName?: string, max?: number, selected: boolean }[]
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
  try { carriers.value = (await deliveryApi.carriers()) as any[] } catch { carriers.value = [] }
}

const openShipment = () => {
  shipmentForm.carrierId = null
  shipmentForm.trackingNumber = ''
  shipmentForm.items = (order.value?.items ?? []).map((it: any) => ({
    orderItemId: it.orderItemId ?? it.id,
    productName: [it.productName, it.variantName].filter(Boolean).join(' / '),
    quantity: it.quantity ?? 1,
    max: it.quantity ?? 1,
    selected: true
  }))
  shipmentOpen.value = true
}

const submitShipment = async () => {
  if (!shipmentForm.carrierId) return toast.error('택배사를 선택하세요.')
  if (!shipmentForm.trackingNumber.trim()) return toast.error('송장번호를 입력하세요.')
  const picked = shipmentForm.items.filter(i => i.selected && i.quantity > 0)
  if (!picked.length) return toast.error('배송 상품을 최소 1개 선택하세요.')
  creatingShipment.value = true
  try {
    await deliveryApi.createShipment(id, {
      carrierId: shipmentForm.carrierId,
      trackingNumber: shipmentForm.trackingNumber,
      items: picked.map(i => ({ orderItemId: i.orderItemId, quantity: Number(i.quantity) }))
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

const addressLine = (s: any) =>
  [s?.postalCode, s?.address, s?.addressDetail].filter(Boolean).join(' ')
</script>

<template>
  <div class="p-8 max-w-5xl">
    <DetailHeader
      :title="order?.orderNumber ?? (loading ? '…' : '주문')"
      :subtitle="order ? `주문 ID · ${order.orderId}` : null"
      back-to="/orders"
    >
      <template #actions>
        <StatusBadge v-if="order" :status="order.status" />
        <Button v-if="order" variant="outline" size="sm" @click="openShipment">
          <Icon name="lucide:truck" size="14" class="mr-1" /> 송장 등록
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
        <DetailSection title="주문 회원">
          <DetailField label="회원 ID" :value="order.customer?.userId" />
          <DetailField label="이름" :value="order.customer?.name" />
          <DetailField label="등급" :value="order.customer?.grade" />
          <DetailField label="연락처" :value="formatPhone(order.customer?.phone)" />
          <DetailField label="이메일" :value="order.customer?.email" full />
        </DetailSection>

        <DetailSection title="배송지">
          <DetailField label="수령인" :value="order.shipping?.recipientName" />
          <DetailField label="연락처" :value="formatPhone(order.shipping?.recipientPhone)" />
          <DetailField label="주소" :value="addressLine(order.shipping)" full />
          <DetailField label="배송 요청" :value="order.shipping?.requestMessage ?? '-'" full />
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
              <TableRow v-for="item in order.items" :key="item.orderItemId ?? item.id">
                <TableCell class="font-medium">{{ item.productName }}</TableCell>
                <TableCell>{{ item.variantName ?? '-' }}</TableCell>
                <TableCell class="text-right">{{ item.quantity }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(item.totalPrice ?? item.price) }}</TableCell>
                <TableCell><StatusBadge :status="item.status" /></TableCell>
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
          <DetailField label="상품 금액" :value="formatCurrency(order.summary?.itemsTotal)" />
          <DetailField label="배송비" :value="formatCurrency(order.summary?.shippingFee)" />
          <DetailField label="쿠폰 할인" :value="formatCurrency(order.summary?.couponDiscount)" />
          <DetailField label="포인트 사용" :value="formatCurrency(order.summary?.pointUsed)" />
          <DetailField label="총 결제금액" :value="formatCurrency(order.summary?.grandTotal ?? order.grandTotal)" />
        </DetailSection>
      </div>

      <DetailSection v-if="order.combinedHistory?.length || order.history?.length" title="처리 이력">
        <div class="col-span-2">
          <ul class="space-y-2">
            <li
              v-for="(h, i) in (order.combinedHistory ?? order.history)"
              :key="i"
              class="flex items-start gap-3 text-sm pb-2 border-b last:border-0"
            >
              <span class="shrink-0 text-xs text-muted-foreground font-mono">{{ formatDate(h.createdAt ?? h.at) }}</span>
              <span class="shrink-0"><StatusBadge :status="h.status ?? h.type" /></span>
              <span class="text-muted-foreground">{{ h.message ?? h.description ?? h.note }}</span>
            </li>
          </ul>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">주문을 찾을 수 없습니다.</div>

    <!-- 송장 등록 Dialog -->
    <Dialog v-model:open="shipmentOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>송장 등록</DialogTitle>
          <DialogDescription>
            분할 배송 시 상품별 수량을 조정해 부분 송장을 등록할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div class="grid gap-3 grid-cols-2">
            <div>
              <Label class="mb-1.5 block text-xs">택배사 <span class="text-destructive">*</span></Label>
              <select v-model="shipmentForm.carrierId" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option :value="null">선택…</option>
                <option v-for="c in carriers" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <Label class="mb-1.5 block text-xs">송장번호 <span class="text-destructive">*</span></Label>
              <Input v-model="shipmentForm.trackingNumber" class="font-mono" placeholder="송장번호 입력" />
            </div>
          </div>

          <div>
            <Label class="mb-2 block text-xs">배송 상품</Label>
            <div class="border rounded-md divide-y max-h-64 overflow-y-auto">
              <label
                v-for="item in shipmentForm.items"
                :key="item.orderItemId"
                class="flex items-center gap-3 p-2.5 hover:bg-muted/30 cursor-pointer text-sm"
              >
                <input v-model="item.selected" type="checkbox" class="h-4 w-4" />
                <span class="flex-1 truncate">{{ item.productName }}</span>
                <Input
                  v-model="item.quantity"
                  type="number"
                  :min="1"
                  :max="item.max"
                  class="h-8 w-20 text-right"
                  :disabled="!item.selected"
                  @click.stop
                />
                <span class="text-xs text-muted-foreground w-12 text-right">/ {{ item.max }}</span>
              </label>
            </div>
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
