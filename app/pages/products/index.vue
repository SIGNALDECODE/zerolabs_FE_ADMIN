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

const columns = [
  { key: 'thumbnailUrl', label: '이미지', width: '72px' },
  { key: 'name', label: '상품명' },
  { key: 'categoryNames', label: '카테고리', width: '160px' },
  { key: 'price', label: '가격', align: 'right' as const, width: '160px' },
  { key: 'stockQuantity', label: '재고', align: 'right' as const, width: '80px' },
  { key: 'status', label: '상태', width: '90px' }
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

const goPage = (p: number) => { filters.page = p; load() }

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
      <Input v-model="filters.keyword" placeholder="상품명 검색" class="max-w-xs" @keyup.enter="handleSearch" />
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
        <img v-if="row.thumbnailUrl" :src="row.thumbnailUrl" class="h-10 w-10 rounded object-cover border" alt="" />
        <div v-else class="h-10 w-10 rounded bg-muted grid place-items-center text-muted-foreground">
          <Icon name="lucide:image-off" size="14" />
        </div>
      </template>
      <template #cell-name="{ row }">
        <div class="min-w-0">
          <div class="font-medium truncate">{{ row.name }}</div>
          <div v-if="row.tags?.length" class="flex flex-wrap gap-0.5 mt-0.5">
            <span
              v-for="tag in row.tags.slice(0, 3)"
              :key="tag"
              class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {{ tag }}
            </span>
            <span v-if="row.tags.length > 3" class="text-[10px] text-muted-foreground">+{{ row.tags.length - 3 }}</span>
          </div>
          <div v-if="row.optionCount > 0" class="text-[10px] text-muted-foreground mt-0.5">
            옵션 {{ row.optionCount }}개
          </div>
        </div>
      </template>
      <template #cell-categoryNames="{ row }">
        <span class="text-xs text-muted-foreground">
          {{ row.categoryNames?.length ? row.categoryNames.join(', ') : '-' }}
        </span>
      </template>
      <template #cell-price="{ row }">
        <div class="text-right">
          <div class="font-medium">{{ formatCurrency(row.salePrice) }}</div>
          <div v-if="row.discountRate" class="text-xs text-destructive">
            {{ row.discountRate }}
            <span class="text-muted-foreground ml-1 line-through font-normal">{{ formatCurrency(row.regularPrice) }}</span>
          </div>
        </div>
      </template>
      <template #cell-stockQuantity="{ row }">
        <span :class="row.stockQuantity === 0 ? 'text-destructive' : ''">
          {{ formatNumber(row.stockQuantity) }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="totalElements" @change="goPage" />
  </div>
</template>
