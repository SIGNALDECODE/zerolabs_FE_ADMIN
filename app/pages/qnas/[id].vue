<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { Qna } from '~/types/content'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const qnaApi = useAdminQna()
const confirm = useConfirm()
const toast = useToast()

const id = Number(route.params.id)

const qna = ref<Qna | null>(null)
const loading = ref(true)
const answer = ref('')
const saving = ref(false)

const load = async () => {
  loading.value = true
  try {
    qna.value = await qnaApi.detail(id)
    answer.value = qna.value?.answer ?? ''
  } finally {
    loading.value = false
  }
}

const submitAnswer = async () => {
  if (!answer.value.trim()) return
  saving.value = true
  try {
    await qnaApi.answer(id, { answer: answer.value })
    await load()
  } finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('Q&A 삭제', {
    description: '이 Q&A 를 삭제합니다.',
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await qnaApi.remove(id)
    toast.success('Q&A 를 삭제했습니다.')
    router.push('/qnas')
  } catch (e) {
    toast.error(e, 'Q&A 삭제 실패')
  }
}

onMounted(load)
useHead({ title: () => `${qna.value?.title ?? 'Q&A'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-3xl">
    <DetailHeader
      :title="qna?.title ?? (loading ? '…' : 'Q&A')"
      :subtitle="qna ? `Q&A ID · ${qna.id}` : null"
      back-to="/qnas"
    >
      <template #actions>
        <StatusBadge
          v-if="qna"
          :label="qna.isAnswered ? '답변완료' : '미답변'"
          :status="qna.isAnswered ? 'ANSWERED' : 'WAITING'"
        />
        <Badge v-if="qna?.isSecret" variant="outline">
          <Icon name="lucide:lock" size="12" class="mr-1" /> 비밀글
        </Badge>
        <Button variant="outline" size="sm" class="text-destructive" @click="remove">
          <Icon name="lucide:trash-2" size="14" class="mr-1" /> 삭제
        </Button>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <div v-else-if="qna" class="space-y-6">
      <DetailSection title="질문">
        <DetailField label="작성일" :value="formatDate(qna.createdAt)" />
        <DetailField label="비밀글" :value="qna.isSecret ? '예' : '아니오'" />
        <DetailField label="질문" full>
          <div class="whitespace-pre-wrap">{{ qna.question }}</div>
        </DetailField>
      </DetailSection>

      <DetailSection
        title="답변"
        :description="qna.answeredAt ? `답변일시 · ${formatDate(qna.answeredAt)}` : '미답변'"
      >
        <div class="col-span-2 space-y-3">
          <Textarea
            v-model="answer"
            rows="6"
            placeholder="답변을 작성하세요."
          />
          <div class="flex justify-end">
            <Button :disabled="!answer.trim() || saving" @click="submitAnswer">
              <Icon name="lucide:send" size="14" class="mr-1" />
              {{ qna.isAnswered ? '답변 수정' : '답변 등록' }}
            </Button>
          </div>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">Q&A 를 찾을 수 없습니다.</div>
  </div>
</template>
