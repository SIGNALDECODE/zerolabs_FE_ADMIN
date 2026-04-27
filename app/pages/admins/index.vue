<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { AdminListItem } from '~/types/user'

useHead({ title: '관리자 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const adminsApi = useAdmins()
const router = useRouter()

const admins = ref<AdminListItem[]>([])
const total = ref(0)
const loading = ref(false)

const ALL = 'ALL'

const filters = reactive({
  keyword: '',
  userType: ALL as string,
  status: ALL as string,
  page: 1,
  size: 30
})

const columns = [
  { key: 'email', label: '이메일' },
  { key: 'name', label: '이름' },
  { key: 'role', label: '권한' },
  { key: 'status', label: '상태' },
  { key: 'phone', label: '연락처' },
  { key: 'created_at', label: '가입일' }
]

const roleLabels: Record<string, string> = {
  ADMIN: '최고관리자', STAFF: '운영자', CUSTOMER: '일반'
}

const load = async () => {
  loading.value = true
  try {
    const data = await adminsApi.list({
      keyword: filters.keyword || undefined,
      userType: filters.userType === ALL ? undefined : filters.userType,
      status: filters.status === ALL ? undefined : filters.status,
      page: filters.page,
      size: filters.size
    })
    if (Array.isArray(data)) {
      admins.value = data
      total.value = data.length
    } else {
      admins.value = data?.content ?? []
      total.value = data?.total_elements ?? admins.value.length
    }
  } finally {
    loading.value = false
  }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-8">
    <PageHeader icon="lucide:shield" title="관리자 계정" :description="`총 ${total.toLocaleString()}명`">
      <template #actions>
        <Button @click="router.push('/admins/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 관리자 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="search">
      <Select v-model="filters.userType">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 권한</SelectItem>
          <SelectItem value="ADMIN">최고관리자</SelectItem>
          <SelectItem value="STAFF">운영자</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="filters.status">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 상태</SelectItem>
          <SelectItem value="ACTIVE">활성</SelectItem>
          <SelectItem value="SUSPENDED">정지</SelectItem>
          <SelectItem value="WITHDRAWN">탈퇴</SelectItem>
        </SelectContent>
      </Select>
      <Input v-model="filters.keyword" placeholder="이름 / 이메일 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="admins"
      :loading="loading"
      empty-message="관리자가 없습니다."
      clickable
      @row-click="(row: AdminListItem) => router.push(`/admins/${row.id}`)"
    >
      <template #cell-email="{ row }">
        <span class="font-medium">{{ row.email }}</span>
      </template>
      <template #cell-role="{ row }">
        <Badge variant="outline">{{ roleLabels[row.role ?? ''] ?? row.role }}</Badge>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-phone="{ row }">
        <span class="text-muted-foreground text-sm">{{ row.phone ?? '-' }}</span>
      </template>
      <template #cell-created_at="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.created_at) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
