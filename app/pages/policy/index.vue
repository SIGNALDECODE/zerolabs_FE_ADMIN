<script setup lang="ts">
import { formatCurrency, formatNumber, toKoreanCurrency } from '~/utils/format'
import type { PolicyAllSettings, PolicyFormState, PolicyType, TermsItem } from '~/types/policy'

const POLICY_TYPE_LABEL: Record<PolicyType, string> = {
  TERMS: '이용약관',
  PRIVACY: '개인정보처리방침',
  REFUND: '환불정책',
  SHIPPING: '배송정책',
  MEMBERSHIP: '멤버십정책',
  POINT: '포인트정책',
  MARKETING: '마케팅수신동의',
  OTHER: '기타'
}
const POLICY_TYPE_OPTIONS = Object.entries(POLICY_TYPE_LABEL) as Array<[PolicyType, string]>

useHead({ title: '운영 정책 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const policyApi = useAdminPolicy()
const toast = useToast()

const policy = ref<PolicyAllSettings | null>(null)
const loading = ref(true)
const saving = ref(false)
const editing = ref(false)

const form = reactive<PolicyFormState>({
  order: {},
  delivery: {},
  product: {},
  returnPolicy: {},
  terms: []
})

const cloneTerm = (t: TermsItem): TermsItem => ({
  id: t.id ?? null,
  policyType: t.policyType,
  title: t.title ?? '',
  content: t.content ?? '',
  version: t.version ?? '1.0',
  isRequired: t.isRequired ?? false,
  isActive: t.isActive ?? true,
  publishedAt: t.publishedAt
})

// idx 가 splice 시 흔들리므로, form.terms 와 1:1 매칭되는 안정 키 배열을 따로 관리.
const termKeys = ref<string[]>([])
let tempIdSeq = 0
const newTempKey = () => `new-${++tempIdSeq}`
const editExpanded = ref<Set<string>>(new Set())

const resetForm = () => {
  if (!policy.value) return
  Object.assign(form.order, policy.value.order ?? {})
  Object.assign(form.delivery, policy.value.delivery ?? {})
  Object.assign(form.product, policy.value.product ?? {})
  Object.assign(form.returnPolicy, policy.value.returnPolicy ?? {})
  form.terms = (policy.value.terms ?? []).map(cloneTerm)
  termKeys.value = form.terms.map((t) => (t.id ? `id-${t.id}` : newTempKey()))
  editExpanded.value = new Set()
}

const addTerm = () => {
  form.terms.push({
    id: null,
    policyType: 'TERMS',
    title: '',
    content: '',
    version: '1.0',
    isRequired: false,
    isActive: true
  })
  const key = newTempKey()
  termKeys.value.push(key)
  editExpanded.value = new Set(editExpanded.value).add(key)
}

const removeTerm = (idx: number) => {
  const key = termKeys.value[idx]
  form.terms.splice(idx, 1)
  termKeys.value.splice(idx, 1)
  if (key && editExpanded.value.has(key)) {
    const next = new Set(editExpanded.value)
    next.delete(key)
    editExpanded.value = next
  }
}

const toggleEditExpanded = (key: string) => {
  const next = new Set(editExpanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  editExpanded.value = next
}
const editExpandAll = () => { editExpanded.value = new Set(termKeys.value) }
const editCollapseAll = () => { editExpanded.value = new Set() }

const viewExpanded = ref<Set<number>>(new Set())
const toggleViewExpanded = (id: number) => {
  const next = new Set(viewExpanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  viewExpanded.value = next
}
const viewExpandAll = () => {
  viewExpanded.value = new Set(
    (policy.value?.terms ?? []).map((t) => t.id).filter((v): v is number => v != null)
  )
}
const viewCollapseAll = () => { viewExpanded.value = new Set() }

const load = async () => {
  loading.value = true
  try {
    policy.value = await policyApi.get()
    resetForm()
  } finally { loading.value = false }
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => { editing.value = false; resetForm() }

const toNum = (v: number | string | undefined): number | undefined =>
  v === '' || v == null ? undefined : Number(v)

const POINT_EXPIRATION_LABEL: Record<string, string> = {
  UNLIMITED: '무제한',
  '1_YEAR': '1년',
  '2_YEAR': '2년',
  '3_YEAR': '3년'
}
const formatPointExpiration = (v: string | undefined | null) =>
  v ? (POINT_EXPIRATION_LABEL[v] ?? v) : '-'

const submit = async () => {
  saving.value = true
  try {
    await policyApi.update({
      order: {
        minOrderAmount: toNum(form.order.minOrderAmount),
        maxOrderAmount: toNum(form.order.maxOrderAmount),
        maxOrderQuantity: toNum(form.order.maxOrderQuantity),
        cancelHours: toNum(form.order.cancelHours),
        autoConfirmDays: toNum(form.order.autoConfirmDays),
        pointRate: toNum(form.order.pointRate),
        pointMinOrder: toNum(form.order.pointMinOrder),
        pointMinUse: toNum(form.order.pointMinUse),
        pointMaxUseRate: toNum(form.order.pointMaxUseRate),
        pointExpirationType: form.order.pointExpirationType
      },
      delivery: {
        freeShippingAmount: toNum(form.delivery.freeShippingAmount),
        baseShippingFee: toNum(form.delivery.baseShippingFee),
        islandExtraFee: toNum(form.delivery.islandExtraFee),
        islandRegions: form.delivery.islandRegions,
        estimatedDays: form.delivery.estimatedDays,
        guideText: form.delivery.guideText
      },
      product: {
        defaultTaxRate: toNum(form.product.defaultTaxRate),
        lowStockThreshold: toNum(form.product.lowStockThreshold),
        maxOptions: toNum(form.product.maxOptions),
        maxImages: toNum(form.product.maxImages),
        showSoldout: form.product.showSoldout,
        showStock: form.product.showStock,
        guideText: form.product.guideText
      },
      returnPolicy: {
        returnDays: toNum(form.returnPolicy.returnDays),
        exchangeDays: toNum(form.returnPolicy.exchangeDays),
        returnFee: toNum(form.returnPolicy.returnFee),
        exchangeFee: toNum(form.returnPolicy.exchangeFee),
        returnAddress: form.returnPolicy.returnAddress,
        nonReturnable: form.returnPolicy.nonReturnable,
        guideText: form.returnPolicy.guideText
      },
      terms: form.terms.map((t) => ({
        id: t.id ?? null,
        policyType: t.policyType,
        title: t.title.trim(),
        content: t.content,
        version: t.version?.trim() || '1.0',
        isRequired: t.isRequired ?? false,
        isActive: t.isActive ?? true
      }))
    })
    editing.value = false
    toast.success('운영 정책을 저장했습니다.')
    await load()
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-8 max-w-6xl">
    <PageHeader icon="lucide:scroll-text" title="운영 정책" description="주문 검증 · 적립금 · 배송비 · 반품 교환 배송비">
      <template #actions>
        <template v-if="!editing">
          <Button variant="outline" size="sm" @click="load">
            <Icon name="lucide:refresh-cw" size="14" class="mr-1" /> 새로고침
          </Button>
          <Button size="sm" @click="startEdit">
            <Icon name="lucide:pencil" size="14" class="mr-1" /> 수정
          </Button>
        </template>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <!-- 폼 -->
    <!--
      주의: 현재 실제 비즈니스 로직에 반영되는 항목만 노출.
      아래 항목은 BE 미연동으로 임시 숨김 (`docs` 또는 PR 로 별도 전달):
        - 주문: cancelHours, autoConfirmDays
        - 상품: 전체 (defaultTaxRate, lowStockThreshold 등)
        - 반품: returnDays, exchangeDays, returnAddress, nonReturnable, guideText

      배송 섹션은 노출하되, BE 측 ShippingFeeService 가 카테고리 "shipping" 으로
      읽고 AdminPolicyService 는 "delivery" 로 쓰는 mismatch 가 있어
      실제 배송비 계산에 반영되려면 BE 한 줄 수정 필요.
    -->
    <div v-else-if="editing" class="space-y-6">
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">주문 정책</CardTitle>
          <CardDescription class="text-xs">주문 접수 시 검증되는 기본 조건</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>최소 주문금액 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.order.minOrderAmount)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.order.minOrderAmount) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.order.minOrderAmount" />
          </div>
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>최대 주문금액 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.order.maxOrderAmount)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.order.maxOrderAmount) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.order.maxOrderAmount" />
          </div>
          <div class="sm:col-span-2">
            <Label class="mb-1.5 block text-xs">최대 주문수량 (1회)</Label>
            <Input v-model="form.order.maxOrderQuantity" type="number" step="1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">적립금 정책</CardTitle>
          <CardDescription class="text-xs">결제 시 자동 적립 · 사용 규칙</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label class="mb-1.5 block text-xs">기본 적립률 (%)</Label>
            <Input v-model="form.order.pointRate" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>적립금 최소 주문액 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.order.pointMinOrder)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.order.pointMinOrder) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.order.pointMinOrder" />
          </div>
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>최소 사용 적립금 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.order.pointMinUse)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.order.pointMinUse) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.order.pointMinUse" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">최대 사용 비율 (%)</Label>
            <Input v-model="form.order.pointMaxUseRate" type="number" step="1" />
          </div>
          <div class="sm:col-span-2">
            <Label class="mb-1.5 block text-xs">적립금 유효기간</Label>
            <Select v-model="form.order.pointExpirationType">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNLIMITED">무제한</SelectItem>
                <SelectItem value="1_YEAR">1년</SelectItem>
                <SelectItem value="2_YEAR">2년</SelectItem>
                <SelectItem value="3_YEAR">3년</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">배송 정책</CardTitle>
          <CardDescription class="text-xs">기본 배송비 · 무료배송 기준 · 도서산간 추가비</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>기본 배송비 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.delivery.baseShippingFee)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.delivery.baseShippingFee) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.delivery.baseShippingFee" />
          </div>
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>무료배송 기준금액 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.delivery.freeShippingAmount)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.delivery.freeShippingAmount) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.delivery.freeShippingAmount" />
          </div>
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>도서산간 추가비 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.delivery.islandExtraFee)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.delivery.islandExtraFee) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.delivery.islandExtraFee" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">예상 배송일</Label>
            <Input v-model="form.delivery.estimatedDays" placeholder="2-3일" />
          </div>
          <div class="sm:col-span-2">
            <Label class="mb-1.5 block text-xs">
              도서산간 우편번호 <span class="text-muted-foreground">(쉼표로 구분, prefix 매칭)</span>
            </Label>
            <Textarea v-model="form.delivery.islandRegions" rows="2" class="font-mono text-xs" placeholder="6300, 6301, 6302" />
          </div>
          <div class="sm:col-span-2">
            <Label class="mb-1.5 block text-xs">배송 안내 문구</Label>
            <Textarea v-model="form.delivery.guideText" rows="3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">반품/교환 배송비</CardTitle>
          <CardDescription class="text-xs">클레임(반품/교환) 승인 시 자동 차감</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>반품 배송비 편도 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.returnPolicy.returnFee)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.returnPolicy.returnFee) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.returnPolicy.returnFee" />
          </div>
          <div>
            <Label class="mb-1.5 flex items-center gap-2 text-xs flex-wrap">
              <span>교환 배송비 왕복 <span class="text-muted-foreground">(원)</span></span>
              <span v-if="toKoreanCurrency(form.returnPolicy.exchangeFee)" class="font-normal text-primary normal-case">
                ≈ {{ toKoreanCurrency(form.returnPolicy.exchangeFee) }}
              </span>
            </Label>
            <CurrencyInput v-model="form.returnPolicy.exchangeFee" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle class="text-base">약관 / 정책 문서</CardTitle>
            <CardDescription class="text-xs">
              이용약관·개인정보처리방침·마케팅수신동의 등. 신규는 ID 없이 추가, 기존 항목은 수정.
              삭제는 백엔드 API 가 없어 "활성" 토글로 비활성화.
            </CardDescription>
          </div>
          <div class="flex items-center gap-1">
            <Button
              v-if="form.terms.length"
              type="button"
              size="sm"
              variant="ghost"
              @click="editExpanded.size === termKeys.length ? editCollapseAll() : editExpandAll()"
            >
              <Icon
                :name="editExpanded.size === termKeys.length ? 'lucide:chevrons-down-up' : 'lucide:chevrons-up-down'"
                size="14"
                class="mr-1"
              />
              {{ editExpanded.size === termKeys.length ? '모두 접기' : '모두 펴기' }}
            </Button>
            <Button type="button" size="sm" variant="outline" @click="addTerm">
              <Icon name="lucide:plus" size="14" class="mr-1" /> 약관 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-3">
          <div v-if="!form.terms.length" class="text-center text-muted-foreground text-sm py-6">
            등록된 약관이 없습니다.
          </div>
          <div
            v-for="(term, idx) in form.terms"
            :key="termKeys[idx] ?? `idx-${idx}`"
            class="border rounded-md overflow-hidden"
            :class="editExpanded.has(termKeys[idx] ?? '') ? 'border-primary/40 ring-1 ring-primary/10' : ''"
          >
            <button
              type="button"
              class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40 transition"
              @click="toggleEditExpanded(termKeys[idx] ?? '')"
            >
              <Icon
                :name="editExpanded.has(termKeys[idx] ?? '') ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                size="16"
                class="shrink-0 text-muted-foreground"
              />
              <span class="text-xs font-medium text-foreground shrink-0">
                {{ POLICY_TYPE_LABEL[term.policyType] ?? term.policyType }}
              </span>
              <span class="text-xs text-muted-foreground shrink-0">v{{ term.version || '1.0' }}</span>
              <span class="text-sm truncate" :class="term.title ? '' : 'text-muted-foreground italic'">
                {{ term.title || '(제목 없음)' }}
              </span>
              <span v-if="term.isRequired" class="ml-auto px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] shrink-0">필수</span>
              <span v-if="term.isActive === false" class="px-1.5 py-0.5 rounded bg-muted text-[11px] shrink-0">비활성</span>
              <span class="text-[11px] text-muted-foreground shrink-0" :class="term.isRequired || term.isActive === false ? '' : 'ml-auto'">
                {{ term.id ? `#${term.id}` : '신규' }}
              </span>
            </button>
            <div v-show="editExpanded.has(termKeys[idx] ?? '')" class="border-t p-4 space-y-3">
              <div class="grid gap-3 grid-cols-1 sm:grid-cols-[180px_1fr_120px]">
                <div>
                  <Label class="mb-1.5 block text-xs">유형</Label>
                  <Select v-model="term.policyType">
                    <SelectTrigger class="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="[v, label] in POLICY_TYPE_OPTIONS" :key="v" :value="v">
                        {{ label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label class="mb-1.5 block text-xs">제목 <span class="text-destructive">*</span></Label>
                  <Input v-model="term.title" maxlength="200" placeholder="이용약관 v1.0" />
                </div>
                <div>
                  <Label class="mb-1.5 block text-xs">버전</Label>
                  <Input v-model="term.version" maxlength="20" placeholder="1.0" />
                </div>
              </div>
              <div>
                <Label class="mb-1.5 block text-xs">본문 <span class="text-destructive">*</span></Label>
                <RichTextEditor v-model="term.content" min-height="240px" placeholder="약관 본문을 입력하세요…" />
              </div>
              <div class="flex items-center gap-6 text-xs">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="term.isRequired" type="checkbox" class="h-4 w-4">
                  <span>필수 동의</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="term.isActive" type="checkbox" class="h-4 w-4">
                  <span>활성</span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  class="ml-auto text-destructive hover:text-destructive"
                  @click="removeTerm(idx)"
                >
                  <Icon name="lucide:trash-2" size="14" class="mr-1" /> 목록에서 제거
                </Button>
              </div>
              <p v-if="term.id" class="text-[11px] text-muted-foreground">
                ⚠ 목록에서 제거해도 백엔드에서 삭제되지 않습니다. 비공개 처리하려면 "활성"을 해제하세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="flex justify-end gap-2">
        <Button variant="outline" :disabled="saving" @click="cancelEdit">취소</Button>
        <Button :disabled="saving" @click="submit">
          <Icon name="lucide:save" size="14" class="mr-1" /> 저장
        </Button>
      </div>
    </div>

    <!-- 조회 — 편집과 동일하게 실제 적용되는 항목만 -->
    <div v-else-if="policy" class="grid gap-6 lg:grid-cols-2">
      <DetailSection title="주문 정책" description="주문 접수 검증">
        <DetailField label="최소 주문금액" :value="formatCurrency(policy.order?.minOrderAmount)" />
        <DetailField label="최대 주문금액" :value="formatCurrency(policy.order?.maxOrderAmount)" />
        <DetailField label="최대 주문수량" :value="formatNumber(policy.order?.maxOrderQuantity)" />
      </DetailSection>

      <DetailSection title="적립금 정책" description="결제 시 적립·사용 규칙">
        <DetailField label="기본 적립률" :value="policy.order?.pointRate != null ? `${policy.order.pointRate}%` : '-'" />
        <DetailField label="적립금 최소 주문액" :value="formatCurrency(policy.order?.pointMinOrder)" />
        <DetailField label="최소 사용 적립금" :value="formatCurrency(policy.order?.pointMinUse)" />
        <DetailField label="최대 사용 비율" :value="policy.order?.pointMaxUseRate ? `${policy.order.pointMaxUseRate}%` : '-'" />
        <DetailField label="적립금 유효기간" :value="formatPointExpiration(policy.order?.pointExpirationType)" />
      </DetailSection>

      <DetailSection title="배송 정책" description="기본 배송비·무료배송 기준·도서산간">
        <DetailField label="기본 배송비" :value="formatCurrency(policy.delivery?.baseShippingFee)" />
        <DetailField label="무료배송 기준금액" :value="formatCurrency(policy.delivery?.freeShippingAmount)" />
        <DetailField label="도서산간 추가비" :value="formatCurrency(policy.delivery?.islandExtraFee)" />
        <DetailField label="예상 배송일" :value="policy.delivery?.estimatedDays" />
        <DetailField label="도서산간 우편번호" :value="policy.delivery?.islandRegions" mono full />
        <DetailField label="배송 안내 문구" :value="policy.delivery?.guideText" full />
      </DetailSection>

      <DetailSection title="반품/교환 배송비" description="클레임 승인 시 자동 차감">
        <DetailField label="반품 배송비" :value="formatCurrency(policy.returnPolicy?.returnFee)" />
        <DetailField label="교환 배송비" :value="formatCurrency(policy.returnPolicy?.exchangeFee)" />
      </DetailSection>

      <div class="lg:col-span-2 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium">약관 / 정책 문서</h3>
          <Button
            v-if="policy.terms?.length"
            type="button"
            size="sm"
            variant="ghost"
            @click="viewExpanded.size === (policy.terms?.length ?? 0) ? viewCollapseAll() : viewExpandAll()"
          >
            <Icon
              :name="viewExpanded.size === (policy.terms?.length ?? 0) ? 'lucide:chevrons-down-up' : 'lucide:chevrons-up-down'"
              size="14"
              class="mr-1"
            />
            {{ viewExpanded.size === (policy.terms?.length ?? 0) ? '모두 접기' : '모두 펴기' }}
          </Button>
        </div>
        <div v-if="!policy.terms?.length" class="text-sm text-muted-foreground border rounded-md p-4">
          등록된 약관이 없습니다.
        </div>
        <div
          v-for="t in policy.terms ?? []"
          :key="t.id ?? `view-${t.policyType}-${t.title}`"
          class="border rounded-md overflow-hidden"
          :class="[
            t.isActive === false ? 'opacity-60' : '',
            t.id && viewExpanded.has(t.id) ? 'border-primary/40 ring-1 ring-primary/10' : ''
          ]"
        >
          <button
            type="button"
            class="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40 transition"
            @click="t.id && toggleViewExpanded(t.id)"
          >
            <Icon
              :name="t.id && viewExpanded.has(t.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
              size="16"
              class="shrink-0 text-muted-foreground"
            />
            <span class="text-xs font-medium text-foreground shrink-0">
              {{ POLICY_TYPE_LABEL[t.policyType] ?? t.policyType }}
            </span>
            <span class="text-xs text-muted-foreground shrink-0">v{{ t.version || '1.0' }}</span>
            <span class="text-sm truncate">{{ t.title }}</span>
            <span v-if="t.isRequired" class="ml-auto px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] shrink-0">필수</span>
            <span v-if="t.isActive === false" class="px-1.5 py-0.5 rounded bg-muted text-[11px] shrink-0">비활성</span>
            <span class="text-[11px] text-muted-foreground shrink-0" :class="t.isRequired || t.isActive === false ? '' : 'ml-auto'">
              #{{ t.id }}
            </span>
          </button>
          <div v-show="t.id && viewExpanded.has(t.id)" class="border-t p-4">
            <div class="prose prose-sm max-w-none text-muted-foreground" v-html="t.content" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
