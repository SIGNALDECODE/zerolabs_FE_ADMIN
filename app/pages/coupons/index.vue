<script setup lang="ts">
import { formatCurrency, formatDate, formatNumber } from '~/utils/format'

useHead({ title: '쿠폰 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const couponApi = useAdminCoupon()
const router = useRouter()

const coupons = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  status: '',
  keyword: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'name', label: '쿠폰명' },
  { key: 'couponType', label: '타입' },
  { key: 'discount', label: '할인', align: 'right' as const },
  { key: 'issued', label: '발급 수량' },
  { key: 'isVisible', label: '노출', align: 'center' as const },
  { key: 'status', label: '상태' },
  { key: 'createdAt', label: '등록일' }
]

const load = async () => {
  loading.value = true
  try {
    const data: any = await couponApi.list({
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    coupons.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
  } finally {
    loading.value = false
  }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

const statusLabels: Record<string, string> = {
  REGISTERED: '등록', ACTIVE: '발급중', STOPPED: '발급중지',
  ENDED: '종료', RECALLED: '회수완료'
}

const typeLabels: Record<string, string> = {
  PRODUCT_DISCOUNT: '상품할인', FREE_SHIPPING: '무료배송'
}

const discountText = (row: any) => {
  if (!row.discountValue) return '-'
  return row.discountType === 'RATE'
    ? `${row.discountValue}%`
    : formatCurrency(row.discountValue)
}

const issuedRate = (row: any) => {
  if (!row.totalQuantity) return '-'
  const ratio = ((row.issuedQuantity ?? 0) / row.totalQuantity * 100).toFixed(1)
  return `${formatNumber(row.issuedQuantity)} / ${formatNumber(row.totalQuantity)} (${ratio}%)`
}

onMounted(load)
</script>

<template>
  <div class="p-8">
    <PageHeader title="쿠폰 관리" :description="`총 ${total.toLocaleString()}개`">
      <template #actions>
        <Button @click="router.push('/coupons/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 쿠폰 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="search">
      <select v-model="filters.status" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 상태</option>
        <option value="REGISTERED">등록</option>
        <option value="ACTIVE">발급중</option>
        <option value="STOPPED">발급중지</option>
        <option value="ENDED">종료</option>
        <option value="RECALLED">회수완료</option>
      </select>
      <Input v-model="filters.keyword" placeholder="쿠폰명 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="coupons"
      :loading="loading"
      empty-message="쿠폰이 없습니다."
      clickable
      @row-click="(row: any) => router.push(`/coupons/${row.id}`)"
    >
      <template #cell-name="{ row }">
        <span class="font-medium">{{ row.name }}</span>
      </template>
      <template #cell-couponType="{ row }">
        <span class="text-muted-foreground text-sm">{{ typeLabels[row.couponType] ?? row.couponType }}</span>
      </template>
      <template #cell-discount="{ row }">
        {{ discountText(row) }}
      </template>
      <template #cell-issued="{ row }">
        <span class="text-muted-foreground text-sm">{{ issuedRate(row) }}</span>
      </template>
      <template #cell-isVisible="{ row }">
        <Icon v-if="row.isVisible" name="lucide:eye" size="14" class="text-emerald-600 inline" />
        <Icon v-else name="lucide:eye-off" size="14" class="text-muted-foreground inline" />
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="statusLabels[row.status] ?? row.status" :status="row.status" />
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.createdAt) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
