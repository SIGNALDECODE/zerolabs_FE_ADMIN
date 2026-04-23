<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { Qna } from '~/types/content'

useHead({ title: 'Q&A 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const qnaApi = useAdminQna()
const router = useRouter()

const ALL = 'ALL'

type QnaStatusOption = { code: string, description: string } | string

const qnas = ref<Qna[]>([])
const total = ref(0)
const loading = ref(false)
const statuses = ref<QnaStatusOption[]>([])

const filters = reactive({
  status: ALL as string,
  keyword: '',
  page: 1,
  size: 30
})

const statusCode = (s: QnaStatusOption): string => typeof s === 'string' ? s : s.code
const statusLabel = (s: QnaStatusOption): string => typeof s === 'string' ? s : s.description

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
    const data = await qnaApi.list({
      status: filters.status === ALL ? undefined : filters.status,
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
  try { statuses.value = await qnaApi.statuses() } catch { statuses.value = [] }
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
  <div class="p-4 sm:p-8">
    <PageHeader icon="lucide:help-circle" title="Q&A 관리" :description="`총 ${total.toLocaleString()}건 · 상품 문의`" />

    <FilterBar @search="search">
      <Select v-model="filters.status">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체</SelectItem>
          <SelectItem v-for="s in statuses" :key="statusCode(s)" :value="statusCode(s)">
            {{ statusLabel(s) }}
          </SelectItem>
          <template v-if="!statuses.length">
            <SelectItem value="ANSWERED">답변완료</SelectItem>
            <SelectItem value="WAITING">미답변</SelectItem>
          </template>
        </SelectContent>
      </Select>
      <Input v-model="filters.keyword" placeholder="제목 / 내용 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="qnas"
      :loading="loading"
      empty-message="Q&A 가 없습니다."
      clickable
      @row-click="(row: Qna) => router.push(`/qnas/${row.id}`)"
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
