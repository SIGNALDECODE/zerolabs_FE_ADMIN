<script setup lang="ts">
import { formatDate } from '~/utils/format'

useHead({ title: 'FAQ | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const faqApi = useAdminFaq()
const router = useRouter()
const toast = useToast()
const prompt = usePrompt()

const faqs = ref<any[]>([])
const categories = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

const filters = reactive({
  categoryId: '',
  keyword: '',
  page: 1,
  size: 30
})

const columns = [
  { key: 'id', label: 'ID', width: '64px' },
  { key: 'categoryName', label: '카테고리', width: '160px' },
  { key: 'question', label: '질문' },
  { key: 'answer', label: '답변' },
  { key: 'createdAt', label: '등록일' }
]

const load = async () => {
  loading.value = true
  try {
    const data: any = await faqApi.list({
      categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
      keyword: filters.keyword || undefined,
      page: filters.page,
      size: filters.size
    })
    faqs.value = data?.content ?? []
    total.value = data?.totalElements ?? 0
  } finally { loading.value = false }
}

const loadCategories = async () => {
  try { categories.value = (await faqApi.categories()) as any[] } catch { categories.value = [] }
}

const search = () => { filters.page = 1; load() }
const goPage = (p: number) => { filters.page = p; load() }

watchDebounced(() => filters.keyword, search, { debounce: 400 })

const createCategory = async () => {
  const name = await prompt.ask('FAQ 카테고리 추가', {
    placeholder: '예: 배송, 결제, 반품'
  })
  if (!name) return
  try {
    await faqApi.createCategory({ name })
    toast.success('카테고리를 추가했습니다.')
    await loadCategories()
  } catch (e) { toast.error(e, '카테고리 추가 실패') }
}

onMounted(() => { load(); loadCategories() })
</script>

<template>
  <div class="p-8">
    <PageHeader title="FAQ" :description="`총 ${total.toLocaleString()}건 · 카테고리 ${categories.length}개`">
      <template #actions>
        <Button variant="outline" @click="createCategory">
          <Icon name="lucide:folder-plus" size="14" class="mr-1" /> 카테고리 추가
        </Button>
        <Button @click="router.push('/faqs/new')">
          <Icon name="lucide:plus" size="16" class="mr-1" /> FAQ 등록
        </Button>
      </template>
    </PageHeader>

    <FilterBar @search="search">
      <select v-model="filters.categoryId" class="h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="">전체 카테고리</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">
          {{ c.name }}{{ c.isActive === false ? ' (비활성)' : '' }}
        </option>
      </select>
      <Input v-model="filters.keyword" placeholder="질문 검색" class="max-w-xs" @keyup.enter="search" />
    </FilterBar>

    <DataTable
      :columns="columns"
      :rows="faqs"
      :loading="loading"
      empty-message="FAQ 가 없습니다."
      clickable
      @row-click="(row: any) => router.push(`/faqs/${row.id}`)"
    >
      <template #cell-id="{ row }">
        <span class="text-muted-foreground text-xs">{{ row.id }}</span>
      </template>
      <template #cell-categoryName="{ row }">
        <Badge variant="outline">{{ row.categoryName }}</Badge>
      </template>
      <template #cell-question="{ row }">
        <span class="font-medium max-w-sm truncate block">{{ row.question }}</span>
      </template>
      <template #cell-answer="{ row }">
        <span class="text-muted-foreground text-sm max-w-md truncate block">{{ row.answer }}</span>
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-muted-foreground text-xs">{{ formatDate(row.createdAt) }}</span>
      </template>
    </DataTable>

    <Pagination :page="filters.page" :size="filters.size" :total="total" @change="goPage" />
  </div>
</template>
