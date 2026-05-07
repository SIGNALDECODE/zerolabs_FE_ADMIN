<script setup lang="ts">
import { formatDate, formatNumber } from '~/utils/format'
import { isImageUrl, IMAGE_URL_MESSAGE } from '~/utils/validation'
import type { EventDetail } from '~/types/content'
import type { EventStatus } from '~/types/common'
import type { CouponListItem } from '~/types/marketing'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const eventApi = useAdminEvent()
const toast = useToast()
const confirm = useConfirm()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const event = ref<EventDetail | null>(null)
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

/** picker 로 선택된 쿠폰 표시명. 상세 진입 시점엔 BE 가 이름을 안 주므로 lazy 조회. */
const linkedCouponName = ref<string>('')
const pickerOpen = ref(false)
const couponApi = useAdminCoupon()

const snapshot = ref<string>('')
const captureSnapshot = () => { snapshot.value = JSON.stringify(form) }

const form = reactive<{
  title: string
  summary: string
  thumbnailUrl: string
  contentHtml: string
  startedAt: string
  endedAt: string
  status: EventStatus
  linkedCouponId: string
}>({
  title: '',
  summary: '',
  thumbnailUrl: '',
  contentHtml: '',
  startedAt: '',
  endedAt: '',
  status: 'ACTIVE',
  linkedCouponId: ''
})

const statusLabels: Record<string, string> = { ACTIVE: '노출', INACTIVE: '비노출' }

const fillForm = (e: EventDetail | null) => {
  Object.assign(form, {
    title: e?.title ?? '',
    summary: e?.summary ?? '',
    thumbnailUrl: e?.thumbnailUrl ?? '',
    contentHtml: e?.contentHtml ?? '',
    startedAt: e?.startedAt?.slice(0, 16) ?? '',
    endedAt: e?.endedAt?.slice(0, 16) ?? '',
    status: e?.status ?? 'ACTIVE',
    linkedCouponId: e?.linkedCouponId != null ? String(e.linkedCouponId) : ''
  })
}

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    event.value = await eventApi.detail(id)
    fillForm(event.value)
    captureSnapshot()
    if (event.value?.linkedCouponId) {
      try {
        const c = await couponApi.detail(event.value.linkedCouponId)
        linkedCouponName.value = c?.name ?? ''
      } catch { linkedCouponName.value = '' }
    } else {
      linkedCouponName.value = ''
    }
  } finally { loading.value = false }
}

const onPickCoupon = (c: CouponListItem) => {
  form.linkedCouponId = String(c.id)
  linkedCouponName.value = c.name
}
const clearLinkedCoupon = () => {
  form.linkedCouponId = ''
  linkedCouponName.value = ''
}

useFormDirty(
  () => snapshot.value,
  () => JSON.stringify(form),
  () => editing.value
)

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/events')
  editing.value = false
  fillForm(event.value)
}

const buildPayload = () => {
  const linked = form.linkedCouponId.trim()
  return {
    title: form.title.trim(),
    summary: form.summary.trim() || undefined,
    thumbnailUrl: form.thumbnailUrl.trim() || undefined,
    contentHtml: form.contentHtml,
    startedAt: form.startedAt ? `${form.startedAt}:00` : undefined,
    endedAt: form.endedAt ? `${form.endedAt}:00` : undefined,
    status: form.status,
    linkedCouponId: linked === '' ? null : Number(linked)
  }
}

