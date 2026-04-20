<script setup lang="ts">
import { formatDate, formatNumber, formatPhone } from '~/utils/format'

useHead({ title: '회원 관리 | ZeroLabs Admin' })

const api = useApi()
const router = useRouter()

const users = ref<any[]>([])
const totalElements = ref(0)
const loading = ref(false)

const filters = reactive({
  searchType: '',
  keyword: '',
  status: '',
  grade: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'email', label: '이메일' },
  { key: 'name', label: '이름' },
  { key: 'phone', label: '전화번호' },
  { key: 'grade', label: '등급' },
  { key: 'point', label: '포인트', align: 'right' as const },
  { key: 'status', label: '상태' },
  { key: 'createdAt', label: '가입일' }
]

const load = async () => {
  loading.value = true
  try {
    const data = await api.get('/admin/users', {
      searchType: filters.searchType || undefined,
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      grade: filters.grade || undefined,
      page: filters.page,
      size: filters.size
    }) as any
    users.value = data?.content || []
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

const goPage = (p: number) => { filters.page = p; load() }

onMounted(load)
</script>

<template>
  <div class="p-8">
    <PageHeader title="회원 관리" :description="`총 ${totalElements.toLocaleString()}명`" />

    <FilterBar @search="handleSearch">
      <Input v-model="filters.keyword" placeholder="이름 / 이메일 / 전화번호" class="max-w-xs" @keyup.enter="handleSearch" />
      <select v-model="filters.status" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 상태</option>
        <option value="ACTIVE">활성</option>
        <option value="INACTIVE">비활성</option>
        <option value="SUSPENDED">정지</option>
        <option value="WITHDRAWN">탈퇴</option>
      </select>
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="users"
      :loading="loading"
      empty-message="회원이 없습니다."
      clickable
      @row-click="(row: any) => router.push(`/users/${row.id}`)"
    >
      <template #cell-email="{ row }">
        <span class="font-medium">{{ row.email }}</span>
      </template>
      <template #cell-phone="{ row }">
        {{ formatPhone(row.phone) }}
      </template>
      <template #cell-grade="{ row }">
        {{ row.grade?.name ?? '-' }}
      </template>
      <template #cell-point="{ row }">
        {{ formatNumber(row.point?.currentPoint ?? 0) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.createdAt) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="totalElements" @change="goPage" />
  </div>
</template>
