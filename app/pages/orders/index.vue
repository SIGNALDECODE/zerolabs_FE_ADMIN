<script setup lang="ts">
import { formatCurrency, formatDate } from '~/utils/format'

useHead({ title: '주문 관리 | ZeroLabs Admin' })

const orderApi = useAdminOrder()
const deliveryApi = useAdminDelivery()
const router = useRouter()
const toast = useToast()

const orders = ref<any[]>([])
const totalElements = ref(0)
const loading = ref(false)
const selectedIds = ref<number[]>([])
const carriers = ref<any[]>([])
const changing = ref(false)

const filters = reactive({
  status: '' as string,
  keyword: '' as string,
  page: 1,
  size: 20
})

const bulkForm = reactive({
  status: '',
  reason: '',
  carrierId: null as number | null,
  trackingNumber: ''
})

const columns = [
  { key: 'select', label: '', width: '40px' },
  { key: 'orderNumber', label: '주문번호' },
  { key: 'recipientName', label: '수령인' },
  { key: 'status', label: '상태' },
  { key: 'grandTotal', label: '금액', align: 'right' as const },
  { key: 'createdAt', label: '주문일' }
]

const loadOrders = async () => {
  loading.value = true
  try {
    const data = await orderApi.list({
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    orders.value = data?.content || []
    totalElements.value = data?.totalElements || 0
    selectedIds.value = []
  } finally {
    loading.value = false
  }
}

const loadCarriers = async () => {
  try { carriers.value = (await deliveryApi.carriers()) as any[] } catch { carriers.value = [] }
}

const handleSearch = () => {
  filters.page = 1
  loadOrders()
}

watchDebounced(() => filters.keyword, handleSearch, { debounce: 400 })

const goPage = (p: number) => { filters.page = p; loadOrders() }

const toggleSelect = (id: number) => {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}

const toggleAll = () => {
  if (selectedIds.value.length === orders.value.length) selectedIds.value = []
  else selectedIds.value = orders.value.map(o => o.id ?? o.orderId)
}

const resetBulkForm = () => {
  bulkForm.status = ''
  bulkForm.reason = ''
  bulkForm.carrierId = null
  bulkForm.trackingNumber = ''
}

const applyBulkStatus = async () => {
  if (!selectedIds.value.length) return
  if (!bulkForm.status) return toast.error('변경할 상태를 선택하세요.')
  if (bulkForm.status === 'SHIPPING') {
    if (!bulkForm.carrierId) return toast.error('택배사를 선택하세요.')
    if (!bulkForm.trackingNumber.trim()) return toast.error('송장번호를 입력하세요.')
    if (selectedIds.value.length > 1) {
      return toast.error('송장번호 입력은 1건씩 처리해야 합니다.')
    }
  }
  changing.value = true
  try {
    await orderApi.changeStatuses({
      orderIds: selectedIds.value,
      status: bulkForm.status as any,
      reason: bulkForm.reason || undefined,
      carrierId: bulkForm.carrierId ?? undefined,
      trackingNumber: bulkForm.trackingNumber || undefined
    })
    toast.success(`${selectedIds.value.length}건의 상태를 변경했습니다.`)
    resetBulkForm()
    await loadOrders()
  } catch (e) {
    toast.error(e, '상태 변경 실패')
  } finally { changing.value = false }
}

onMounted(() => { loadOrders(); loadCarriers() })
</script>

<template>
  <div class="p-8">
    <PageHeader title="주문 관리" :description="`총 ${totalElements.toLocaleString()}건`" />

    <FilterBar @search="handleSearch">
      <select v-model="filters.status" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 상태</option>
        <option value="PENDING">입금대기</option>
        <option value="PAID">결제완료</option>
        <option value="PREPARING">배송준비</option>
        <option value="SHIPPING">배송중</option>
        <option value="DELIVERED">배송완료</option>
        <option value="COMPLETED">구매확정</option>
        <option value="CANCELLED">취소</option>
      </select>
      <Input v-model="filters.keyword" placeholder="주문번호 / 수령인 검색" class="max-w-xs" @keyup.enter="handleSearch" />
    </FilterBar>

    <!-- 일괄 상태 변경 패널 -->
    <Card v-if="selectedIds.length" class="mb-4 border-sky-200 bg-sky-50/40">
      <CardContent class="pt-6 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-sky-900">
            <Icon name="lucide:check-circle" size="14" class="inline mr-1" />
            {{ selectedIds.length }}건 선택됨
          </div>
          <Button variant="ghost" size="sm" @click="selectedIds = []">
            <Icon name="lucide:x" size="14" class="mr-1" /> 선택 해제
          </Button>
        </div>

        <div class="flex flex-wrap items-end gap-2">
          <div>
            <Label class="mb-1.5 block text-xs">변경할 상태</Label>
            <select v-model="bulkForm.status" class="h-10 w-40 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">선택…</option>
              <option value="PAID">결제완료</option>
              <option value="PREPARING">배송준비</option>
              <option value="SHIPPING">배송중</option>
              <option value="DELIVERED">배송완료</option>
              <option value="COMPLETED">구매확정</option>
              <option value="CANCELLED">주문취소</option>
            </select>
          </div>

          <template v-if="bulkForm.status === 'SHIPPING'">
            <div>
              <Label class="mb-1.5 block text-xs">택배사 <span class="text-destructive">*</span></Label>
              <select v-model="bulkForm.carrierId" class="h-10 w-40 rounded-md border border-input bg-background px-3 text-sm">
                <option :value="null">선택…</option>
                <option v-for="c in carriers" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <Label class="mb-1.5 block text-xs">송장번호 <span class="text-destructive">*</span></Label>
              <Input v-model="bulkForm.trackingNumber" class="w-52 font-mono" placeholder="송장번호" />
            </div>
          </template>

          <div class="flex-1 min-w-60">
            <Label class="mb-1.5 block text-xs">변경 사유 (선택)</Label>
            <Input v-model="bulkForm.reason" placeholder="배송 시작, 고객 취소 요청 …" />
          </div>

          <Button :disabled="changing" @click="applyBulkStatus">
            <Icon name="lucide:arrow-right-circle" size="14" class="mr-1" /> 적용
          </Button>
        </div>

        <p v-if="bulkForm.status === 'SHIPPING' && selectedIds.length > 1" class="text-xs text-amber-700">
          <Icon name="lucide:triangle-alert" size="12" class="inline mr-1" />
          배송중 상태 변경은 송장번호가 개별이므로 1건씩 처리해야 합니다.
        </p>
      </CardContent>
    </Card>

    <DataTable
      :columns="columns"
      :rows="orders"
      :loading="loading"
      empty-message="주문이 없습니다."
      clickable
      @row-click="(row: any) => router.push(`/orders/${row.id ?? row.orderId}`)"
    >
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :checked="selectedIds.includes(row.id ?? row.orderId)"
          class="h-4 w-4"
          @click.stop
          @change="toggleSelect(row.id ?? row.orderId)"
        />
      </template>
      <template #cell-orderNumber="{ row }">
        <span class="font-mono text-xs">{{ row.orderNumber }}</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-grandTotal="{ row }">
        {{ formatCurrency(row.grandTotal) }}
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.createdAt) }}</span>
      </template>
    </DataTable>

    <div v-if="orders.length" class="mt-2 flex items-center">
      <label class="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          class="h-3.5 w-3.5"
          :checked="orders.length > 0 && selectedIds.length === orders.length"
          @change="toggleAll"
        />
        현재 페이지 전체 선택
      </label>
    </div>

    <Pagination :page="filters.page" :size="filters.size" :total="totalElements" @change="goPage" />
  </div>
</template>
