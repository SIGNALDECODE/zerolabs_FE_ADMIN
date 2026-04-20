<script setup lang="ts">
import { formatDate } from '~/utils/format'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const bannerApi = useAdminBanner()
const toast = useToast()
const confirm = useConfirm()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const banner = ref<any>(null)
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const form = reactive<any>({
  title: '',
  position: 'HERO',
  imageUrl: '',
  linkUrl: '',
  sortOrder: 1,
  status: 'INACTIVE',
  startedAt: '',
  endedAt: '',
  noEndDate: false
})

const resetForm = () => {
  const b = banner.value
  if (!b) return
  Object.assign(form, {
    title: b.title ?? '',
    position: b.position ?? 'HERO',
    imageUrl: b.imageUrl ?? '',
    linkUrl: b.linkUrl ?? '',
    sortOrder: b.sortOrder ?? 1,
    status: b.status ?? 'INACTIVE',
    startedAt: b.startedAt?.slice(0, 16) ?? '',
    endedAt: b.endedAt?.slice(0, 16) ?? '',
    noEndDate: b.noEndDate ?? false
  })
}

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    banner.value = await bannerApi.detail(id)
    resetForm()
  } finally { loading.value = false }
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/banners')
  editing.value = false
  resetForm()
}

const buildBody = () => ({
  title: form.title,
  position: form.position,
  imageUrl: form.imageUrl,
  linkUrl: form.linkUrl || undefined,
  sortOrder: Number(form.sortOrder) || 0,
  status: form.status,
  startedAt: form.startedAt ? `${form.startedAt}:00` : undefined,
  endedAt: form.noEndDate ? undefined : (form.endedAt ? `${form.endedAt}:00` : undefined),
  noEndDate: form.noEndDate
})

const submit = async () => {
  if (!form.title.trim()) return toast.error('제목은 필수입니다.')
  if (!form.imageUrl.trim()) return toast.error('이미지 URL 은 필수입니다.')
  saving.value = true
  try {
    if (isNew) {
      const res: any = await bannerApi.create(buildBody())
      const newId = typeof res === 'object' ? (res.id ?? res) : res
      toast.success('배너를 등록했습니다.')
      router.push(`/banners/${newId}`)
    } else {
      await bannerApi.update(id, buildBody())
      toast.success('배너를 수정했습니다.')
      editing.value = false
      await load()
    }
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('배너 삭제', {
    description: `"${banner.value?.title}"을(를) 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  await bannerApi.remove(id)
  router.push('/banners')
}

onMounted(load)
useHead({ title: () => isNew ? '새 배너 등록 | ZeroLabs Admin' : `${banner.value?.title ?? '배너'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-3xl">
    <DetailHeader
      :title="isNew ? '새 배너 등록' : (banner?.title ?? (loading ? '…' : '배너'))"
      :subtitle="isNew ? null : (banner ? `배너 ID · ${banner.id}` : null)"
      back-to="/banners"
    >
      <template #actions>
        <template v-if="!editing && banner">
          <StatusBadge :status="banner.status" />
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
          <Input v-model="form.title" placeholder="예: 봄 신상 메인 배너" maxlength="100" />
        </div>

        <div>
          <Label class="mb-1.5 block">이미지 URL <span class="text-destructive">*</span></Label>
          <Input v-model="form.imageUrl" placeholder="https://cdn.example.com/banner.jpg" maxlength="500" />
          <div v-if="form.imageUrl" class="mt-3">
            <p class="text-xs text-muted-foreground mb-1">미리보기</p>
            <img
              :src="form.imageUrl"
              class="max-h-40 rounded border"
              @error="($event.target as HTMLImageElement).style.display='none'"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">위치 <span class="text-destructive">*</span></Label>
            <select v-model="form.position" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="HERO">HERO (메인 대형)</option>
              <option value="SLIDE">SLIDE (슬라이드)</option>
              <option value="HALF">HALF (절반)</option>
              <option value="FULL">FULL (전체폭)</option>
            </select>
          </div>
          <div>
            <Label class="mb-1.5 block">정렬 순서</Label>
            <Input v-model="form.sortOrder" type="number" step="1" />
          </div>
        </div>

        <div>
          <Label class="mb-1.5 block">연결 링크 URL</Label>
          <Input v-model="form.linkUrl" placeholder="https://... (선택)" maxlength="500" />
        </div>

        <div>
          <Label class="mb-1.5 block">상태</Label>
          <select v-model="form.status" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="INACTIVE">비활성</option>
            <option value="ACTIVE">노출중</option>
            <option value="SCHEDULED">예약</option>
          </select>
        </div>

        <div>
          <Label class="mb-1.5 block">시작일시</Label>
          <Input v-model="form.startedAt" type="datetime-local" />
        </div>

        <div class="flex items-center gap-3">
          <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="form.noEndDate" type="checkbox" class="h-4 w-4" />
            상시 노출 (종료일 없음)
          </label>
        </div>

        <div v-if="!form.noEndDate">
          <Label class="mb-1.5 block">종료일시</Label>
          <Input v-model="form.endedAt" type="datetime-local" />
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

    <div v-else-if="banner" class="space-y-6">
      <Card v-if="banner.imageUrl">
        <CardContent class="p-4">
          <img :src="banner.imageUrl" class="w-full rounded border" />
        </CardContent>
      </Card>

      <DetailSection title="배너 정보">
        <DetailField label="제목" :value="banner.title" full />
        <DetailField label="위치" :value="banner.position" />
        <DetailField label="정렬 순서" :value="banner.sortOrder" />
        <DetailField label="상태" :value="banner.status" />
        <DetailField label="무기한 노출" :value="banner.noEndDate ? '예' : '아니오'" />
        <DetailField label="시작일시" :value="formatDate(banner.startedAt)" />
        <DetailField label="종료일시" :value="banner.noEndDate ? '상시' : formatDate(banner.endedAt)" />
        <DetailField label="링크 URL" full>
          <a v-if="banner.linkUrl" :href="banner.linkUrl" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-mono text-xs">
            {{ banner.linkUrl }}
          </a>
          <span v-else>-</span>
        </DetailField>
        <DetailField label="등록일" :value="formatDate(banner.createdAt)" />
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">배너를 찾을 수 없습니다.</div>
  </div>
</template>
