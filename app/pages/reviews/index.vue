<script setup lang="ts">
import { formatDate } from '~/utils/format'

useHead({ title: '리뷰 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const reviewApi = useAdminReview()
const router = useRouter()
const toast = useToast()

const reviews = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  keyword: '',
  rating: '',
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
  { key: 'createdAt', label: '작성일' },
  { key: 'isVisible', label: '노출', width: '80px', align: 'center' as const }
]

const load = async () => {
  loading.value = true
  try {
    const data: any = await reviewApi.list({
      keyword: filters.keyword || undefined,
      rating: filters.rating ? Number(filters.rating) : undefined,
      page: filters.page,
      size: filters.size
    })
    reviews.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
  } finally {
    loading.value = false
  }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

const toggleVisibility = async (r: any) => {
  const visible = !(r.isVisible ?? true)
  try {
    await reviewApi.toggleVisibility({ reviewId: r.id, visible })
    toast.success(visible ? '리뷰를 노출합니다.' : '리뷰를 숨겼습니다.')
    await load()
  } catch (e) { toast.error(e, '변경 실패') }
}

onMounted(load)
</script>

<template>
  <div class="p-8">
    <PageHeader title="리뷰 관리" :description="`총 ${total.toLocaleString()}건`" />

    <FilterBar @search="search">
      <select v-model="filters.rating" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 별점</option>
        <option value="5">★★★★★</option>
        <option value="4">★★★★☆</option>
        <option value="3">★★★☆☆</option>
        <option value="2">★★☆☆☆</option>
        <option value="1">★☆☆☆☆</option>
      </select>
      <Input v-model="filters.keyword" placeholder="내용 / 작성자 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="reviews"
      :loading="loading"
      empty-message="리뷰가 없습니다."
      clickable
      @row-click="(row: any) => router.push(`/reviews/${row.id}`)"
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
      <template #cell-isVisible="{ row }">
        <Button
          variant="outline"
          size="sm"
          class="h-7 px-2"
          @click.stop="toggleVisibility(row)"
        >
          <Icon
            :name="(row.isVisible ?? true) ? 'lucide:eye' : 'lucide:eye-off'"
            size="12"
          />
        </Button>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
