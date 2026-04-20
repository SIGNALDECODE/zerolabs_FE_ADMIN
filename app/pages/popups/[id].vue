<script setup lang="ts">
import { formatDate } from '~/utils/format'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const popupApi = useAdminPopup()
const toast = useToast()
const confirm = useConfirm()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const popup = ref<any>(null)
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const form = reactive<any>({
  name: '',
  status: 'INACTIVE',
  image: '',
  linkUrl: '',
  linkTarget: '_self',
  closeOption: 'TODAY',
  popupType: 'CENTER',
  sortOrder: 0,
  startedAt: '',
  endedAt: ''
})

const resetForm = () => {
  const p = popup.value
  if (!p) return
  Object.assign(form, {
    name: p.name ?? '',
    status: p.status ?? 'INACTIVE',
    image: p.image ?? '',
    linkUrl: p.linkUrl ?? '',
    linkTarget: p.linkTarget ?? '_self',
    closeOption: p.closeOption ?? 'TODAY',
    popupType: p.popupType ?? 'CENTER',
    sortOrder: p.sortOrder ?? 0,
    startedAt: p.startedAt?.slice(0, 16) ?? '',
    endedAt: p.endedAt?.slice(0, 16) ?? ''
  })
}

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    popup.value = await popupApi.detail(id)
    resetForm()
  } finally { loading.value = false }
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/popups')
  editing.value = false
  resetForm()
}

const buildBody = () => ({
  name: form.name,
  status: form.status,
  image: form.image || undefined,
  linkUrl: form.linkUrl || undefined,
  linkTarget: form.linkTarget,
  closeOption: form.closeOption,
  popupType: form.popupType,
  sortOrder: Number(form.sortOrder) || 0,
  startedAt: form.startedAt ? `${form.startedAt}:00` : undefined,
  endedAt: form.endedAt ? `${form.endedAt}:00` : undefined
})

const submit = async () => {
  if (!form.name.trim()) return toast.error('팝업명은 필수입니다.')
  saving.value = true
  try {
    if (isNew) {
      const res: any = await popupApi.create(buildBody())
      const newId = typeof res === 'object' ? (res.id ?? res) : res
      toast.success('팝업을 등록했습니다.')
      router.push(`/popups/${newId}`)
    } else {
      await popupApi.update(id, buildBody())
      toast.success('팝업을 수정했습니다.')
      editing.value = false
      await load()
    }
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('팝업 삭제', {
    description: `"${popup.value?.name}"을(를) 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  await popupApi.remove(id)
  router.push('/popups')
}

onMounted(load)
useHead({ title: () => isNew ? '새 팝업 등록 | ZeroLabs Admin' : `${popup.value?.name ?? '팝업'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-3xl">
    <DetailHeader
      :title="isNew ? '새 팝업 등록' : (popup?.name ?? (loading ? '…' : '팝업'))"
      :subtitle="isNew ? null : (popup ? `팝업 ID · ${popup.id}` : null)"
      back-to="/popups"
    >
      <template #actions>
        <template v-if="!editing && popup">
          <StatusBadge :status="popup.status" />
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
          <Label class="mb-1.5 block">팝업명 <span class="text-destructive">*</span></Label>
          <Input v-model="form.name" placeholder="예: 봄 시즌 이벤트 팝업" maxlength="100" />
        </div>

        <div>
          <Label class="mb-1.5 block">이미지 URL</Label>
          <Input v-model="form.image" placeholder="https://cdn.example.com/popup.jpg" maxlength="500" />
          <div v-if="form.image" class="mt-3">
            <p class="text-xs text-muted-foreground mb-1">미리보기</p>
            <img
              :src="form.image"
              class="max-h-40 rounded border"
              @error="($event.target as HTMLImageElement).style.display='none'"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">타입</Label>
            <select v-model="form.popupType" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="CENTER">CENTER (중앙 모달)</option>
              <option value="FLOATING">FLOATING (플로팅)</option>
            </select>
          </div>
          <div>
            <Label class="mb-1.5 block">정렬 순서</Label>
            <Input v-model="form.sortOrder" type="number" step="1" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">닫기 옵션</Label>
            <select v-model="form.closeOption" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="CLOSE">항상 닫기 (X 버튼)</option>
              <option value="TODAY">오늘 다시 보지 않기</option>
              <option value="WEEK">7일간 보지 않기</option>
            </select>
          </div>
          <div>
            <Label class="mb-1.5 block">링크 타겟</Label>
            <select v-model="form.linkTarget" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="_self">현재 창 (_self)</option>
              <option value="_blank">새 창 (_blank)</option>
            </select>
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
            <option value="ACTIVE">활성</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">시작일시</Label>
            <Input v-model="form.startedAt" type="datetime-local" />
          </div>
          <div>
            <Label class="mb-1.5 block">종료일시</Label>
            <Input v-model="form.endedAt" type="datetime-local" />
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

    <div v-else-if="popup" class="space-y-6">
      <Card v-if="popup.image">
        <CardContent class="p-4 flex justify-center">
          <img :src="popup.image" class="max-w-md rounded border" />
        </CardContent>
      </Card>

      <DetailSection title="팝업 정보">
        <DetailField label="팝업명" :value="popup.name" full />
        <DetailField label="타입" :value="popup.popupType" />
        <DetailField label="정렬 순서" :value="popup.sortOrder" />
        <DetailField label="상태" :value="popup.status" />
        <DetailField label="닫기 옵션" :value="popup.closeOption" />
        <DetailField label="링크 타겟" :value="popup.linkTarget" />
        <DetailField label="시작일시" :value="formatDate(popup.startedAt)" />
        <DetailField label="종료일시" :value="formatDate(popup.endedAt)" />
        <DetailField label="링크 URL" full>
          <a v-if="popup.linkUrl" :href="popup.linkUrl" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-mono text-xs">
            {{ popup.linkUrl }}
          </a>
          <span v-else>-</span>
        </DetailField>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">팝업을 찾을 수 없습니다.</div>
  </div>
</template>
