<script setup lang="ts">
import { formatDate, formatNumber } from '~/utils/format'
import type { NoticeListItem } from '~/types/content'

useHead({ title: '공지사항 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const noticeApi = useAdminNotice()
const router = useRouter()

const ALL = 'ALL'

const notices = ref<NoticeListItem[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  status: ALL as string,
  type: ALL as string,
  keyword: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'id', label: 'ID', width: '64px' },
  { key: 'isPinned', label: '고정', width: '60px', align: 'center' as const },
  { key: 'type', label: '유형' },
  { key: 'title', label: '제목' },
  { key: 'viewCount', label: '조회', align: 'right' as const },
  { key: 'status', label: '상태' },
  { key: 'createdAt', label: '등록일' }
]

const load = async () => {
  loading.value = true
  try {
    const data = await noticeApi.list({
      status: filters.status === ALL ? undefined : filters.status,
      type: filters.type === ALL ? undefined : filters.type,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    notices.value = data?.content ?? []
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
    <PageHeader icon="lucide:megaphone" title="공지사항" :description="`총 ${total.toLocaleString()}건`">
      <template #actions>
        <Button @click="router.push('/notices/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 공지 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="search">
      <Select v-model="filters.type">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 유형</SelectItem>
          <SelectItem value="NOTICE">공지사항</SelectItem>
          <SelectItem value="INSPECTION">점검</SelectItem>
          <SelectItem value="GUIDELINES">안내</SelectItem>
          <SelectItem value="EVENT">이벤트</SelectItem>
        </SelectContent>
      </Select>
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
      :rows="notices"
      :loading="loading"
      empty-message="공지사항이 없습니다."
      clickable
      @row-click="(row: NoticeListItem) => router.push(`/notices/${row.id}`)"
    >
      <template #cell-id="{ row }">
        <span class="text-muted-foreground text-xs">{{ row.id }}</span>
      </template>
      <template #cell-isPinned="{ row }">
        <Icon v-if="row.isPinned" name="lucide:pin" size="14" class="inline text-rose-600" />
      </template>
      <template #cell-type="{ row }">
        <span class="text-muted-foreground text-sm">{{ row.type }}</span>
      </template>
      <template #cell-title="{ row }">
        <span class="font-medium max-w-md truncate block">{{ row.title }}</span>
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
