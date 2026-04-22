<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { InquiryListItem } from '~/types/content'

useHead({ title: '1:1 문의 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const inquiryApi = useAdminInquiry()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const ALL = 'ALL'

/** BE 응답: `[{ code, name }]`. 옛날 응답 호환을 위해 string 도 허용. */
type InquiryTypeOption = { code: string, name: string } | string

const inquiries = ref<InquiryListItem[]>([])
const total = ref(0)
const loading = ref(false)
const types = ref<InquiryTypeOption[]>([])
const selectedIds = ref<number[]>([])

const filters = reactive({
  status: ALL as string,
  inquiryType: ALL as string,
  keyword: '',
  page: 1,
  size: 30
})

const typeCode = (t: InquiryTypeOption): string => typeof t === 'string' ? t : t.code
const typeLabel = (t: InquiryTypeOption): string => typeof t === 'string' ? t : t.name

const columns = [
  { key: 'select', label: '', width: '40px' },
  { key: 'id', label: 'ID', width: '64px' },
  { key: 'inquiryType', label: '유형' },
  { key: 'title', label: '제목' },
  { key: 'userName', label: '작성자' },
  { key: 'status', label: '상태' },
  { key: 'createdAt', label: '작성일' }
]

const statusLabels: Record<string, string> = {
  WAITING: '대기', ANSWERED: '답변완료'
}

const load = async () => {
  loading.value = true
  try {
    const data = await inquiryApi.list({
      status: filters.status === ALL ? undefined : filters.status,
      inquiryType: filters.inquiryType === ALL ? undefined : filters.inquiryType,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    inquiries.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
    selectedIds.value = []
  } finally { loading.value = false }
}

const loadTypes = async () => {
  try { types.value = await inquiryApi.types() } catch { types.value = [] }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

const toggleSelect = (id: number) => {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}

const toggleAll = () => {
  if (selectedIds.value.length === inquiries.value.length) selectedIds.value = []
  else selectedIds.value = inquiries.value.map(q => q.id)
}

const bulkRemove = async () => {
  if (!selectedIds.value.length) return
  const ok = await confirm.ask('선택 삭제', {
    description: `선택한 ${selectedIds.value.length}건을 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await inquiryApi.bulkRemove([...selectedIds.value])
    toast.success('선택한 문의를 삭제했습니다.')
    await load()
  } catch (e) { toast.error(e, '삭제 실패') }
}

onMounted(() => {
  load()
  loadTypes()
})
</script>

<template>
  <div class="p-8">
    <PageHeader title="1:1 문의" :description="`총 ${total.toLocaleString()}건`">
      <template #actions>
        <Button
          v-if="selectedIds.length"
          variant="outline"
          size="sm"
          class="text-destructive"
          @click="bulkRemove"
        >
          <Icon name="lucide:trash-2" size="14" class="mr-1" /> 선택 삭제 ({{ selectedIds.length }})
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
          <SelectItem value="WAITING">대기</SelectItem>
          <SelectItem value="ANSWERED">답변완료</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="filters.inquiryType">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 유형</SelectItem>
          <SelectItem v-for="t in types" :key="typeCode(t)" :value="typeCode(t)">
            {{ typeLabel(t) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Input v-model="filters.keyword" placeholder="제목 / 이름 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="inquiries"
      :loading="loading"
      empty-message="문의가 없습니다."
      clickable
      @row-click="(row: InquiryListItem) => router.push(`/inquiries/${row.id}`)"
    >
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :checked="selectedIds.includes(row.id)"
          class="h-4 w-4"
          @click.stop
          @change="toggleSelect(row.id)"
        />
      </template>
      <template #cell-id="{ row }">
        <span class="text-muted-foreground text-xs">{{ row.id }}</span>
      </template>
      <template #cell-inquiryType="{ row }">
        <span class="text-muted-foreground text-sm">{{ row.inquiryType }}</span>
      </template>
      <template #cell-title="{ row }">
        <span class="font-medium max-w-md truncate block">{{ row.title }}</span>
      </template>
      <template #cell-userName="{ row }">
        {{ row.userName ?? `#${row.userId}` }}
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
