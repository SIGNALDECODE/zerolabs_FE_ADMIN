<script setup lang="ts">
import { formatCurrency, formatDate, formatNumber, formatPhone } from '~/utils/format'
import type { PageResponse } from '~/types/api'
import type { UserListItem } from '~/types/user'

useHead({ title: '회원 관리 | ZeroLabs Admin' })

const api = useApi()
const router = useRouter()

const users = ref<UserListItem[]>([])
const totalElements = ref(0)
const loading = ref(false)

const ALL = 'ALL'

const filters = reactive({
  searchType: '',
  keyword: '',
  status: ALL as string,
  grade: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'email', label: '이메일' },
  { key: 'name', label: '이름' },
  { key: 'phone', label: '전화번호' },
  { key: 'grade', label: '등급' },
  { key: 'order_count', label: '주문', align: 'right' as const },
  { key: 'total_order_amount', label: '누적구매', align: 'right' as const },
  { key: 'status', label: '상태' },
  { key: 'created_at', label: '가입일' }
]

const load = async () => {
  loading.value = true
  try {
    const data = await api.get<PageResponse<UserListItem>>('/admin/users', {
      searchType: filters.searchType || undefined,
      keyword: filters.keyword || undefined,
      status: filters.status === ALL ? undefined : filters.status,
      grade: filters.grade || undefined,
      page: filters.page,
      size: filters.size
    })
    users.value = data?.content ?? []
    totalElements.value = data?.total_elements ?? 0
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
  <div class="p-4 sm:p-8">
    <PageHeader icon="lucide:users" title="회원 관리" :description="`총 ${totalElements.toLocaleString()}명`" />

    <FilterBar @search="handleSearch">
      <Input v-model="filters.keyword" placeholder="이름 / 이메일 / 전화번호" class="max-w-xs" @keyup.enter="handleSearch" />
      <Select v-model="filters.status">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 상태</SelectItem>
          <SelectItem value="ACTIVE">활성</SelectItem>
          <SelectItem value="INACTIVE">비활성</SelectItem>
          <SelectItem value="SUSPENDED">정지</SelectItem>
          <SelectItem value="WITHDRAWN">탈퇴</SelectItem>
        </SelectContent>
      </Select>
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="users"
      :loading="loading"
      empty-message="회원이 없습니다."
      clickable
      @row-click="(row: UserListItem) => router.push(`/users/${row.user_id}`)"
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
      <template #cell-order_count="{ row }">
        {{ formatNumber(row.order_count ?? 0) }}
      </template>
      <template #cell-total_order_amount="{ row }">
        {{ formatCurrency(row.total_order_amount) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.created_at) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="totalElements" @change="goPage" />
  </div>
</template>
