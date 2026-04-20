<script setup lang="ts">
import { formatCurrency, formatDate } from '~/utils/format'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const promotionApi = useAdminPromotion()
const categoryApi = useAdminCategory()
const toast = useToast()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const promotion = ref<any>(null)
const categories = ref<any[]>([])
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const form = reactive<any>({
  isActive: true,
  name: '',
  discountType: 'RATE',
  discountValue: null,
  applicableCategories: [] as number[],
  startedAt: '',
  endedAt: ''
})

const resetForm = () => {
  const p = promotion.value
  if (!p) return
  Object.assign(form, {
    isActive: p.isActive ?? true,
    name: p.name ?? '',
    discountType: p.discountType ?? 'RATE',
    discountValue: p.discountValue ?? null,
    applicableCategories: (p.applicableCategories ?? p.categories?.map((c: any) => c.id) ?? []) as number[],
    startedAt: p.startedAt?.slice(0, 16) ?? '',
    endedAt: p.endedAt?.slice(0, 16) ?? ''
  })
}

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    promotion.value = await promotionApi.detail(id)
    resetForm()
  } finally { loading.value = false }
}

const loadCategories = async () => {
  try { categories.value = (await categoryApi.list()) as any[] } catch { categories.value = [] }
}

const flatCategories = computed(() => {
  const out: { id: number, name: string, depth: number }[] = []
  const walk = (list: any[], depth: number) => {
    for (const c of list ?? []) {
      out.push({ id: c.id, name: c.name, depth })
      if (c.children?.length) walk(c.children, depth + 1)
    }
  }
  walk(categories.value, 0)
  return out
})

const toggleCategory = (id: number) => {
  const i = form.applicableCategories.indexOf(id)
  if (i >= 0) form.applicableCategories.splice(i, 1)
  else form.applicableCategories.push(id)
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/promotions')
  editing.value = false
  resetForm()
}

const buildBody = () => ({
  isActive: form.isActive,
  name: form.name,
  discountType: form.discountType,
  discountValue: Number(form.discountValue),
  applicableCategories: form.applicableCategories.length ? form.applicableCategories : undefined,
  startedAt: form.startedAt ? `${form.startedAt}:00` : undefined,
  endedAt: form.endedAt ? `${form.endedAt}:00` : undefined
})

const submit = async () => {
  if (!form.name.trim()) return toast.error('할인명은 필수입니다.')
  if (form.discountValue == null || form.discountValue <= 0) return toast.error('할인값은 0보다 커야 합니다.')
  if (!form.startedAt) return toast.error('시작일시는 필수입니다.')
  saving.value = true
  try {
    if (isNew) {
      const res: any = await promotionApi.create(buildBody())
      const newId = typeof res === 'object' ? (res.id ?? res) : res
      toast.success('프로모션을 등록했습니다.')
      router.push(`/promotions/${newId}`)
    } else {
      await promotionApi.update(id, buildBody())
      toast.success('프로모션을 수정했습니다.')
      editing.value = false
      await load()
    }
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const discountText = computed(() => {
  const p = promotion.value
  if (!p) return '-'
  return p.discountType === 'RATE' ? `${p.discountValue}%` : formatCurrency(p.discountValue)
})

onMounted(() => { load(); loadCategories() })
useHead({ title: () => isNew ? '새 프로모션 | ZeroLabs Admin' : `${promotion.value?.name ?? '프로모션'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-3xl">
    <DetailHeader
      :title="isNew ? '새 프로모션 등록' : (promotion?.name ?? (loading ? '…' : '프로모션'))"
      :subtitle="isNew ? null : (promotion ? `프로모션 ID · ${promotion.id}` : null)"
      back-to="/promotions"
    >
      <template #actions>
        <template v-if="!editing && promotion">
          <StatusBadge :status="promotion.status" />
          <Button variant="outline" size="sm" @click="startEdit">
            <Icon name="lucide:pencil" size="14" class="mr-1" /> 수정
          </Button>
        </template>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <Card v-else-if="editing">
      <CardContent class="pt-6 space-y-5">
        <div>
          <Label class="mb-1.5 block">할인명 <span class="text-destructive">*</span></Label>
          <Input v-model="form.name" placeholder="예: 봄 세일 10%" maxlength="100" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">할인 방식 <span class="text-destructive">*</span></Label>
            <select v-model="form.discountType" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="RATE">정률 (%)</option>
              <option value="AMOUNT">정액 (원)</option>
            </select>
          </div>
          <div>
            <Label class="mb-1.5 block">
              할인값 <span class="text-destructive">*</span>
              <span class="text-xs text-muted-foreground ml-1">({{ form.discountType === 'RATE' ? '%' : '원' }})</span>
            </Label>
            <Input v-model="form.discountValue" type="number" :step="form.discountType === 'RATE' ? 1 : 100" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">시작일시 <span class="text-destructive">*</span></Label>
            <Input v-model="form.startedAt" type="datetime-local" />
          </div>
          <div>
            <Label class="mb-1.5 block">종료일시</Label>
            <Input v-model="form.endedAt" type="datetime-local" />
          </div>
        </div>

        <div>
          <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4" />
            활성화
          </label>
        </div>

        <div>
          <Label class="mb-1.5 block">적용 카테고리</Label>
          <p class="mb-2 text-xs text-muted-foreground">비워두면 전체 상품에 적용됩니다.</p>
          <div class="max-h-56 overflow-y-auto rounded-md border">
            <div v-if="!flatCategories.length" class="p-4 text-center text-sm text-muted-foreground">
              카테고리 없음
            </div>
            <label
              v-for="c in flatCategories"
              :key="c.id"
              class="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
              :style="{ paddingLeft: `${c.depth * 16 + 12}px` }"
            >
              <input
                type="checkbox"
                :checked="form.applicableCategories.includes(c.id)"
                class="h-4 w-4"
                @change="toggleCategory(c.id)"
              />
              {{ c.name }}
              <span class="text-xs text-muted-foreground">#{{ c.id }}</span>
            </label>
          </div>
          <p v-if="form.applicableCategories.length" class="mt-1 text-xs text-muted-foreground">
            {{ form.applicableCategories.length }}개 선택됨
          </p>
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

    <div v-else-if="promotion" class="space-y-6">
      <DetailSection title="프로모션 정보">
        <DetailField label="할인명" :value="promotion.name" full />
        <DetailField label="설명" :value="promotion.description" full />
        <DetailField label="할인 방식" :value="promotion.discountType === 'RATE' ? '정률' : '정액'" />
        <DetailField label="할인값" :value="discountText" />
        <DetailField label="시작일시" :value="formatDate(promotion.startedAt)" />
        <DetailField label="종료일시" :value="formatDate(promotion.endedAt)" />
        <DetailField label="상태" :value="promotion.status" />
        <DetailField label="활성화" :value="promotion.isActive ? '활성' : '비활성'" />
      </DetailSection>

      <DetailSection v-if="promotion.categories?.length || promotion.applicableCategories?.length" title="적용 대상">
        <div class="col-span-2 flex flex-wrap gap-1">
          <Badge v-for="c in (promotion.categories ?? promotion.applicableCategories)" :key="c.id ?? c" variant="secondary">
            {{ c.name ?? `#${c}` }}
          </Badge>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">프로모션을 찾을 수 없습니다.</div>
  </div>
</template>
