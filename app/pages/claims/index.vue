<script setup lang="ts">
import { formatCurrency, formatDate } from '~/utils/format'
import type { ClaimListItem } from '~/types/claim'

useHead({ title: '클레임 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const claimApi = useAdminClaim()
const router = useRouter()

const ALL = 'ALL'

const claims = ref<ClaimListItem[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  claimType: ALL as string,
  status: ALL as string,
  searchType: 'ORDER_NUMBER' as string,
  keyword: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'representativeProductThumbnailUrl', label: '이미지', width: '72px' },
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
    const data = await claimApi.list({
      claimType: filters.claimType === ALL ? undefined : filters.claimType,
      status: filters.status === ALL ? undefined : filters.status,
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

const goDetail = (claim: ClaimListItem) => {
  router.push(`/claims/${claim.id}?orderId=${claim.orderId}`)
}

const reset = () => {
  filters.claimType = ALL
  filters.status = ALL
  filters.keyword = ''
  filters.page = 1
  load()
}

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-8">
    <PageHeader icon="lucide:refresh-cw" title="클레임 관리" :description="`총 ${total.toLocaleString()}건 · 취소/반품/교환`" />

    <FilterBar @search="search">
      <Select v-model="filters.claimType">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 유형</SelectItem>
          <SelectItem value="CANCEL">취소</SelectItem>
          <SelectItem value="RETURN">반품</SelectItem>
          <SelectItem value="EXCHANGE">교환</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="filters.status">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 상태</SelectItem>
          <SelectItem value="REQUESTED">접수</SelectItem>
          <SelectItem value="APPROVED">승인</SelectItem>
          <SelectItem value="IN_PROGRESS">처리중</SelectItem>
          <SelectItem value="COMPLETED">완료</SelectItem>
          <SelectItem value="REJECTED">거절</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="filters.searchType">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ORDER_NUMBER">주문번호</SelectItem>
          <SelectItem value="USER_ID">회원 ID</SelectItem>
          <SelectItem value="PHONE">전화번호</SelectItem>
        </SelectContent>
      </Select>

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
