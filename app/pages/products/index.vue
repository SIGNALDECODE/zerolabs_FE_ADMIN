<script setup lang="ts">
import { formatCurrency, formatNumber } from '~/utils/format'

useHead({ title: '상품 관리 | ZeroLabs Admin' })

const productApi = useAdminProduct()

const products = ref<any[]>([])
const totalElements = ref(0)
const loading = ref(false)

const filters = reactive({
  status: '',
  keyword: '',
  page: 1,
  size: 30
})

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
      status: filters.status || undefined,
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
      <select v-model="filters.status" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체</option>
        <option value="ACTIVE">판매중</option>
        <option value="ON_SALE">판매중</option>
        <option value="INACTIVE">판매중지</option>
        <option value="DRAFT">임시저장</option>
        <option value="DISCONTINUED">단종</option>
        <option value="SOLD_OUT">품절</option>
      </select>
      <Input v-model="filters.keyword" placeholder="상품명 / SKU 검색" class="max-w-xs" @keyup.enter="handleSearch" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="products"
      :loading="loading"
      empty-message="상품이 없습니다."
      clickable
      @row-click="(row: any) => navigateTo(`/products/${row.id}`)"
    >
      <template #cell-thumbnailUrl="{ row }">
        <img v-if="row.thumbnailUrl" :src="row.thumbnailUrl" class="h-10 w-10 rounded object-cover" alt="">
        <div v-else class="h-10 w-10 rounded bg-muted" />
      </template>
      <template #cell-name="{ row }">
        <span class="font-medium">{{ row.name }}</span>
      </template>
      <template #cell-price="{ row }">
        {{ formatCurrency(row.price?.salePrice ?? row.price?.finalPrice ?? row.price) }}
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
