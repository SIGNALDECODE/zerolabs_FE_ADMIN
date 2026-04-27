<script setup lang="ts">
import { formatCurrency, formatDate } from '~/utils/format'
import type { Promotion } from '~/types/marketing'

useHead({ title: '프로모션 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const promotionApi = useAdminPromotion()
const router = useRouter()

const promotions = ref<Promotion[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  keyword: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'name', label: '할인명' },
  { key: 'discount', label: '할인', align: 'right' as const },
  { key: 'applicableTarget', label: '적용 대상' },
  { key: 'period', label: '기간' },
  { key: 'status', label: '상태' }
]

const load = async () => {
  loading.value = true
  try {
    const data = await promotionApi.list({
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    promotions.value = data?.content ?? []
    total.value = data?.total_elements ?? 0
  } finally {
    loading.value = false
  }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

const discountText = (p: Promotion) =>
  p.discountType === 'RATE'
    ? `${p.discountValue}%`
    : formatCurrency(p.discountValue)

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-8">
    <PageHeader icon="lucide:percent" title="프로모션 관리" :description="`총 ${total.toLocaleString()}개`">
      <template #actions>
        <Button @click="router.push('/promotions/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 프로모션 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="search">
      <Input v-model="filters.keyword" placeholder="프로모션명 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="promotions"
      :loading="loading"
      empty-message="프로모션이 없습니다."
      clickable
      @row-click="(row: Promotion) => router.push(`/promotions/${row.id}`)"
    >
      <template #cell-name="{ row }">
        <span class="font-medium">{{ row.name }}</span>
      </template>
      <template #cell-discount="{ row }">
        {{ discountText(row) }}
      </template>
      <template #cell-applicableTarget="{ row }">
        <span class="text-muted-foreground text-sm max-w-xs truncate block">{{ row.applicableTarget ?? '-' }}</span>
      </template>
      <template #cell-period="{ row }">
        <span class="text-muted-foreground text-xs">
          {{ formatDate(row.startedAt) }}<br>~ {{ formatDate(row.endedAt) }}
        </span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
