<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { Popup } from '~/types/marketing'

useHead({ title: '팝업 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const popupApi = useAdminPopup()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const ALL = 'ALL'

const popups = ref<Popup[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  status: ALL as string,
  page: 1,
  size: 30
})

const columns = [
  { key: 'image', label: '이미지', width: '64px' },
  { key: 'name', label: '팝업명' },
  { key: 'popupType', label: '타입' },
  { key: 'sortOrder', label: '순서', align: 'center' as const },
  { key: 'period', label: '노출 기간' },
  { key: 'status', label: '상태' },
  { key: 'actions', label: '', width: '60px' }
]

const load = async () => {
  loading.value = true
  try {
    const data = await popupApi.list({
      status: filters.status === ALL ? undefined : filters.status,
      page: filters.page,
      size: filters.size
    })
    popups.value = data?.content ?? []
    total.value = data?.total_elements ?? 0
  } finally { loading.value = false }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

const remove = async (p: Popup) => {
  const ok = await confirm.ask('팝업 삭제', {
    description: `"${p.name}"을(를) 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await popupApi.remove(p.id)
    toast.success('팝업을 삭제했습니다.')
    await load()
  } catch (e) { toast.error(e, '삭제 실패') }
}

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-8">
    <PageHeader icon="lucide:square-stack" title="팝업 관리" :description="`총 ${total.toLocaleString()}개`">
      <template #actions>
        <Button @click="router.push('/popups/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 팝업 등록
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
          <SelectItem value="ACTIVE">활성</SelectItem>
          <SelectItem value="INACTIVE">비활성</SelectItem>
        </SelectContent>
      </Select>
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="popups"
      :loading="loading"
      empty-message="팝업이 없습니다."
      clickable
      @row-click="(row: Popup) => router.push(`/popups/${row.id}`)"
    >
      <template #cell-image="{ row }">
        <img v-if="row.image" :src="row.image" class="h-10 w-10 rounded object-cover" />
        <div v-else class="h-10 w-10 rounded bg-muted" />
      </template>
      <template #cell-name="{ row }">
        <span class="font-medium">{{ row.name }}</span>
      </template>
      <template #cell-popupType="{ row }">
        <span class="text-muted-foreground text-sm">{{ row.popupType }}</span>
      </template>
      <template #cell-sortOrder="{ row }">
        <span class="text-muted-foreground">{{ row.sortOrder ?? '-' }}</span>
      </template>
      <template #cell-period="{ row }">
        <span class="text-muted-foreground text-xs">
          {{ formatDate(row.startedAt) }}<br>~ {{ formatDate(row.endedAt) }}
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
