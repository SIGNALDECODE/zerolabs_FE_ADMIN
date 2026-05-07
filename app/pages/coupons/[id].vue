<script setup lang="ts">
import { formatCurrency, formatDate, formatNumber, toKoreanCurrency } from '~/utils/format'
import type { CouponStatus } from '~/types/common'
import type { CouponDetail, CouponFormState } from '~/types/marketing'
import type { CouponCreateBody } from '~/composables/useAdminCoupon'
import type { UserGrade } from '~/types/user'
import type { CategoryNode } from '~/types/content'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const couponApi = useAdminCoupon()
const gradeApi = useAdminGrade()
const categoryApi = useAdminCategory()
const toast = useToast()
const confirm = useConfirm()

const grades = ref<UserGrade[]>([])
const categories = ref<CategoryNode[]>([])

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const coupon = ref<CouponDetail | null>(null)
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const snapshot = ref<string>('')
const captureSnapshot = () => { snapshot.value = JSON.stringify(form) }

const statusLabels: Record<string, string> = {
  REGISTERED: '등록', ACTIVE: '발급중', STOPPED: '발급중지',
  ENDED: '종료', RECALLED: '회수완료'
}

const typeLabels: Record<string, string> = {
  PRODUCT_DISCOUNT: '상품할인', FREE_SHIPPING: '무료배송'
}

const form = reactive<CouponFormState>({
  name: '',
  description: '',
  notice: '',
  couponType: 'PRODUCT_DISCOUNT',
  discountType: 'RATE',
  discountValue: undefined,
  maxDiscountAmount: undefined,
  minOrderAmount: 0,
  totalQuantity: undefined,
  validityType: 'DAYS_FROM_DOWNLOAD',
  validityDays: 30,
  validFrom: '',
  validTo: '',
  allowPromotionOverlap: false,
  allowDuplicateUse: false,
  gradeIds: [],
  categoryIds: []
})

/** 카테고리 트리를 깊이별 들여쓰기 가능하도록 평탄화. (상품 폼과 같은 패턴) */
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

const toggleGrade = (gradeId: number) => {
  const i = form.gradeIds.indexOf(gradeId)
  if (i >= 0) form.gradeIds.splice(i, 1)
  else form.gradeIds.push(gradeId)
}

const toggleCategory = (catId: number) => {
  const i = form.categoryIds.indexOf(catId)
  if (i >= 0) form.categoryIds.splice(i, 1)
  else form.categoryIds.push(catId)
}

