<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { Faq, FaqCategory } from '~/types/content'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const faqApi = useAdminFaq()
const toast = useToast()
const confirm = useConfirm()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const faq = ref<Faq | null>(null)
const categories = ref<FaqCategory[]>([])
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const form = reactive<{
  categoryId: number | null
  question: string
  answer: string
}>({
  categoryId: null,
  question: '',
  answer: ''
})

const categoryIdStr = computed<string | undefined>({
  get: () => form.categoryId != null ? String(form.categoryId) : undefined,
  set: v => { form.categoryId = v != null ? Number(v) : null }
})

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    faq.value = await faqApi.detail(id)
    Object.assign(form, {
      categoryId: faq.value?.categoryId ?? null,
      question: faq.value?.question ?? '',
      answer: faq.value?.answer ?? ''
    })
  } finally { loading.value = false }
}

const loadCategories = async () => {
  try { categories.value = await faqApi.categories() } catch { categories.value = [] }
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/faqs')
  editing.value = false
  Object.assign(form, {
    categoryId: faq.value?.categoryId ?? null,
    question: faq.value?.question ?? '',
    answer: faq.value?.answer ?? ''
  })
}

const submit = async () => {
  if (!form.categoryId) return toast.error('카테고리를 선택하세요.')
  if (!form.question.trim() || !form.answer.trim()) return toast.error('질문과 답변은 필수입니다.')
  saving.value = true
  try {
    if (isNew) {
      const res = await faqApi.create({
        categoryId: form.categoryId!,
        question: form.question,
        answer: form.answer
      })
      toast.success('FAQ 를 등록했습니다.')
      router.push(`/faqs/${res.id}`)
    } else {
      await faqApi.update(id, {
        categoryId: form.categoryId,
        question: form.question,
        answer: form.answer
      })
      toast.success('FAQ 를 수정했습니다.')
      editing.value = false
      await load()
    }
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('FAQ 삭제', {
    description: '이 FAQ 를 삭제합니다.',
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await faqApi.remove(id)
    toast.success('FAQ 를 삭제했습니다.')
    router.push('/faqs')
  } catch (e) {
    toast.error(e, 'FAQ 삭제 실패')
  }
}

onMounted(() => { load(); loadCategories() })
useHead({ title: () => isNew ? '새 FAQ | ZeroLabs Admin' : `${faq.value?.question ?? 'FAQ'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-3xl">
    <DetailHeader
      :title="isNew ? '새 FAQ 등록' : (faq?.question ?? (loading ? '…' : 'FAQ'))"
      :subtitle="isNew ? null : (faq ? `FAQ ID · ${faq.id}` : null)"
      back-to="/faqs"
    >
      <template #actions>
        <template v-if="!editing && faq">
          <Badge variant="outline">{{ faq.categoryName }}</Badge>
          <Button variant="outline" size="sm" @click="startEdit">
            <Icon name="lucide:pencil" size="14" class="mr-1" /> 수정
          </Button>
          <Button variant="outline" size="sm" class="text-destructive" @click="remove">
            <Icon name="lucide:trash-2" size="14" class="mr-1" /> 삭제
          </Button>
        </template>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <Card v-else-if="editing">
      <CardContent class="pt-6 space-y-5">
        <div>
          <Label class="mb-1.5 block">카테고리 <span class="text-destructive">*</span></Label>
          <Select v-model="categoryIdStr">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="c in categories" :key="c.id" :value="String(c.id)">
                {{ c.name }}{{ c.isActive === false ? ' (비활성)' : '' }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="!categories.length" class="mt-1 text-xs text-muted-foreground">
            카테고리가 없습니다. 목록에서 "카테고리 추가" 를 먼저 실행하세요.
          </p>
        </div>

        <div>
          <Label class="mb-1.5 block">질문 <span class="text-destructive">*</span></Label>
          <Input v-model="form.question" placeholder="고객이 자주 묻는 질문" maxlength="500" />
          <p class="mt-1 text-xs text-muted-foreground">{{ form.question.length }} / 500</p>
        </div>

        <div>
          <Label class="mb-1.5 block">답변 <span class="text-destructive">*</span></Label>
          <Textarea v-model="form.answer" rows="8" placeholder="답변 내용" />
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" :disabled="saving" @click="cancelEdit">취소</Button>
          <Button :disabled="saving" @click="submit">
            <Icon :name="isNew ? 'lucide:plus' : 'lucide:save'" size="14" class="mr-1" />
            {{ isNew ? '등록' : '저장' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <div v-else-if="faq" class="space-y-6">
      <DetailSection title="질문">
        <div class="col-span-2 whitespace-pre-wrap text-sm">{{ faq.question }}</div>
      </DetailSection>

      <DetailSection title="답변">
        <div class="col-span-2 whitespace-pre-wrap text-sm">{{ faq.answer }}</div>
      </DetailSection>

      <DetailSection title="메타">
        <DetailField label="카테고리" :value="faq.categoryName" />
        <DetailField label="카테고리 ID" :value="faq.categoryId" />
        <DetailField label="등록일" :value="formatDate(faq.createdAt)" full />
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">FAQ 를 찾을 수 없습니다.</div>
  </div>
</template>
