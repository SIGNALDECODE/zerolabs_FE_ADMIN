<script setup lang="ts">
import { formatCurrency, formatDate } from '~/utils/format'
import type { OrderDetail, OrderItem } from '~/types/order'
import type { RefundRecord } from '~/types/claim'
import type { ClaimType, ClaimReasonType } from '~/types/common'

useHead({ title: '환불 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const refundApi = useAdminRefund()
const orderApi = useAdminOrder()
const router = useRouter()
const toast = useToast()

const orderIdInput = ref('')
const refunds = ref<RefundRecord[]>([])
const order = ref<OrderDetail | null>(null)
const loading = ref(false)
const searchedOrderId = ref<number | null>(null)

const processOpen = ref(false)
const processing = ref(false)
const processForm = reactive<{
  claimType: ClaimType
  reasonType: ClaimReasonType
  reason: string
  amount: string | number
  restoreStock: boolean
  items: { orderItemId: number, quantity: number, max: number, productName?: string, selected: boolean }[]
}>({
  claimType: 'CANCEL',
  reasonType: 'CHANGE_OF_MIND',
  reason: '',
  amount: '',
  restoreStock: true,
  items: []
})

const search = async () => {
  const n = Number(orderIdInput.value)
  if (!n || Number.isNaN(n)) {
    refunds.value = []
    order.value = null
    searchedOrderId.value = null
    return
  }
  loading.value = true
  try {
    const [refundRes, orderRes] = await Promise.all([
      refundApi.listByOrder(n).catch(() => null),
      orderApi.detail(n).catch(() => null)
    ])
    refunds.value = Array.isArray(refundRes) ? refundRes : []
    order.value = orderRes
    searchedOrderId.value = n
  } finally {
    loading.value = false
  }
}

const openProcess = () => {
  if (!order.value) return toast.error('주문 정보가 없습니다.')
  processForm.claimType = 'CANCEL'
  processForm.reasonType = 'CHANGE_OF_MIND'
  processForm.reason = ''
  processForm.amount = ''
  processForm.restoreStock = true
  processForm.items = (order.value?.items ?? []).map((it: OrderItem) => ({
    orderItemId: it.orderItemId,
    productName: [it.productName, it.variantName].filter(Boolean).join(' / '),
    quantity: it.quantity ?? 1,
    max: it.quantity ?? 1,
    selected: false
  }))
  processOpen.value = true
}

const submitProcess = async () => {
  if (!processForm.reason.trim()) return toast.error('환불 사유는 필수입니다.')
  const picked = processForm.items.filter(i => i.selected && i.quantity > 0)
  if (!picked.length) return toast.error('환불 대상 상품을 1개 이상 선택하세요.')
  processing.value = true
  try {
    await refundApi.process({
      orderId: searchedOrderId.value,
      claimType: processForm.claimType,
      reasonType: processForm.reasonType,
      claimItems: picked.map(i => ({ orderItemId: i.orderItemId, quantity: Number(i.quantity) })),
      reason: processForm.reason,
      amount: processForm.amount !== '' ? Number(processForm.amount) : undefined,
      restoreStock: processForm.restoreStock
    })
    toast.success('환불을 처리했습니다.')
    processOpen.value = false
    await search()
  } catch (e) {
    toast.error(e, '환불 처리 실패')
  } finally { processing.value = false }
}

const statusLabels: Record<string, string> = {
  PENDING: '대기', COMPLETED: '완료', FAILED: '실패'
}
</script>

<template>
  <div class="p-8">
    <PageHeader
      title="환불 관리"
      description="주문 단위 환불 이력 조회 및 단독 환불 처리. 클레임 연동 환불은 클레임 화면에서 수행하세요."
    />

    <FilterBar @search="search">
      <label class="text-sm text-muted-foreground whitespace-nowrap">주문 ID</label>
      <Input
        v-model="orderIdInput"
        type="number"
        placeholder="조회할 주문 ID를 입력"
        class="max-w-xs"
        @keyup.enter="search"
      />
      <template #actions>
        <Button @click="search">
          <Icon name="lucide:search" size="14" class="mr-1" /> 조회
        </Button>
      </template>
    </FilterBar>

    <Card v-if="searchedOrderId !== null">
      <CardHeader class="pb-3">
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="text-base">
              주문 #{{ searchedOrderId }}
              <span class="text-muted-foreground text-sm font-normal ml-2">· 환불 {{ refunds.length }}건</span>
            </CardTitle>
            <CardDescription v-if="order">
              {{ order.orderNumber }} · 총 {{ formatCurrency(order.summary?.grandTotal) }}
            </CardDescription>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="router.push(`/orders/${searchedOrderId}`)">
              <Icon name="lucide:external-link" size="14" class="mr-1" /> 주문 상세
            </Button>
            <Button
              v-if="order"
              size="sm"
              @click="openProcess"
            >
              <Icon name="lucide:banknote" size="14" class="mr-1" /> 단독 환불 처리
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>환불번호</TableHead>
              <TableHead>결제번호</TableHead>
              <TableHead class="text-right">금액</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>PG거래번호</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>요청일</TableHead>
              <TableHead>완료일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell colspan="8" class="text-center text-muted-foreground py-10">불러오는 중…</TableCell>
            </TableRow>
            <TableRow v-else-if="!refunds.length">
              <TableCell colspan="8" class="text-center text-muted-foreground py-10">
                해당 주문의 환불 이력이 없습니다.
              </TableCell>
            </TableRow>
            <TableRow v-for="r in refunds" :key="r.id">
              <TableCell class="font-mono text-xs">{{ r.refundNumber }}</TableCell>
              <TableCell class="font-mono text-xs">{{ r.paymentNumber }}</TableCell>
              <TableCell class="text-right font-medium">{{ formatCurrency(r.amount) }}</TableCell>
              <TableCell class="max-w-xs truncate text-muted-foreground">{{ r.reason }}</TableCell>
              <TableCell class="font-mono text-xs text-muted-foreground">{{ r.pgTid ?? '-' }}</TableCell>
              <TableCell><StatusBadge :label="statusLabels[r.status] ?? r.status" :status="r.status" /></TableCell>
              <TableCell class="text-muted-foreground text-xs">{{ formatDate(r.createdAt) }}</TableCell>
              <TableCell class="text-muted-foreground text-xs">{{ formatDate(r.completedAt) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Card v-else>
      <CardContent class="py-12 text-center text-muted-foreground text-sm">
        <Icon name="lucide:search" size="24" class="mx-auto mb-2 opacity-50" />
        조회할 주문 ID를 입력하고 검색을 눌러주세요.
      </CardContent>
    </Card>

    <!-- 단독 환불 Dialog -->
    <Dialog v-model:open="processOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>단독 환불 처리</DialogTitle>
          <DialogDescription>
            클레임 없이 관리자가 직접 환불을 생성합니다. 환불 금액 미입력 시 선택 상품 합계로 자동 계산됩니다.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="mb-1.5 block text-xs">클레임 유형 <span class="text-destructive">*</span></Label>
              <Select v-model="processForm.claimType">
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CANCEL">취소</SelectItem>
                  <SelectItem value="RETURN">반품</SelectItem>
                  <SelectItem value="EXCHANGE">교환</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label class="mb-1.5 block text-xs">사유 유형 <span class="text-destructive">*</span></Label>
              <Select v-model="processForm.reasonType">
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHANGE_OF_MIND">단순 변심</SelectItem>
                  <SelectItem value="DEFECTIVE">상품 불량</SelectItem>
                  <SelectItem value="WRONG_DELIVERY">오배송</SelectItem>
                  <SelectItem value="DELAYED_DELIVERY">배송 지연</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">품절</SelectItem>
                  <SelectItem value="OTHER">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label class="mb-2 block text-xs">환불 대상 상품 <span class="text-destructive">*</span></Label>
            <div class="border rounded-md divide-y max-h-56 overflow-y-auto">
              <label
                v-for="item in processForm.items"
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
                <span class="text-xs text-muted-foreground w-10 text-right">/ {{ item.max }}</span>
              </label>
              <div v-if="!processForm.items.length" class="p-4 text-center text-sm text-muted-foreground">
                주문 상품이 없습니다.
              </div>
            </div>
          </div>

          <div>
            <Label class="mb-1.5 block text-xs">환불 사유 <span class="text-destructive">*</span></Label>
            <Textarea v-model="processForm.reason" rows="3" placeholder="고객 요청, 배송 지연 등 구체적 사유" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="mb-1.5 block text-xs">환불 금액 (선택)</Label>
              <Input v-model="processForm.amount" type="number" step="100" placeholder="미입력 시 자동 계산" />
            </div>
            <div class="flex items-end pb-1">
              <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="processForm.restoreStock" type="checkbox" class="h-4 w-4" />
                재고 복구
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="processing" @click="processOpen = false">취소</Button>
          <Button :disabled="processing" @click="submitProcess">
            <Icon name="lucide:banknote" size="14" class="mr-1" /> 환불 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