const resetForm = () => {
  const c = coupon.value
  if (!c) return
  Object.assign(form, {
    name: c.name ?? '',
    description: c.description ?? '',
    notice: c.notice ?? '',
    couponType: c.couponType ?? 'PRODUCT_DISCOUNT',
    discountType: c.discountType ?? 'RATE',
    discountValue: c.discountValue ?? undefined,
    maxDiscountAmount: c.maxDiscountAmount ?? undefined,
    minOrderAmount: c.minOrderAmount ?? 0,
    totalQuantity: c.totalQuantity ?? undefined,
    validityType: c.validityType ?? 'DAYS_FROM_DOWNLOAD',
    validityDays: c.validityDays ?? 30,
    validFrom: c.validFrom?.slice(0, 16) ?? '',
    validTo: c.validTo?.slice(0, 16) ?? '',
    allowPromotionOverlap: c.allowPromotionOverlap ?? false,
    allowDuplicateUse: c.allowDuplicateUse ?? false,
    gradeIds: c.grades?.map(g => g.id) ?? [],
    categoryIds: c.categories?.map(cat => cat.id) ?? []
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
    coupon.value = await couponApi.detail(id)
    resetForm()
  } finally { loading.value = false }
}

const loadGrades = async () => {
  try { grades.value = (await gradeApi.list())?.grades ?? [] } catch { grades.value = [] }
}

const loadCategories = async () => {
  try { categories.value = await categoryApi.list() } catch { categories.value = [] }
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/coupons')
  editing.value = false
  resetForm()
}

const toNumberOrUndefined = (v: number | string | null | undefined): number | undefined =>
  v != null && v !== '' ? Number(v) : undefined

/** submit 에서 validation 후 호출 — discountValue 는 non-null 로 가정. */
const buildBody = (): CouponCreateBody => {
  const body: CouponCreateBody = {
    name: form.name,
    description: form.description || undefined,
    notice: form.notice || undefined,
    couponType: form.couponType,
    discountType: form.discountType,
    discountValue: Number(form.discountValue ?? 0),
    maxDiscountAmount: toNumberOrUndefined(form.maxDiscountAmount),
    minOrderAmount: Number(form.minOrderAmount) || 0,
    totalQuantity: toNumberOrUndefined(form.totalQuantity),
    validityType: form.validityType,
    allowPromotionOverlap: form.allowPromotionOverlap,
    allowDuplicateUse: form.allowDuplicateUse,
    // 비어있으면 BE 가 "전체"로 해석. 명시적으로 빈 배열 전송해 의도 표현.
    gradeIds: form.gradeIds,
    categoryIds: form.couponType === 'PRODUCT_DISCOUNT' ? form.categoryIds : []
  }
  if (form.validityType === 'DAYS_FROM_DOWNLOAD') {
    body.validityDays = Number(form.validityDays)
  } else {
    body.validFrom = form.validFrom ? `${form.validFrom}:00` : undefined
    body.validTo = form.validTo ? `${form.validTo}:00` : undefined
  }
  return body
}

const submit = async () => {
  if (!form.name.trim()) return toast.error('쿠폰명은 필수입니다.')
  if (form.discountValue == null || form.discountValue === '') return toast.error('할인값은 필수입니다.')
  if (form.validityType === 'FIXED_PERIOD' && (!form.validFrom || !form.validTo)) {
    return toast.error('유효기간 시작/종료를 입력하세요.')
  }
  saving.value = true
  try {
    if (isNew) {
      const res = await couponApi.create(buildBody())
      toast.success('쿠폰을 등록했습니다.')
      captureSnapshot()
      router.push(`/coupons/${res.id}`)
    } else {
      await couponApi.update(id, buildBody())
      toast.success('쿠폰을 수정했습니다.')
      editing.value = false
      await load()
    }
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const toggleVisibility = async () => {
  saving.value = true
  try { await couponApi.toggleVisibility(id); await load() }
  finally { saving.value = false }
}

const changeStatus = async (status: CouponStatus) => {
  const ok = await confirm.ask('쿠폰 상태 변경', {
    description: `상태를 ${statusLabels[status]}로 변경합니다.`,
    confirmText: '변경'
  })
  if (!ok) return
  saving.value = true
  try { await couponApi.updateStatus(id, { status }); await load() }
  finally { saving.value = false }
}

const recall = async () => {
  const ok = await confirm.ask('쿠폰 회수', {
    description: '미사용 쿠폰이 모두 회수됩니다. 이 작업은 되돌릴 수 없습니다.',
    confirmText: '회수',
    tone: 'danger'
  })
  if (!ok) return
  saving.value = true
  try { await couponApi.recall(id); await load() }
  finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('쿠폰 삭제', {
    description: `"${coupon.value?.name}"을(를) 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await couponApi.remove(id)
    toast.success('쿠폰을 삭제했습니다.')
    router.push('/coupons')
  } catch (e) {
    toast.error(e, '쿠폰 삭제 실패')
  }
}

const discountText = computed(() => {
  const c = coupon.value
  if (!c) return '-'
  return c.discountType === 'RATE'
    ? `${c.discountValue}% 할인${c.maxDiscountAmount ? ` (최대 ${formatCurrency(c.maxDiscountAmount)})` : ''}`
    : `${formatCurrency(c.discountValue)} 할인`
})

const validityText = computed(() => {
  const c = coupon.value
  if (!c) return '-'
  if (c.validityType === 'DAYS_FROM_DOWNLOAD') return `다운로드 후 ${c.validityDays}일`
  return `${formatDate(c.validFrom)} ~ ${formatDate(c.validTo)}`
})

onMounted(() => { load(); loadGrades(); loadCategories() })
if (isNew) captureSnapshot()
useHead({ title: () => isNew ? '새 쿠폰 등록 | ZeroLabs Admin' : `${coupon.value?.name ?? '쿠폰'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-4xl">
    <DetailHeader
      icon="lucide:ticket"
      :title="isNew ? '새 쿠폰 등록' : (coupon?.name ?? (loading ? '…' : '쿠폰'))"
      :subtitle="isNew ? null : (coupon ? `쿠폰 ID · ${coupon.id}` : null)"
      back-to="/coupons"
      back-label="쿠폰 목록으로"
    >
      <template #actions>
        <template v-if="!editing && coupon">
          <StatusBadge :label="statusLabels[coupon.status] ?? coupon.status" :status="coupon.status" />
          <Button variant="outline" size="sm" @click="startEdit">
            <Icon name="lucide:pencil" size="14" class="mr-1" /> 수정
          </Button>
        </template>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <!-- 폼 -->
    <Card v-else-if="editing">
      <CardContent class="pt-6 space-y-5">
        <div>
          <Label class="mb-1.5 block">쿠폰명 <span class="text-destructive">*</span></Label>
          <Input v-model="form.name" placeholder="예: 신규회원 10% 할인" maxlength="100" />
        </div>

        <div>
          <Label class="mb-1.5 block">설명</Label>
          <Textarea v-model="form.description" rows="2" placeholder="고객에게 보이는 설명 (선택)" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">쿠폰 타입 <span class="text-destructive">*</span></Label>
            <Select v-model="form.couponType">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRODUCT_DISCOUNT">상품할인</SelectItem>
                <SelectItem value="FREE_SHIPPING">무료배송</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div v-if="form.discountType === 'RATE'">
            <Label class="mb-1.5 flex items-center gap-2 flex-wrap">
              <span>최대 할인 한도 <span class="text-xs text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.maxDiscountAmount)" class="text-xs font-normal text-primary">
                ≈ {{ toKoreanCurrency(form.maxDiscountAmount) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.maxDiscountAmount" placeholder="제한 없음이면 비워두기" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 flex items-center gap-2 flex-wrap">
              <span>최소 주문금액 <span class="text-xs text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.minOrderAmount)" class="text-xs font-normal text-primary">
                ≈ {{ toKoreanCurrency(form.minOrderAmount) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.minOrderAmount" placeholder="예: 30,000" />
          </div>
          <div>
            <Label class="mb-1.5 block">발급 수량</Label>
            <CurrencyInput v-model="form.totalQuantity" placeholder="무제한이면 비워두기" />
          </div>
        </div>

        <div>
          <Label class="mb-1.5 block">유효기간 방식 <span class="text-destructive">*</span></Label>
          <Select v-model="form.validityType">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAYS_FROM_DOWNLOAD">다운로드 후 N일</SelectItem>
              <SelectItem value="FIXED_PERIOD">기간 지정</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="form.validityType === 'DAYS_FROM_DOWNLOAD'">
          <Label class="mb-1.5 block">유효일수 (일)</Label>
          <Input v-model="form.validityDays" type="number" step="1" />
        </div>

        <div v-else class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">시작일시</Label>
            <Input v-model="form.validFrom" type="datetime-local" />
          </div>
          <div>
            <Label class="mb-1.5 block">종료일시</Label>
            <Input v-model="form.validTo" type="datetime-local" />
          </div>
        </div>

        <div class="flex flex-wrap gap-6 pt-2">
          <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="form.allowPromotionOverlap" type="checkbox" class="h-4 w-4" />
            프로모션 중복 적용
          </label>
          <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="form.allowDuplicateUse" type="checkbox" class="h-4 w-4" />
            다른 쿠폰과 중복 사용
          </label>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <Label>적용 등급</Label>
            <span class="text-xs text-muted-foreground">선택 안 하면 전체 등급</span>
          </div>
          <div class="max-h-40 overflow-y-auto rounded-md border">
            <div v-if="!grades.length" class="p-4 text-center text-sm text-muted-foreground">
              등급 정보 없음
            </div>
            <label
              v-for="g in grades"
              :key="g.grade_id"
              class="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="form.gradeIds.includes(g.grade_id)"
                class="h-4 w-4"
                @change="toggleGrade(g.grade_id)"
              />
              {{ g.name }}
              <span v-if="g.level != null" class="text-xs text-muted-foreground">Lv.{{ g.level }}</span>
            </label>
          </div>
        </div>

        <div v-if="form.couponType === 'PRODUCT_DISCOUNT'">
          <div class="flex items-center justify-between mb-1.5">
            <Label>적용 카테고리</Label>
            <span class="text-xs text-muted-foreground">선택 안 하면 전체 카테고리</span>
          </div>
          <div class="max-h-40 overflow-y-auto rounded-md border">
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
                :checked="form.categoryIds.includes(c.id)"
                class="h-4 w-4"
                @change="toggleCategory(c.id)"
              />
              {{ c.name }}
            </label>
          </div>
        </div>

        <div>
          <Label class="mb-1.5 block">유의사항</Label>
          <Textarea v-model="form.notice" rows="3" placeholder="고객에게 보이는 사용 제한 안내 (선택)" />
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

    <!-- 조회 -->
    <div v-else-if="coupon" class="space-y-6">
      <DetailSection title="쿠폰 정보">
        <DetailField label="쿠폰명" :value="coupon.name" full />
        <DetailField label="설명" :value="coupon.description" full />
        <DetailField label="타입" :value="typeLabels[coupon.couponType] ?? coupon.couponType" />
        <DetailField label="상태" :value="statusLabels[coupon.status] ?? coupon.status" />
        <DetailField label="할인" :value="discountText" />
        <DetailField label="최소 주문금액" :value="formatCurrency(coupon.minOrderAmount)" />
        <DetailField label="발급 수량" :value="`${formatNumber(coupon.issuedQuantity)} / ${formatNumber(coupon.totalQuantity)}`" />
        <DetailField label="유효기간" :value="validityText" />
        <DetailField label="프로모션 중복" :value="coupon.allowPromotionOverlap ? '가능' : '불가'" />
        <DetailField label="쿠폰 중복" :value="coupon.allowDuplicateUse ? '가능' : '불가'" />
        <DetailField label="일반 목록 노출" full>
          <div class="flex items-center gap-2">
            <span>{{ coupon.isVisible ? '노출' : '숨김' }}</span>
            <span class="text-xs text-muted-foreground">
              · 끄면 일반 쿠폰 페이지에서만 숨김. 이벤트 연결 쿠폰은 그래도 다운로드 가능.
            </span>
          </div>
        </DetailField>
        <DetailField label="등록일시" :value="formatDate(coupon.createdAt)" />
        <DetailField v-if="coupon.notice" label="유의사항" full>
          <div class="whitespace-pre-wrap text-muted-foreground">{{ coupon.notice }}</div>
        </DetailField>

        <template #footer>
          <Button variant="outline" size="sm" :disabled="saving" @click="toggleVisibility">
            <Icon :name="coupon.isVisible ? 'lucide:eye-off' : 'lucide:eye'" size="14" class="mr-1" />
            {{ coupon.isVisible ? '숨기기' : '노출' }}
          </Button>
          <Button
            v-if="coupon.status === 'REGISTERED' || coupon.status === 'STOPPED'"
            variant="outline"
            size="sm"
            :disabled="saving"
            @click="changeStatus('ACTIVE')"
          >발급 시작</Button>
          <Button
            v-if="coupon.status === 'ACTIVE'"
            variant="outline"
            size="sm"
            :disabled="saving"
            @click="changeStatus('STOPPED')"
          >발급 중지</Button>
          <Button
            v-if="coupon.status !== 'RECALLED'"
            variant="outline"
            size="sm"
            class="text-destructive"
            :disabled="saving"
            @click="recall"
          >회수</Button>
          <Button variant="outline" size="sm" class="text-destructive" @click="remove">삭제</Button>
        </template>
      </DetailSection>

      <DetailSection v-if="coupon.grades?.length" title="적용 등급">
        <div class="col-span-2 flex flex-wrap gap-1">
          <Badge v-for="g in coupon.grades" :key="g.id" variant="secondary">{{ g.name }}</Badge>
        </div>
      </DetailSection>

      <DetailSection v-if="coupon.categories?.length" title="적용 카테고리">
        <div class="col-span-2 flex flex-wrap gap-1">
          <Badge v-for="c in coupon.categories" :key="c.id" variant="secondary">{{ c.name }}</Badge>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">쿠폰을 찾을 수 없습니다.</div>
  </div>
</template>
