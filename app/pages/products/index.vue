<script setup lang="ts">
import { formatCurrency, formatNumber } from '~/utils/format'
import type { ProductListItem } from '~/types/product'

useHead({ title: '상품 관리 | ZeroLabs Admin' })

const productApi = useAdminProduct()

const ALL = 'ALL'

const products = ref<ProductListItem[]>([])
const totalElements = ref(0)
const loading = ref(false)

const filters = reactive({
  status: ALL as string,
  keyword: '',
  page: 1,
  size: 30
})

const displayPrice = (p: ProductListItem['price']): number | undefined => {
  if (p == null) return undefined
  if (typeof p === 'number') return p
  return p.salePrice ?? p.finalPrice
}

const columns = [
  { key: 'thumbnailUrl', label: '이미지', width: '80px' },
  { key: 'name', label: '상품명' },
  { key: 'price', label: '가격', align: 'right' as const },
  { key: 'stock', label: '재고', align: 'right' as const },
  { key: 'status', label: '상태' }
]

const load = async () => {
  loading.value = true
  try {
    const data = await productApi.list({
      status: filters.status === ALL ? undefined : filters.status,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    products.value = data?.content || []
    totalElements.value = data?.totalElements || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  filters.page = 1
  load()
}

watchDebounced(() => filters.keyword, handleSearch, { debounce: 400 })

onMounted(load)
</script>

<template>
  <div class="p-8">
    <PageHeader title="상품 관리" :description="`총 ${totalElements.toLocaleString()}개`">
      <template #actions>
        <Button @click="navigateTo('/products/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 상품 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="handleSearch">
      <Select v-model="filters.status">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체</SelectItem>
          <SelectItem value="ON_SALE">판매중</SelectItem>
          <SelectItem value="SOLD_OUT">품절</SelectItem>
          <SelectItem value="DISCONTINUED">단종</SelectItem>
        </SelectContent>
      </Select>
      <Input v-model="filters.keyword" placeholder="상품명 / SKU 검색" class="max-w-xs" @keyup.enter="handleSearch" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="products"
      :loading="loading"
      empty-message="상품이 없습니다."
      clickable
      @row-click="(row: ProductListItem) => navigateTo(`/products/${row.id}`)"
    >
      <template #cell-thumbnailUrl="{ row }">
        <img v-if="row.thumbnailUrl" :src="row.thumbnailUrl" class="h-10 w-10 rounded object-cover" alt="">
        <div v-else class="h-10 w-10 rounded bg-muted" />
      </template>
      <template #cell-name="{ row }">
        <span class="font-medium">{{ row.name }}</span>
      </template>
      <template #cell-price="{ row }">
        {{ formatCurrency(displayPrice(row.price)) }}
      </template>
      <template #cell-stock="{ row }">
        {{ formatNumber(row.stock) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
    </DataTable>
  </div>
</template>
