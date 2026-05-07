<script setup lang="ts">
import { formatDate, formatNumber } from '~/utils/format'
import type { EventListItem } from '~/types/content'

useHead({ title: '이벤트 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const eventApi = useAdminEvent()
const router = useRouter()

const ALL = 'ALL'

const events = ref<EventListItem[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  status: ALL as string,
  keyword: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'id', label: 'ID', width: '64px' },
  { key: 'thumbnailUrl', label: '썸네일', width: '72px', align: 'center' as const },
  { key: 'title', label: '제목' },
  { key: 'period', label: '진행기간' },
  { key: 'phase', label: '진행', align: 'center' as const, width: '80px' },
  { key: 'viewCount', label: '조회', align: 'right' as const },
  { key: 'status', label: '노출', width: '70px' },
  { key: 'createdAt', label: '등록일' }
]

/**
 * startedAt/endedAt 기반 진행 단계 계산.
 * BE 가 EventPeriodFilter(ONGOING/ENDED/UPCOMING) 를 별도 enum 으로 두므로 동일하게 맞춤.
 */
type EventPhase = 'UPCOMING' | 'ONGOING' | 'ENDED'
const phaseOf = (row: EventListItem, now: number): EventPhase => {
  const start = row.startedAt ? new Date(row.startedAt).getTime() : 0
  const end = row.endedAt ? new Date(row.endedAt).getTime() : 0
  if (now < start) return 'UPCOMING'
  if (now > end) return 'ENDED'
  return 'ONGOING'
}
const phaseLabel: Record<EventPhase, string> = { UPCOMING: '예정', ONGOING: '진행중', ENDED: '종료' }
const phaseTone: Record<EventPhase, string> = {
  UPCOMING: 'bg-amber-50 text-amber-700 border-amber-200',
  ONGOING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ENDED: 'bg-muted text-muted-foreground border-border'
}
const now = ref(Date.now())
useIntervalFn(() => { now.value = Date.now() }, 60_000)

const load = async () => {
  loading.value = true
  try {
    const data = await eventApi.list({
      status: filters.status === ALL ? undefined : filters.status,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    events.value = data?.content ?? []
    total.value = data?.total_elements ?? 0
  } finally { loading.value = false }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-8">
    <PageHeader icon="lucide:calendar-heart" title="이벤트" :description="`총 ${total.toLocaleString()}건`">
      <template #actions>
        <Button @click="router.push('/events/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 이벤트 등록
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
          <SelectItem value="ACTIVE">노출</SelectItem>
          <SelectItem value="INACTIVE">비노출</SelectItem>
        </SelectContent>
      </Select>
      <Input v-model="filters.keyword" placeholder="제목 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="events"
      :loading="loading"
      empty-message="등록된 이벤트가 없습니다."
      clickable
      @row-click="(row: EventListItem) => router.push(`/events/${row.id}`)"
    >
      <template #cell-id="{ row }">
        <span class="text-muted-foreground text-xs">{{ row.id }}</span>
      </template>
      <template #cell-thumbnailUrl="{ row }">
        <img
          v-if="row.thumbnailUrl"
          :src="row.thumbnailUrl"
          class="h-10 w-10 rounded object-cover border inline-block"
        />
        <span v-else class="text-muted-foreground/40 text-xs">-</span>
      </template>
      <template #cell-title="{ row }">
        <span class="font-medium max-w-md truncate block">{{ row.title }}</span>
        <span v-if="row.summary" class="text-xs text-muted-foreground max-w-md truncate block">{{ row.summary }}</span>
      </template>
      <template #cell-period="{ row }">
        <span class="text-xs text-muted-foreground">
          {{ formatDate(row.startedAt) }}<br>
          ~ {{ formatDate(row.endedAt) }}
        </span>
      </template>
      <template #cell-phase="{ row }">
        <span
          class="inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium"
          :class="phaseTone[phaseOf(row, now)]"
        >{{ phaseLabel[phaseOf(row, now)] }}</span>
      </template>
      <template #cell-viewCount="{ row }">
        <span class="text-muted-foreground text-sm">{{ formatNumber(row.viewCount) }}</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.createdAt) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
