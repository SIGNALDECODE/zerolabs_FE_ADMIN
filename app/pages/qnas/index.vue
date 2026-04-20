<script setup lang="ts">
import { formatDate } from '~/utils/format'

useHead({ title: 'Q&A 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const qnaApi = useAdminQna()
const router = useRouter()

const qnas = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const statuses = ref<any[]>([])

const filters = reactive({
  status: '',
  keyword: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'id', label: 'ID', width: '64px' },
  { key: 'productId', label: '상품', width: '64px' },
  { key: 'title', label: '제목' },
  { key: 'question', label: '질문' },
  { key: 'isSecret', label: '비밀', width: '64px', align: 'center' as const },
  { key: 'answered', label: '답변 상태' },
  { key: 'createdAt', label: '작성일' }
]

const load = async () => {
  loading.value = true
  try {
    const data: any = await qnaApi.list({
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    qnas.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
  } finally {
    loading.value = false
  }
}

const loadStatuses = async () => {
  try { statuses.value = await qnaApi.statuses() as any[] } catch { statuses.value = [] }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

onMounted(() => {
  load()
  loadStatuses()
})
</script>

<template>
  <div class="p-8">
    <PageHeader title="Q&A 관리" :description="`총 ${total.toLocaleString()}건 · 상품 문의`" />

    <FilterBar @search="search">
      <select v-model="filters.status" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체</option>
        <option v-for="s in statuses" :key="s.code ?? s" :value="s.code ?? s">
          {{ s.description ?? s.label ?? s }}
        </option>
        <option v-if="!statuses.length" value="ANSWERED">답변완료</option>
        <option v-if="!statuses.length" value="WAITING">미답변</option>
      </select>
      <Input v-model="filters.keyword" placeholder="제목 / 내용 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="qnas"
      :loading="loading"
      empty-message="Q&A 가 없습니다."
      clickable
      @row-click="(row: any) => router.push(`/qnas/${row.id}`)"
    >
      <template #cell-id="{ row }">
        <span class="text-muted-foreground text-xs">{{ row.id }}</span>
      </template>
      <template #cell-productId="{ row }">
        <span class="text-muted-foreground text-xs">#{{ row.productId }}</span>
      </template>
      <template #cell-title="{ row }">
        <span class="font-medium max-w-xs truncate block">{{ row.title }}</span>
      </template>
      <template #cell-question="{ row }">
        <span class="text-muted-foreground text-sm max-w-md truncate block">{{ row.question }}</span>
      </template>
      <template #cell-isSecret="{ row }">
        <Icon v-if="row.isSecret" name="lucide:lock" size="14" class="text-amber-600 inline" />
      </template>
      <template #cell-answered="{ row }">
        <StatusBadge
          :label="row.isAnswered ? '답변완료' : '미답변'"
          :status="row.isAnswered ? 'ANSWERED' : 'WAITING'"
        />
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.createdAt) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
