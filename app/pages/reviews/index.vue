<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { Review } from '~/types/content'

useHead({ title: '리뷰 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const reviewApi = useAdminReview()
const router = useRouter()

const ALL = 'ALL'

const reviews = ref<Review[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  keyword: '',
  rating: ALL as string,
  page: 1,
  size: 30
})

const columns = [
  { key: 'id', label: 'ID', width: '64px' },
  { key: 'rating', label: '별점', width: '100px', align: 'center' as const },
  { key: 'content', label: '내용' },
  { key: 'images', label: '이미지', width: '80px', align: 'center' as const },
  { key: 'userName', label: '작성자' },
  { key: 'helpfulCount', label: '추천', width: '64px', align: 'center' as const },
  { key: 'adminReply', label: '답변', width: '64px', align: 'center' as const },
  { key: 'createdAt', label: '작성일' }
]

const load = async () => {
  loading.value = true
  try {
    const data = await reviewApi.list({
      keyword: filters.keyword || undefined,
      rating: filters.rating === ALL ? undefined : Number(filters.rating),
      page: filters.page,
      size: filters.size
    })
    reviews.value = data?.content ?? []
    total.value = data?.total_elements ?? 0
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
    <PageHeader icon="lucide:star" title="리뷰 관리" :description="`총 ${total.toLocaleString()}건`" />

    <FilterBar @search="search">
      <Select v-model="filters.rating">
        <SelectTrigger class="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">전체 별점</SelectItem>
          <SelectItem value="5">★★★★★</SelectItem>
          <SelectItem value="4">★★★★☆</SelectItem>
          <SelectItem value="3">★★★☆☆</SelectItem>
          <SelectItem value="2">★★☆☆☆</SelectItem>
          <SelectItem value="1">★☆☆☆☆</SelectItem>
        </SelectContent>
      </Select>
      <Input v-model="filters.keyword" placeholder="내용 / 작성자 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="reviews"
      :loading="loading"
      empty-message="리뷰가 없습니다."
      clickable
      @row-click="(row: Review) => router.push(`/reviews/${row.id}`)"
    >
      <template #cell-id="{ row }">
        <span class="text-muted-foreground text-xs">{{ row.id }}</span>
      </template>
      <template #cell-rating="{ row }">
        <span class="text-amber-500">{{ '★'.repeat(row.rating ?? 0) }}</span><span class="text-muted-foreground/40">{{ '★'.repeat(5 - (row.rating ?? 0)) }}</span>
      </template>
      <template #cell-content="{ row }">
        <div class="max-w-md">
          <p class="font-medium truncate">{{ row.title || row.content }}</p>
          <p v-if="row.title" class="text-xs text-muted-foreground truncate">{{ row.content }}</p>
        </div>
      </template>
      <template #cell-images="{ row }">
        <Icon v-if="row.images?.length" name="lucide:image" size="14" class="inline text-sky-600" />
        <span v-if="row.images?.length" class="text-xs ml-0.5">{{ row.images.length }}</span>
      </template>
      <template #cell-userName="{ row }">
        <span>{{ row.userName }}</span>
        <Badge v-if="row.isVerifiedPurchase" variant="outline" class="ml-1 text-[10px]">구매확인</Badge>
        <Badge v-if="row.isBest" variant="secondary" class="ml-1 text-[10px]">BEST</Badge>
      </template>
      <template #cell-helpfulCount="{ row }">
        <span class="text-muted-foreground text-sm">{{ row.helpfulCount ?? 0 }}</span>
      </template>
      <template #cell-adminReply="{ row }">
        <Icon v-if="row.adminReply" name="lucide:check" size="14" class="inline text-emerald-600" />
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.createdAt) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