const submit = async () => {
  if (!form.title.trim() || !form.contentHtml.trim()) {
    toast.error('제목과 본문은 필수입니다.')
    return
  }
  if (!form.startedAt || !form.endedAt) {
    toast.error('진행기간(시작/종료)은 필수입니다.')
    return
  }
  if (form.startedAt >= form.endedAt) {
    toast.error('시작일은 종료일보다 빨라야 합니다.')
    return
  }
  if (!isImageUrl(form.thumbnailUrl.trim())) {
    toast.error(IMAGE_URL_MESSAGE)
    return
  }
  if (form.linkedCouponId.trim() && Number.isNaN(Number(form.linkedCouponId))) {
    toast.error('연결 쿠폰 ID는 숫자여야 합니다.')
    return
  }
  saving.value = true
  try {
    const payload = buildPayload()
    if (isNew) {
      const res = await eventApi.create({
        title: payload.title,
        summary: payload.summary,
        thumbnailUrl: payload.thumbnailUrl,
        contentHtml: payload.contentHtml,
        startedAt: payload.startedAt!,
        endedAt: payload.endedAt!,
        status: payload.status,
        linkedCouponId: payload.linkedCouponId ?? undefined
      })
      toast.success('이벤트를 등록했습니다.')
      captureSnapshot()
      router.push(`/events/${res.id}`)
    } else {
      await eventApi.update(id, payload)
      toast.success('이벤트를 수정했습니다.')
      editing.value = false
      await load()
    }
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('이벤트 삭제', {
    description: `"${event.value?.title}"을(를) 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await eventApi.remove(id)
    toast.success('이벤트를 삭제했습니다.')
    router.push('/events')
  } catch (e) {
    toast.error(e, '이벤트 삭제 실패')
  }
}

onMounted(load)
if (isNew) captureSnapshot()
useHead({ title: () => isNew ? '새 이벤트 작성 | ZeroLabs Admin' : `${event.value?.title ?? '이벤트'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-3xl">
    <DetailHeader
      icon="lucide:calendar-heart"
      :title="isNew ? '새 이벤트 작성' : (event?.title ?? (loading ? '…' : '이벤트'))"
      :subtitle="isNew ? null : (event ? `이벤트 ID · ${event.id}` : null)"
      back-to="/events"
      back-label="이벤트 목록으로"
    >
      <template #actions>
        <template v-if="!editing && event">
          <StatusBadge :status="event.status" />
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
          <Label class="mb-1.5 block">제목 <span class="text-destructive">*</span></Label>
          <Input v-model="form.title" placeholder="제목을 입력하세요" maxlength="200" />
          <p class="mt-1 text-xs text-muted-foreground">{{ form.title.length }} / 200</p>
        </div>

        <div>
          <Label class="mb-1.5 block">상세설명 (목록 노출용)</Label>
          <Textarea
            v-model="form.summary"
            rows="2"
            maxlength="500"
            placeholder="목록 카드에 노출될 짧은 설명"
          />
          <p class="mt-1 text-xs text-muted-foreground">{{ form.summary.length }} / 500</p>
        </div>

        <div>
          <Label class="mb-1.5 block">썸네일</Label>
          <ImageUploadField v-model="form.thumbnailUrl" preview-class="max-h-48" />
        </div>

        <div>
          <Label class="mb-1.5 block">본문 <span class="text-destructive">*</span></Label>
          <RichTextEditor
            v-model="form.contentHtml"
            placeholder="이벤트 상세 내용을 입력하세요."
            min-height="320px"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">시작일시 <span class="text-destructive">*</span></Label>
            <Input v-model="form.startedAt" type="datetime-local" />
          </div>
          <div>
            <Label class="mb-1.5 block">종료일시 <span class="text-destructive">*</span></Label>
            <Input v-model="form.endedAt" type="datetime-local" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">상태</Label>
            <Select v-model="form.status">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">노출</SelectItem>
                <SelectItem value="INACTIVE">비노출</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label class="mb-1.5 block">연결 쿠폰</Label>
            <div class="flex items-center gap-2">
              <div
                class="flex-1 h-10 px-3 rounded-md border bg-background text-sm flex items-center min-w-0"
              >
                <template v-if="form.linkedCouponId">
                  <span class="truncate">{{ linkedCouponName || `쿠폰 #${form.linkedCouponId}` }}</span>
                  <span class="ml-2 shrink-0 text-[11px] text-muted-foreground">#{{ form.linkedCouponId }}</span>
                </template>
                <span v-else class="text-muted-foreground">선택 안 함</span>
              </div>
              <Button type="button" variant="outline" size="sm" @click="pickerOpen = true">
                <Icon name="lucide:search" size="14" class="mr-1" /> 검색
              </Button>
              <Button
                v-if="form.linkedCouponId"
                type="button"
                variant="ghost"
                size="sm"
                class="text-destructive"
                @click="clearLinkedCoupon"
              >해제</Button>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              비공개(목록 숨김) 쿠폰도 이벤트에 연결되면 다운로드 가능.
            </p>
          </div>
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

    <div v-else-if="event" class="space-y-6">
      <DetailSection title="이벤트 정보">
        <DetailField label="제목" :value="event.title" full />
        <DetailField label="상세설명" :value="event.summary" full />
        <DetailField label="시작일시" :value="formatDate(event.startedAt)" />
        <DetailField label="종료일시" :value="formatDate(event.endedAt)" />
        <DetailField label="상태" :value="statusLabels[event.status] ?? event.status" />
        <DetailField label="조회수" :value="formatNumber(event.viewCount)" />
        <DetailField label="작성자" :value="event.authorName ? `${event.authorName} (#${event.authorId})` : '-'" />
        <DetailField label="연결 쿠폰">
          <span v-if="event.linkedCouponId">
            <span>{{ linkedCouponName || `쿠폰 #${event.linkedCouponId}` }}</span>
            <span class="ml-1 text-xs text-muted-foreground">#{{ event.linkedCouponId }}</span>
            <NuxtLink :to="`/coupons/${event.linkedCouponId}`" class="ml-2 text-xs underline text-primary">상세</NuxtLink>
          </span>
          <span v-else class="text-muted-foreground">없음</span>
        </DetailField>
        <DetailField label="등록일" :value="formatDate(event.createdAt)" />
        <DetailField label="수정일" :value="formatDate(event.updatedAt)" />
      </DetailSection>

      <DetailSection v-if="event.thumbnailUrl" title="썸네일">
        <div class="col-span-2">
          <img :src="event.thumbnailUrl" class="max-h-48 rounded border" />
        </div>
      </DetailSection>

      <DetailSection title="본문">
        <div class="col-span-2 prose prose-sm max-w-none text-sm" v-html="event.contentHtml" />
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">이벤트를 찾을 수 없습니다.</div>

    <CouponPickerDialog v-model:open="pickerOpen" @pick="onPickCoupon" />
  </div>
</template>
