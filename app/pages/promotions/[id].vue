<script setup lang="ts">
import { formatCurrency, formatDate, toKoreanCurrency } from '~/utils/format'
import type { Promotion, PromotionFormState } from '~/types/marketing'
import type { CategoryNode } from '~/types/content'
import type { PromotionCreateBody } from '~/composables/useAdminPromotion'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const promotionApi = useAdminPromotion()
const categoryApi = useAdminCategory()
const toast = useToast()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const promotion = ref<Promotion | null>(null)
const categories = ref<CategoryNode[]>([])
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const snapshot = ref<string>('')
const captureSnapshot = () => { snapshot.value = JSON.stringify(form) }

const form = reactive<PromotionFormState>({
  isActive: true,
  name: '',
  discountType: 'RATE',
  discountValue: undefined,
  applicableCategories: [],
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
    discountValue: p.discountValue ?? undefined,
    applicableCategories: p.applicableCategories ?? [],
    startedAt: p.startedAt?.slice(0, 16) ?? '',
    endedAt: p.endedAt?.slice(0, 16) ?? ''
  } satisfies PromotionFormState)
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
    promotion.value = await promotionApi.detail(id)
    resetForm()
  } finally { loading.value = false }
}

const loadCategories = async () => {
  try { categories.value = await categoryApi.list() } catch { categories.value = [] }
}

const flatCategories = computed(() => {
  const out: { id: number, name: string, depth: number }[] = []
  const walk = (list: CategoryNode[] | undefined, depth: number) => {
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

const categoryName = (id: number): string =>
  flatCategories.value.find(c => c.id === id)?.name ?? `#${id}`

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/promotions')
  editing.value = false
  resetForm()
}

/** submit 에서 name/discountValue/startedAt validation 후 호출. */
const buildBody = (): PromotionCreateBody => ({
  isActive: form.isActive,
  name: form.name,
  discountType: form.discountType,
  discountValue: Number(form.discountValue ?? 0),
  applicableCategories: form.applicableCategories.length ? form.applicableCategories : undefined,
  startedAt: `${form.startedAt}:00`,
  endedAt: form.endedAt ? `${form.endedAt}:00` : undefined
})

const submit = async () => {
  if (!form.name.trim()) return toast.error('할인명은 필수입니다.')
  if (form.discountValue == null || Number(form.discountValue) <= 0) return toast.error('할인값은 0보다 커야 합니다.')
  if (!form.startedAt) return toast.error('시작일시는 필수입니다.')
  saving.value = true
  try {
    if (isNew) {
      const res = await promotionApi.create(buildBody())
      toast.success('프로모션을 등록했습니다.')
      captureSnapshot()
      router.push(`/promotions/${res.id}`)
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
if (isNew) captureSnapshot()
useHead({ title: () => isNew ? '새 프로모션 | ZeroLabs Admin' : `${promotion.value?.name ?? '프로모션'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-3xl">
    <DetailHeader
      icon="lucide:percent"
      :title="isNew ? '새 프로모션 등록' : (promotion?.name ?? (loading ? '…' : '프로모션'))"
      :subtitle="isNew ? null : (promotion ? `프로모션 ID · ${promotion.id}` : null)"
      back-to="/promotions"
      back-label="프로모션 목록으로"
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
            <Select v-model="form.discountType">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RATE">정률 (%)</SelectItem>
                <SelectItem value="AMOUNT">정액 (원)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label class="mb-1.5 flex items-center gap-2 flex-wrap">
              <span>
                할인값 <span class="text-destructive">*</span>
                <span class="text-xs text-muted-foreground ml-1">({{ form.discountType === 'RATE' ? '%' : '원' }})</span>
              </span>
              <span
                v-if="form.discountType === 'AMOUNT' && toKoreanCurrency(form.discountValue)"
                class="text-xs font-normal text-primary"
              >
                ≈ {{ toKoreanCurrency(form.discountValue) }}
              </span>
            </Label>
            <CurrencyInput
              v-if="form.discountType === 'AMOUNT'"
              v-model="form.discountValue"
              placeholder="예: 5,000"
            />
            <Input
              v-else
              v-model="form.discountValue"
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="예: 10"
            />
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
        <DetailField label="할인 방식" :value="promotion.discountType === 'RATE' ? '정률' : '정액'" />
        <DetailField label="할인값" :value="discountText" />
        <DetailField label="시작일시" :value="formatDate(promotion.startedAt)" />
        <DetailField label="종료일시" :value="promotion.endedAt ? formatDate(promotion.endedAt) : '상시'" />
        <DetailField label="활성화" :value="promotion.isActive ? '활성' : '비활성'" />
      </DetailSection>

      <DetailSection v-if="promotion.applicableCategories?.length" title="적용 대상">
        <div class="col-span-2 flex flex-wrap gap-1">
          <Badge v-for="catId in promotion.applicableCategories" :key="catId" variant="secondary">
            {{ categoryName(catId) }}
          </Badge>
        </div>
      </DetailSection>
      <DetailSection v-else title="적용 대상">
        <div class="col-span-2 text-sm text-muted-foreground">전체 상품</div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">프로모션을 찾을 수 없습니다.</div>
  </div>
</template>
