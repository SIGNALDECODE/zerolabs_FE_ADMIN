<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { Review } from '~/types/content'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const reviewApi = useAdminReview()

const id = Number(route.params.id)

const review = ref<Review | null>(null)
const loading = ref(true)
const saving = ref(false)
const replyDraft = ref('')
const editingReply = ref(false)
const submittingReply = ref(false)

const load = async () => {
  loading.value = true
  try {
    review.value = await reviewApi.detail(id)
    replyDraft.value = review.value?.adminReply ?? ''
    editingReply.value = false
  } finally { loading.value = false }
}

const startReplyEdit = () => {
  replyDraft.value = review.value?.adminReply ?? ''
  editingReply.value = true
}
const cancelReplyEdit = () => {
  editingReply.value = false
  replyDraft.value = review.value?.adminReply ?? ''
}

const submitReply = async () => {
  const reply = replyDraft.value.trim()
  if (!reply) {
    toast.error('답글 내용을 입력해주세요.')
    return
  }
  if (reply.length > 2000) {
    toast.error('답글은 2000자 이하로 작성해주세요.')
    return
  }
  submittingReply.value = true
  try {
    await reviewApi.writeReply(id, reply)
    toast.success(review.value?.adminReply ? '답글을 수정했습니다.' : '답글을 등록했습니다.')
    await load()
  } catch (e) {
    toast.error(e, '답글 저장 실패')
  } finally { submittingReply.value = false }
}

const deleteReply = async () => {
  const ok = await confirm.ask('답글을 삭제할까요?', {
    description: '삭제된 답글은 복구할 수 없습니다.',
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  submittingReply.value = true
  try {
    await reviewApi.deleteReply(id)
    toast.success('답글을 삭제했습니다.')
    await load()
  } catch (e) {
    toast.error(e, '답글 삭제 실패')
  } finally { submittingReply.value = false }
}

const confirm = useConfirm()
const toast = useToast()

const toggleVisibility = async () => {
  const willHide = review.value?.isVisible ?? true
  const ok = await confirm.ask(
    willHide ? '이 리뷰를 숨길까요?' : '이 리뷰를 다시 노출할까요?',
    {
      description: willHide
        ? '숨김 처리된 리뷰는 소비자몰에서 보이지 않습니다.'
        : '노출 처리되면 소비자몰에서 다시 보입니다.',
      confirmText: willHide ? '숨기기' : '노출',
      tone: willHide ? 'danger' : undefined
    }
  )
  if (!ok) return
  saving.value = true
  try {
    await reviewApi.toggleVisibility([id])
    toast.success(willHide ? '리뷰를 숨겼습니다.' : '리뷰를 노출합니다.')
    await load()
  } catch (e) {
    toast.error(e, '변경 실패')
  } finally { saving.value = false }
}

onMounted(load)
useHead({ title: () => `리뷰 #${id} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-3xl">
    <DetailHeader
      :title="`리뷰 #${id}`"
      :subtitle="review?.productName ?? null"
      back-to="/reviews"
    >
      <template #actions>
        <StatusBadge
          v-if="review"
          :label="(review.isVisible ?? true) ? '노출' : '숨김'"
          :status="(review.isVisible ?? true) ? 'ACTIVE' : 'INACTIVE'"
        />
        <Button variant="outline" size="sm" :disabled="saving" @click="toggleVisibility">
          <Icon
            :name="(review?.isVisible ?? true) ? 'lucide:eye-off' : 'lucide:eye'"
            size="14"
            class="mr-1"
          />
          {{ (review?.isVisible ?? true) ? '숨기기' : '노출' }}
        </Button>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <div v-else-if="review" class="space-y-6">
      <DetailSection title="리뷰 정보">
        <DetailField label="작성자" :value="`${review.authorName} (#${review.userId})`" />
        <DetailField label="작성일" :value="formatDate(review.createdAt)" />
        <DetailField label="수정일" :value="formatDate(review.updatedAt)" />
        <DetailField label="별점">
          <span class="text-amber-500">{{ '★'.repeat(review.rating ?? 0) }}</span>
          <span class="text-muted-foreground/40">{{ '★'.repeat(5 - (review.rating ?? 0)) }}</span>
          <span class="ml-2 text-sm text-muted-foreground">{{ review.rating }} / 5</span>
        </DetailField>
        <DetailField label="제목" :value="review.title" full />
        <DetailField label="본문" full>
          <div class="whitespace-pre-wrap">{{ review.content }}</div>
        </DetailField>
      </DetailSection>

      <DetailSection title="상품">
        <div class="col-span-2 flex items-center gap-3 p-2">
          <img
            v-if="review.productPrimaryImageUrl"
            :src="review.productPrimaryImageUrl"
            class="h-16 w-16 rounded object-cover border"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">{{ review.productName }}</p>
            <p class="text-xs text-muted-foreground">상품 ID · {{ review.productId }}</p>
          </div>
          <Button variant="outline" size="sm" @click="router.push(`/products/${review.productId}`)">
            <Icon name="lucide:external-link" size="14" class="mr-1" /> 상품 보기
          </Button>
        </div>
      </DetailSection>

      <DetailSection title="어드민 답글" :description="review.adminReply ? `답글 작성일 · ${formatDate(review.adminRepliedAt)}` : '아직 답글이 없습니다.'">
        <div class="col-span-2 space-y-3">
          <template v-if="!editingReply">
            <div
              v-if="review.adminReply"
              class="whitespace-pre-wrap text-sm border rounded-md p-3 bg-muted/40"
            >{{ review.adminReply }}</div>
            <div class="flex gap-2">
              <Button v-if="!review.adminReply" size="sm" @click="startReplyEdit">
                <Icon name="lucide:message-square-plus" size="14" class="mr-1" /> 답글 작성
              </Button>
              <template v-else>
                <Button size="sm" variant="outline" @click="startReplyEdit">
                  <Icon name="lucide:pencil" size="14" class="mr-1" /> 수정
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-destructive hover:text-destructive"
                  :disabled="submittingReply"
                  @click="deleteReply"
                >
                  <Icon name="lucide:trash-2" size="14" class="mr-1" /> 삭제
                </Button>
              </template>
            </div>
          </template>
          <template v-else>
            <Textarea
              v-model="replyDraft"
              rows="4"
              maxlength="2000"
              placeholder="고객에게 보여질 답글을 작성하세요. (최대 2000자)"
            />
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">{{ replyDraft.length }} / 2000</span>
              <div class="ml-auto flex gap-2">
                <Button size="sm" variant="outline" :disabled="submittingReply" @click="cancelReplyEdit">취소</Button>
                <Button size="sm" :disabled="submittingReply" @click="submitReply">
                  <Icon name="lucide:save" size="14" class="mr-1" /> 저장
                </Button>
              </div>
            </div>
          </template>
        </div>
      </DetailSection>

      <DetailSection v-if="review.images?.length" :title="`첨부 이미지 (${review.images.length})`">
        <div class="col-span-2 grid grid-cols-4 gap-2">
          <a
            v-for="(url, i) in review.images"
            :key="i"
            :href="url"
            target="_blank"
            rel="noopener"
          >
            <img :src="url" class="aspect-square rounded object-cover border hover:opacity-80 transition" />
          </a>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">리뷰를 찾을 수 없습니다.</div>
  </div>
</template>
