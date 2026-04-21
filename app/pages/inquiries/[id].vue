<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { InquiryDetail } from '~/types/content'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const inquiryApi = useAdminInquiry()
const confirm = useConfirm()
const toast = useToast()

const id = Number(route.params.id)

const inquiry = ref<InquiryDetail | null>(null)
const loading = ref(true)
const answer = ref('')
const saving = ref(false)

const load = async () => {
  loading.value = true
  try {
    inquiry.value = await inquiryApi.detail(id)
    answer.value = inquiry.value?.answerContent ?? ''
  } finally {
    loading.value = false
  }
}

const submitAnswer = async () => {
  if (!answer.value.trim()) return
  saving.value = true
  try {
    await inquiryApi.answer(id, { answerContent: answer.value })
    await load()
  } finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('문의 삭제', {
    description: '이 문의를 삭제합니다.',
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await inquiryApi.remove(id)
    toast.success('문의를 삭제했습니다.')
    router.push('/inquiries')
  } catch (e) {
    toast.error(e, '문의 삭제 실패')
  }
}

const statusLabels: Record<string, string> = { WAITING: '대기', ANSWERED: '답변완료' }

onMounted(load)
useHead({ title: () => `${inquiry.value?.title ?? '문의'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-3xl">
    <DetailHeader
      :title="inquiry?.title ?? (loading ? '…' : '문의')"
      :subtitle="inquiry ? `문의 ID · ${inquiry.id}` : null"
      back-to="/inquiries"
    >
      <template #actions>
        <StatusBadge v-if="inquiry" :label="statusLabels[inquiry.status] ?? inquiry.status" :status="inquiry.status" />
        <Button variant="outline" size="sm" class="text-destructive" @click="remove">
          <Icon name="lucide:trash-2" size="14" class="mr-1" /> 삭제
        </Button>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <div v-else-if="inquiry" class="space-y-6">
      <DetailSection title="문의 내용">
        <DetailField label="작성자" :value="inquiry.userName ? `${inquiry.userName} (#${inquiry.userId})` : `#${inquiry.userId}`" />
        <DetailField label="유형" :value="inquiry.inquiryType" />
        <DetailField label="주문번호" :value="inquiry.orderNumber" mono />
        <DetailField label="작성일" :value="formatDate(inquiry.createdAt)" />
        <DetailField label="본문" full>
          <div class="whitespace-pre-wrap">{{ inquiry.content }}</div>
        </DetailField>
        <DetailField v-if="inquiry.attachmentUrls?.length" label="첨부" full>
          <div class="flex flex-wrap gap-2">
            <a
              v-for="(url, i) in inquiry.attachmentUrls"
              :key="i"
              :href="url"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Icon name="lucide:paperclip" size="12" /> 첨부 {{ i + 1 }}
            </a>
          </div>
        </DetailField>
      </DetailSection>

      <DetailSection title="답변" :description="inquiry.answeredAt ? `답변일시 · ${formatDate(inquiry.answeredAt)}` : '미답변'">
        <div class="col-span-2 space-y-3">
          <Textarea
            v-model="answer"
            rows="6"
            placeholder="고객에게 전달할 답변을 작성하세요."
          />
          <div class="flex justify-end">
            <Button :disabled="!answer.trim() || saving" @click="submitAnswer">
              <Icon name="lucide:send" size="14" class="mr-1" />
              {{ inquiry.answerContent ? '답변 수정' : '답변 등록' }}
            </Button>
          </div>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">문의를 찾을 수 없습니다.</div>
  </div>
</template>
