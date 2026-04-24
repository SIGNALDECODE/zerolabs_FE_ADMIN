<script setup lang="ts">
import { formatDate, formatNumber } from '~/utils/format'
import type { NoticeDetail } from '~/types/content'
import type { NoticeType, NoticeStatus } from '~/types/common'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const noticeApi = useAdminNotice()
const toast = useToast()
const confirm = useConfirm()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const notice = ref<NoticeDetail | null>(null)
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const snapshot = ref<string>('')
const captureSnapshot = () => { snapshot.value = JSON.stringify(form) }

const form = reactive<{
  type: NoticeType
  title: string
  content: string
  isPinned: boolean
  status: NoticeStatus
}>({
  type: 'NOTICE',
  title: '',
  content: '',
  isPinned: false,
  status: 'ACTIVE'
})

const typeLabels: Record<string, string> = {
  NOTICE: '공지사항', INSPECTION: '점검', GUIDELINES: '안내', EVENT: '이벤트'
}

const statusLabels: Record<string, string> = {
  ACTIVE: '노출', INACTIVE: '비노출',
  PUBLISHED: '게시', DRAFT: '임시저장', HIDDEN: '숨김'
}

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    notice.value = await noticeApi.detail(id)
    Object.assign(form, {
      type: notice.value?.type ?? 'NOTICE',
      title: notice.value?.title ?? '',
      content: notice.value?.content ?? '',
      isPinned: notice.value?.isPinned ?? false,
      status: notice.value?.status ?? 'ACTIVE'
    })
    captureSnapshot()
  } finally { loading.value = false }
}

useFormDirty(
  () => snapshot.value,
  () => JSON.stringify(form),
  () => editing.value
)

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/notices')
  editing.value = false
  Object.assign(form, {
    type: notice.value?.type ?? 'NOTICE',
    title: notice.value?.title ?? '',
    content: notice.value?.content ?? '',
    isPinned: notice.value?.isPinned ?? false,
    status: notice.value?.status ?? 'ACTIVE'
  })
}

const submit = async () => {
  if (!form.title.trim() || !form.content.trim()) {
    toast.error('제목과 내용은 필수입니다.')
    return
  }
  saving.value = true
  try {
    if (isNew) {
      const res = await noticeApi.create({ ...form })
      toast.success('공지를 등록했습니다.')
      captureSnapshot()
      router.push(`/notices/${res.id}`)
    } else {
      await noticeApi.update(id, { ...form })
      toast.success('공지를 수정했습니다.')
      editing.value = false
      await load()
    }
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('공지 삭제', {
    description: `"${notice.value?.title}"을(를) 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await noticeApi.remove(id)
    toast.success('공지를 삭제했습니다.')
    router.push('/notices')
  } catch (e) {
    toast.error(e, '공지 삭제 실패')
  }
}

onMounted(load)
if (isNew) captureSnapshot()
useHead({ title: () => isNew ? '새 공지 작성 | ZeroLabs Admin' : `${notice.value?.title ?? '공지'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-3xl">
    <DetailHeader
      icon="lucide:megaphone"
      :title="isNew ? '새 공지 작성' : (notice?.title ?? (loading ? '…' : '공지'))"
      :subtitle="isNew ? null : (notice ? `공지 ID · ${notice.id}` : null)"
      back-to="/notices"
      back-label="공지 목록으로"
    >
      <template #actions>
        <template v-if="!editing && notice">
          <Badge v-if="notice?.isPinned" variant="outline">
            <Icon name="lucide:pin" size="12" class="mr-1" /> 고정
          </Badge>
          <StatusBadge :status="notice.status" />
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

    <!-- 편집/신규 폼 -->
    <Card v-else-if="editing">
      <CardContent class="pt-6 space-y-5">
        <div>
          <Label class="mb-1.5 block">카테고리 <span class="text-destructive">*</span></Label>
          <Select v-model="form.type">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="(label, code) in typeLabels" :key="code" :value="String(code)">{{ label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="mb-1.5 block">제목 <span class="text-destructive">*</span></Label>
          <Input v-model="form.title" placeholder="제목을 입력하세요" maxlength="200" />
          <p class="mt-1 text-xs text-muted-foreground">{{ form.title.length }} / 200</p>
        </div>

        <div>
          <Label class="mb-1.5 block">내용 <span class="text-destructive">*</span></Label>
          <RichTextEditor
            v-model="form.content"
            placeholder="공지 내용을 입력하세요."
            min-height="320px"
          />
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
          <div class="flex items-end">
            <label class="inline-flex items-center gap-2 h-10 cursor-pointer">
              <input v-model="form.isPinned" type="checkbox" class="h-4 w-4" />
              <span class="text-sm">상단 고정</span>
            </label>
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

    <!-- 조회 모드 -->
    <div v-else-if="notice" class="space-y-6">
      <DetailSection title="공지 정보">
        <DetailField label="제목" :value="notice.title" full />
        <DetailField label="유형" :value="typeLabels[notice.type] ?? notice.typeDescription ?? notice.type" />
        <DetailField label="상태" :value="statusLabels[notice.status] ?? notice.status" />
        <DetailField label="상단 고정" :value="notice.isPinned ? '예' : '아니오'" />
        <DetailField label="조회수" :value="formatNumber(notice.viewCount)" />
        <DetailField label="등록일" :value="formatDate(notice.createdAt)" full />
      </DetailSection>

      <DetailSection title="본문">
        <div class="col-span-2 prose prose-sm max-w-none text-sm whitespace-pre-wrap" v-html="notice.content" />
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">공지를 찾을 수 없습니다.</div>
  </div>
</template>
