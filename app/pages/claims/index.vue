<script setup lang="ts">
import { formatCurrency, formatDate } from '~/utils/format'

useHead({ title: '클레임 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const claimApi = useAdminClaim()
const router = useRouter()

const claims = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  claimType: '',
  status: '',
  searchType: 'ORDER_NUMBER',
  keyword: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'representativeProductThumbnailUrl', label: '이미지', width: '56px' },
  { key: 'orderNumber', label: '주문번호' },
  { key: 'claimType', label: '유형' },
  { key: 'representativeProductName', label: '상품' },
  { key: 'itemCount', label: '수량', align: 'center' as const },
  { key: 'reasonType', label: '사유' },
  { key: 'refundAmount', label: '환불금액', align: 'right' as const },
  { key: 'status', label: '상태' },
  { key: 'requestedAt', label: '접수일' }
]

const load = async () => {
  loading.value = true
  try {
    const data: any = await claimApi.list({
      claimType: filters.claimType || undefined,
      status: filters.status || undefined,
      searchType: filters.keyword ? filters.searchType : undefined,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    claims.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
  } finally {
    loading.value = false
  }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

const goDetail = (claim: any) => {
  router.push(`/claims/${claim.id}?orderId=${claim.orderId}`)
}

const reset = () => {
  filters.claimType = ''
  filters.status = ''
  filters.keyword = ''
  filters.page = 1
  load()
}

onMounted(load)
</script>

<template>
  <div class="p-8">
    <PageHeader title="클레임 관리" :description="`총 ${total.toLocaleString()}건 · 취소/반품/교환`" />

    <FilterBar @search="search">
      <select v-model="filters.claimType" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 유형</option>
        <option value="CANCEL">취소</option>
        <option value="RETURN">반품</option>
        <option value="EXCHANGE">교환</option>
      </select>

      <select v-model="filters.status" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 상태</option>
        <option value="REQUESTED">접수</option>
        <option value="APPROVED">승인</option>
        <option value="IN_PROGRESS">처리중</option>
        <option value="COMPLETED">완료</option>
        <option value="REJECTED">거절</option>
      </select>

      <select v-model="filters.searchType" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="ORDER_NUMBER">주문번호</option>
        <option value="USER_ID">회원 ID</option>
        <option value="PHONE">전화번호</option>
      </select>

      <Input v-model="filters.keyword" placeholder="검색어" class="max-w-xs" @keyup.enter="search" />

      <template #actions>
        <Button variant="outline" @click="reset">
          <Icon name="lucide:rotate-ccw" size="14" class="mr-1" /> 초기화
        </Button>
        <Button @click="search">
          <Icon name="lucide:search" size="14" class="mr-1" /> 검색
        </Button>
      </template>
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="claims"
      :loading="loading"
      empty-message="클레임이 없습니다."
      clickable
      @row-click="goDetail"
    >
      <template #cell-representativeProductThumbnailUrl="{ row }">
        <img v-if="row.representativeProductThumbnailUrl" :src="row.representativeProductThumbnailUrl" class="h-10 w-10 rounded object-cover" />
        <div v-else class="h-10 w-10 rounded bg-muted" />
      </template>
      <template #cell-orderNumber="{ row }">
        <span class="font-mono text-xs">{{ row.orderNumber }}</span>
      </template>
      <template #cell-claimType="{ row }">
        <StatusBadge :label="row.claimTypeDescription ?? row.claimType" :status="row.claimType" />
      </template>
      <template #cell-representativeProductName="{ row }">
        <span class="max-w-52 truncate block">{{ row.representativeProductName ?? '-' }}</span>
      </template>
      <template #cell-reasonType="{ row }">
        <span class="text-muted-foreground">{{ row.reasonTypeDescription ?? row.reasonType }}</span>
      </template>
      <template #cell-refundAmount="{ row }">
        {{ formatCurrency(row.refundAmount) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="row.statusDescription ?? row.status" :status="row.status" />
      </template>
      <template #cell-requestedAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.requestedAt) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
