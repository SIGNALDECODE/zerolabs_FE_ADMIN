<script setup lang="ts">
import { formatDate } from '~/utils/format'

useHead({ title: '관리자 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const adminsApi = useAdmins()
const router = useRouter()

const admins = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  keyword: '',
  userType: '',
  status: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'email', label: '이메일' },
  { key: 'name', label: '이름' },
  { key: 'role', label: '권한' },
  { key: 'status', label: '상태' },
  { key: 'lastLoginAt', label: '최근 로그인' },
  { key: 'createdAt', label: '가입일' }
]

const roleLabels: Record<string, string> = {
  ADMIN: '최고관리자', STAFF: '운영자', USER: '일반'
}

const load = async () => {
  loading.value = true
  try {
    const data: any = await adminsApi.list({
      keyword: filters.keyword || undefined,
      userType: filters.userType || undefined,
      status: filters.status || undefined,
      page: filters.page,
      size: filters.size
    })
    admins.value = data?.content ?? data ?? []
    total.value = data?.totalElements ?? admins.value.length
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
  <div class="p-8">
    <PageHeader title="관리자 계정" :description="`총 ${total.toLocaleString()}명`">
      <template #actions>
        <Button @click="router.push('/admins/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> 관리자 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="search">
      <select v-model="filters.userType" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 권한</option>
        <option value="ADMIN">최고관리자</option>
        <option value="STAFF">운영자</option>
      </select>
      <select v-model="filters.status" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 상태</option>
        <option value="ACTIVE">활성</option>
        <option value="SUSPENDED">정지</option>
        <option value="WITHDRAWN">탈퇴</option>
      </select>
      <Input v-model="filters.keyword" placeholder="이름 / 이메일 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="admins"
      :loading="loading"
      empty-message="관리자가 없습니다."
      clickable
      @row-click="(row: any) => router.push(`/admins/${row.id}`)"
    >
      <template #cell-email="{ row }">
        <span class="font-medium">{{ row.email }}</span>
      </template>
      <template #cell-role="{ row }">
        <Badge variant="outline">{{ roleLabels[row.userType ?? row.role] ?? row.userType ?? row.role }}</Badge>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-lastLoginAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.lastLoginAt) }}</span>
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.createdAt) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
