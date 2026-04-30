<script setup lang="ts">
import { formatDate } from '~/utils/format'
import {
  isImageUrl, isLinkUrl, isHexColor,
  IMAGE_URL_MESSAGE, LINK_URL_MESSAGE, HEX_COLOR_MESSAGE
} from '~/utils/validation'
import type { Banner, BannerFormState } from '~/types/marketing'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const bannerApi = useAdminBanner()
const toast = useToast()
const confirm = useConfirm()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const banner = ref<Banner | null>(null)
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const snapshot = ref<string>('')
const captureSnapshot = () => { snapshot.value = JSON.stringify(form) }

const form = reactive<BannerFormState>({
  title: '',
  position: 'HERO',
  imageUrl: '',
  mobileImageUrl: '',
  linkUrl: '',
  buttonColor: '#FFFFFF',
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
    mobileImageUrl: b.mobileImageUrl ?? '',
    linkUrl: b.linkUrl ?? '',
    buttonColor: b.buttonColor ?? '#FFFFFF',
    sortOrder: b.sortOrder ?? 1,
    status: b.status ?? 'INACTIVE',
    startedAt: b.startedAt?.slice(0, 16) ?? '',
    endedAt: b.endedAt?.slice(0, 16) ?? '',
    noEndDate: b.noEndDate ?? false
  })
  captureSnapshot()
}

useFormDirty(
  () => snapshot.value,
  () => JSON.stringify(form),
  () => editing.value
)

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
  mobileImageUrl: form.mobileImageUrl || undefined,
  linkUrl: form.linkUrl || undefined,
  buttonColor: form.buttonColor || undefined,
  sortOrder: Number(form.sortOrder) || 0,
  status: form.status,
  startedAt: form.startedAt ? `${form.startedAt}:00` : undefined,
  endedAt: form.noEndDate ? undefined : (form.endedAt ? `${form.endedAt}:00` : undefined),
  noEndDate: form.noEndDate
})

