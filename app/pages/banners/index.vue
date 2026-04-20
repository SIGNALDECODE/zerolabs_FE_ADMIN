<script setup lang="ts">
import { formatDate } from '~/utils/format'

useHead({ title: '배너 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const bannerApi = useAdminBanner()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const banners = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  position: '',
  status: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'imageUrl', label: '이미지', width: '80px' },
  { key: 'title', label: '제목' },
  { key: 'position', label: '위치' },
  { key: 'sortOrder', label: '순서', align: 'center' as const },
  { key: 'linkUrl', label: '링크' },
  { key: 'period', label: '노출 기간' },
  { key: 'status', label: '상태' },
  { key: 'actions', label: '', width: '60px' }
]

const load = async () => {
  loading.value = true
  try {
    const data: any = await bannerApi.list({
      position: filters.position || undefined,
      status: filters.status || undefined,
      page: filters.page,
      size: filters.size
    })
    banners.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
  } finally { loading.value = false }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

const remove = async (b: any) => {
  const ok = await confirm.ask('배너 삭제', {
    description: `"${b.title}"을(를) 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await bannerApi.remove(b.id)
    toast.success('배너를 삭제했습니다.')
    await load()
  } catch (e) { toast.error(e, '삭제 실패') }
}

onMounted(load)
</script>

<template>
  <div class="p-8">
    <PageHeader title="배너 관리" :description="`총 ${total.toLocaleString()}개`">
      <template #actions>
        <Button @click="router.push('/banners/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 배너 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="search">
      <select v-model="filters.position" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 위치</option>
        <option value="HERO">HERO</option>
        <option value="SLIDE">SLIDE</option>
        <option value="HALF">HALF</option>
        <option value="FULL">FULL</option>
      </select>
      <select v-model="filters.status" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 상태</option>
        <option value="ACTIVE">활성</option>
        <option value="INACTIVE">비활성</option>
        <option value="SCHEDULED">예약</option>
      </select>
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="banners"
      :loading="loading"
      empty-message="배너가 없습니다."
      clickable
      @row-click="(row: any) => router.push(`/banners/${row.id}`)"
    >
      <template #cell-imageUrl="{ row }">
        <img v-if="row.imageUrl" :src="row.imageUrl" class="h-10 w-16 rounded object-cover" />
        <div v-else class="h-10 w-16 rounded bg-muted" />
      </template>
      <template #cell-title="{ row }">
        <span class="font-medium max-w-xs truncate block">{{ row.title }}</span>
      </template>
      <template #cell-position="{ row }">
        <span class="text-muted-foreground text-sm">{{ row.position }}</span>
      </template>
      <template #cell-sortOrder="{ row }">
        <span class="text-muted-foreground">{{ row.sortOrder ?? '-' }}</span>
      </template>
      <template #cell-linkUrl="{ row }">
        <span class="text-xs font-mono text-muted-foreground max-w-xs truncate block">{{ row.linkUrl }}</span>
      </template>
      <template #cell-period="{ row }">
        <span class="text-muted-foreground text-xs">
          {{ formatDate(row.startedAt) }}<br>
          <span v-if="row.noEndDate">~ 상시</span>
          <span v-else>~ {{ formatDate(row.endedAt) }}</span>
        </span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-actions="{ row }">
        <Button variant="ghost" size="sm" class="h-7 w-7 p-0 text-destructive" @click.stop="remove(row)">
          <Icon name="lucide:trash-2" size="14" />
        </Button>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
