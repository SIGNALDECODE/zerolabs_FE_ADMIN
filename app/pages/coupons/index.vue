<script setup lang="ts">
import { formatCurrency, formatDate, formatNumber } from '~/utils/format'
import type { CouponListItem } from '~/types/marketing'

useHead({ title: '쿠폰 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const couponApi = useAdminCoupon()
const router = useRouter()

const ALL = 'ALL'

const coupons = ref<CouponListItem[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  status: ALL as string,
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
    const data = await couponApi.list({
      status: filters.status === ALL ? undefined : filters.status,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    coupons.value = data?.content ?? []
    total.value = data?.total_elements ?? 0
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

const discountText = (row: CouponListItem) => {
  if (!row.discountValue) return '-'
  return row.discountType === 'RATE'
    ? `${row.discountValue}%`
    : formatCurrency(row.discountValue)
}

const issuedRate = (row: CouponListItem) => {
  if (!row.totalQuantity) return '-'
  const ratio = ((row.issuedQuantity ?? 0) / row.totalQuantity * 100).toFixed(1)
  return `${formatNumber(row.issuedQuantity)} / ${formatNumber(row.totalQuantity)} (${ratio}%)`
}

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-8">
    <PageHeader icon="lucide:ticket" title="쿠폰 관리" :description="`총 ${total.toLocaleString()}개`">
      <template #actions>
        <Button @click="router.push('/coupons/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 쿠폰 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="search">
      <Select v-model="filters.status">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 상태</SelectItem>
          <SelectItem value="REGISTERED">등록</SelectItem>
          <SelectItem value="ACTIVE">발급중</SelectItem>
          <SelectItem value="STOPPED">발급중지</SelectItem>
          <SelectItem value="ENDED">종료</SelectItem>
          <SelectItem value="RECALLED">회수완료</SelectItem>
        </SelectContent>
      </Select>
      <Input v-model="filters.keyword" placeholder="쿠폰명 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="coupons"
      :loading="loading"
      empty-message="쿠폰이 없습니다."
      clickable
      @row-click="(row: CouponListItem) => router.push(`/coupons/${row.id}`)"
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