const submit = async () => {
  if (!form.title.trim()) return toast.error('제목은 필수입니다.')
  if (!form.imageUrl.trim()) return toast.error('이미지 URL 은 필수입니다.')
  if (!isImageUrl(form.imageUrl)) return toast.error(IMAGE_URL_MESSAGE)
  if (!isImageUrl(form.mobileImageUrl)) return toast.error(`모바일 ${IMAGE_URL_MESSAGE}`)
  if (!isLinkUrl(form.linkUrl)) return toast.error(LINK_URL_MESSAGE)
  if (!isHexColor(form.buttonColor)) return toast.error(HEX_COLOR_MESSAGE)
  saving.value = true
  try {
    if (isNew) {
      const res = await bannerApi.create(buildBody())
      toast.success('배너를 등록했습니다.')
      captureSnapshot()
      router.push(`/banners/${res.id}`)
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
  try {
    await bannerApi.remove(id)
    toast.success('배너를 삭제했습니다.')
    router.push('/banners')
  } catch (e) {
    toast.error(e, '배너 삭제 실패')
  }
}

onMounted(load)
if (isNew) captureSnapshot()
useHead({ title: () => isNew ? '새 배너 등록 | ZeroLabs Admin' : `${banner.value?.title ?? '배너'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-3xl">
    <DetailHeader
      icon="lucide:image"
      :title="isNew ? '새 배너 등록' : (banner?.title ?? (loading ? '…' : '배너'))"
      :subtitle="isNew ? null : (banner ? `배너 ID · ${banner.id}` : null)"
      back-to="/banners"
      back-label="배너 목록으로"
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
          <Label class="mb-1.5 block">PC 이미지 <span class="text-destructive">*</span></Label>
          <div v-if="form.position === 'HERO'" class="mb-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <p class="mb-1 font-medium text-foreground">PC 히어로 배너 권장 사양</p>
            <ul class="space-y-0.5">
              <li>• 권장 크기: <span class="font-medium text-foreground">1920 × 700 px</span> (가로 비율 96:35)</li>
              <li>• 고화질 권장: 2560 × 934 px <span class="text-muted-foreground/80">— QHD 모니터 대응</span></li>
              <li>• 최소 크기: 1440 × 525 px</li>
              <li>• 파일 형식: WebP · JPG · PNG</li>
              <li>• 중요한 텍스트·피사체는 중앙 <span class="font-medium text-foreground">70%</span> 영역에 배치 <span class="text-muted-foreground/80">— 모니터 너비에 따라 좌우가 미세하게 잘릴 수 있습니다.</span></li>
            </ul>
          </div>
          <div v-else-if="form.position === 'HALF'" class="mb-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <p class="mb-1 font-medium text-foreground">PC 하프 배너 권장 사양</p>
            <ul class="space-y-0.5">
              <li>• 권장 크기: <span class="font-medium text-foreground">686 × 272 px</span> (가로 비율 343:136)</li>
              <li>• 고화질 권장: 1372 × 544 px <span class="text-muted-foreground/80">— Retina 대응 2배수</span></li>
              <li>• 파일 형식: WebP · JPG · PNG</li>
              <li>• 중요한 텍스트·피사체는 중앙 <span class="font-medium text-foreground">80%</span> 영역에 배치</li>
            </ul>
          </div>
          <ImageUploadField v-model="form.imageUrl" preview-class="max-h-48 w-full" />
        </div>

        <div>
          <Label class="mb-1.5 block">모바일 이미지</Label>
          <p class="mb-2 text-xs text-muted-foreground">
            미입력 시 PC 이미지를 모바일에서도 그대로 사용합니다.
          </p>
          <div v-if="form.position === 'HERO'" class="mb-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <p class="mb-1 font-medium text-foreground">모바일 히어로 배너 권장 사양</p>
            <ul class="space-y-0.5">
              <li>• 권장 크기: <span class="font-medium text-foreground">750 × 920 px</span> (세로 비율 75:92)</li>
              <li>• 최소 크기: 375 × 460 px</li>
              <li>• 파일 형식: WebP · JPG · PNG</li>
              <li>• 중요한 텍스트·피사체는 중앙 <span class="font-medium text-foreground">60%</span> 영역에 배치 <span class="text-muted-foreground/80">— 기기 화면 비율에 따라 좌우가 미세하게 잘릴 수 있습니다.</span></li>
            </ul>
          </div>
          <div v-else-if="form.position === 'HALF'" class="mb-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <p class="mb-1 font-medium text-foreground">모바일 하프 배너 권장 사양</p>
            <ul class="space-y-0.5">
              <li>• PC 와 동일한 <span class="font-medium text-foreground">686 × 272 px</span> 비율 권장</li>
              <li>• 미입력 시 PC 이미지를 그대로 사용</li>
            </ul>
          </div>
          <ImageUploadField v-model="form.mobileImageUrl" preview-class="max-h-48" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">위치 <span class="text-destructive">*</span></Label>
            <Select v-model="form.position">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HERO">HERO (메인 대형)</SelectItem>
                <SelectItem value="SLIDE">SLIDE (슬라이드 - 아직 미적용)</SelectItem>
                <SelectItem value="HALF">HALF (프로모션 2단 배너)</SelectItem>
                <SelectItem value="FULL">FULL (전체폭 - 아직 미적용)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label class="mb-1.5 block">정렬 순서</Label>
            <Input v-model="form.sortOrder" type="number" step="1" />
          </div>
        </div>

        <div>
          <Label class="mb-1.5 block">연결 링크 URL</Label>
          <Input v-model="form.linkUrl" placeholder="https://... 또는 /promotions/123 (선택)" maxlength="500" />
          <p class="mt-1 text-xs text-muted-foreground">https:// 절대경로 또는 / 로 시작하는 사이트 내부 경로만 허용됩니다.</p>
        </div>

        <div>
          <Label class="mb-1.5 block">CTA 버튼 글자 색상</Label>
          <p class="mb-2 text-xs text-muted-foreground">유저페이지 배너의 CTA 버튼 폰트 색상. 미입력 시 기본값(#FFFFFF) 사용.</p>
          <div class="flex items-center gap-2">
            <input
              type="color"
              :value="form.buttonColor || '#FFFFFF'"
              class="h-9 w-12 cursor-pointer rounded border bg-background p-1"
              @input="form.buttonColor = ($event.target as HTMLInputElement).value.toUpperCase()"
            />
            <Input v-model="form.buttonColor" placeholder="#FFFFFF" maxlength="7" class="font-mono w-32" />
            <span
              class="inline-flex h-9 items-center rounded border px-3 text-sm font-medium"
              :style="{ color: isHexColor(form.buttonColor) ? form.buttonColor : '#000', background: '#1f2937' }"
            >
              미리보기 텍스트
            </span>
          </div>
        </div>

        <div>
          <Label class="mb-1.5 block">상태</Label>
          <Select v-model="form.status">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INACTIVE">비활성</SelectItem>
              <SelectItem value="ACTIVE">노출중</SelectItem>
              <SelectItem value="SCHEDULED">예약</SelectItem>
            </SelectContent>
          </Select>
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
      <div v-if="banner.imageUrl || banner.mobileImageUrl" class="grid gap-4 md:grid-cols-2">
        <Card v-if="banner.imageUrl">
          <CardContent class="p-4">
            <p class="mb-2 text-xs text-muted-foreground">PC</p>
            <img :src="banner.imageUrl" class="w-full rounded border" />
          </CardContent>
        </Card>
        <Card v-if="banner.mobileImageUrl">
          <CardContent class="p-4">
            <p class="mb-2 text-xs text-muted-foreground">모바일</p>
            <img :src="banner.mobileImageUrl" class="w-full rounded border" />
          </CardContent>
        </Card>
      </div>

      <DetailSection title="배너 정보">
        <DetailField label="제목" :value="banner.title" full />
        <DetailField label="위치" :value="banner.position" />
        <DetailField label="정렬 순서" :value="banner.sortOrder" />
        <DetailField label="상태" :value="banner.status" />
        <DetailField label="무기한 노출" :value="banner.noEndDate ? '예' : '아니오'" />
        <DetailField label="시작일시" :value="formatDate(banner.startedAt)" />
        <DetailField label="종료일시" :value="banner.noEndDate ? '상시' : formatDate(banner.endedAt)" />
        <DetailField label="CTA 버튼 색상">
          <div v-if="banner.buttonColor" class="flex items-center gap-2">
            <span class="inline-block h-4 w-4 rounded border" :style="{ background: banner.buttonColor }" />
            <span class="font-mono text-xs">{{ banner.buttonColor }}</span>
          </div>
          <span v-else>-</span>
        </DetailField>
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
