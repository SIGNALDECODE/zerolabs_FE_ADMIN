<script setup lang="ts">
import { formatCurrency, formatNumber } from '~/utils/format'

useHead({ title: '운영 정책 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const policyApi = useAdminPolicy()
const toast = useToast()

const policy = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const editing = ref(false)

const form = reactive<any>({
  order: {} as any,
  delivery: {} as any,
  product: {} as any,
  returnPolicy: {} as any
})

const resetForm = () => {
  if (!policy.value) return
  Object.assign(form.order, policy.value.order ?? {})
  Object.assign(form.delivery, policy.value.delivery ?? {})
  Object.assign(form.product, policy.value.product ?? {})
  Object.assign(form.returnPolicy, policy.value.returnPolicy ?? policy.value.return ?? {})
}

const load = async () => {
  loading.value = true
  try {
    policy.value = await policyApi.get()
    resetForm()
  } finally { loading.value = false }
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => { editing.value = false; resetForm() }

const submit = async () => {
  saving.value = true
  try {
    await policyApi.update({
      order: form.order,
      delivery: form.delivery,
      product: form.product,
      returnPolicy: form.returnPolicy
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
  <div class="p-8 max-w-5xl">
    <PageHeader title="운영 정책" description="주문 · 배송 · 상품 · 반품 정책">
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
    <div v-else-if="editing" class="space-y-6">
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">주문 정책</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 grid-cols-2">
          <div>
            <Label class="mb-1.5 block text-xs">최소 주문금액 (원)</Label>
            <Input v-model="form.order.minOrderAmount" type="number" step="1000" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">최대 주문금액 (원)</Label>
            <Input v-model="form.order.maxOrderAmount" type="number" step="1000" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">최대 주문수량 (1회)</Label>
            <Input v-model="form.order.maxOrderQuantity" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">취소 가능 시간 (시간)</Label>
            <Input v-model="form.order.cancelHours" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">자동 구매확정 (일)</Label>
            <Input v-model="form.order.autoConfirmDays" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">기본 적립률 (%)</Label>
            <Input v-model="form.order.pointRate" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">적립금 최소 주문액 (원)</Label>
            <Input v-model="form.order.pointMinOrder" type="number" step="1000" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">최소 사용 적립금 (원)</Label>
            <Input v-model="form.order.pointMinUse" type="number" step="100" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">최대 사용 비율 (%)</Label>
            <Input v-model="form.order.pointMaxUseRate" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">적립금 유효기간</Label>
            <select v-model="form.order.pointExpirationType" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="UNLIMITED">무제한</option>
              <option value="1_YEAR">1년</option>
              <option value="2_YEAR">2년</option>
              <option value="3_YEAR">3년</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3"><CardTitle class="text-base">배송 정책</CardTitle></CardHeader>
        <CardContent class="grid gap-4 grid-cols-2">
          <div>
            <Label class="mb-1.5 block text-xs">기본 배송비 (원)</Label>
            <Input v-model="form.delivery.baseShippingFee" type="number" step="100" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">무료배송 기준 (원)</Label>
            <Input v-model="form.delivery.freeShippingAmount" type="number" step="1000" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">도서산간 추가비 (원)</Label>
            <Input v-model="form.delivery.islandExtraFee" type="number" step="100" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">예상 배송기간</Label>
            <Input v-model="form.delivery.estimatedDays" placeholder="예: 2~3일" />
          </div>
          <div class="col-span-2">
            <Label class="mb-1.5 block text-xs">추가 배송비 지역 (쉼표 구분)</Label>
            <Input v-model="form.delivery.islandRegions" placeholder="제주, 울릉, 백령…" />
          </div>
          <div class="col-span-2">
            <Label class="mb-1.5 block text-xs">배송 안내문</Label>
            <Textarea v-model="form.delivery.guideText" rows="3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3"><CardTitle class="text-base">상품 정책</CardTitle></CardHeader>
        <CardContent class="grid gap-4 grid-cols-2">
          <div>
            <Label class="mb-1.5 block text-xs">기본 세율 (%)</Label>
            <Input v-model="form.product.defaultTaxRate" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">재고 부족 알림 기준</Label>
            <Input v-model="form.product.lowStockThreshold" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">최대 옵션 수</Label>
            <Input v-model="form.product.maxOptions" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">최대 이미지 수</Label>
            <Input v-model="form.product.maxImages" type="number" step="1" />
          </div>
          <div class="col-span-2 flex gap-6">
            <label class="inline-flex items-center gap-2 text-sm">
              <input v-model="form.product.showSoldout" type="checkbox" class="h-4 w-4" />
              품절 상품 표시
            </label>
            <label class="inline-flex items-center gap-2 text-sm">
              <input v-model="form.product.showStock" type="checkbox" class="h-4 w-4" />
              재고 수량 표시
            </label>
          </div>
          <div class="col-span-2">
            <Label class="mb-1.5 block text-xs">상품 안내문</Label>
            <Textarea v-model="form.product.guideText" rows="3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-3"><CardTitle class="text-base">반품 정책</CardTitle></CardHeader>
        <CardContent class="grid gap-4 grid-cols-2">
          <div>
            <Label class="mb-1.5 block text-xs">반품 가능 기간 (일)</Label>
            <Input v-model="form.returnPolicy.returnDays" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">교환 가능 기간 (일)</Label>
            <Input v-model="form.returnPolicy.exchangeDays" type="number" step="1" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">반품 배송비 편도 (원)</Label>
            <Input v-model="form.returnPolicy.returnFee" type="number" step="100" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">교환 배송비 왕복 (원)</Label>
            <Input v-model="form.returnPolicy.exchangeFee" type="number" step="100" />
          </div>
          <div class="col-span-2">
            <Label class="mb-1.5 block text-xs">반품 주소</Label>
            <Input v-model="form.returnPolicy.returnAddress" />
          </div>
          <div class="col-span-2">
            <Label class="mb-1.5 block text-xs">반품 불가 품목 (쉼표 구분)</Label>
            <Input v-model="form.returnPolicy.nonReturnable" placeholder="속옷, 수영복, 식품류…" />
          </div>
          <div class="col-span-2">
            <Label class="mb-1.5 block text-xs">반품/교환 안내문</Label>
            <Textarea v-model="form.returnPolicy.guideText" rows="3" />
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

    <!-- 조회 -->
    <div v-else-if="policy" class="grid gap-6 md:grid-cols-2">
      <DetailSection title="주문 정책">
        <DetailField label="최소 주문금액" :value="formatCurrency(policy.order?.minOrderAmount)" />
        <DetailField label="최대 주문금액" :value="formatCurrency(policy.order?.maxOrderAmount)" />
        <DetailField label="최대 주문수량" :value="formatNumber(policy.order?.maxOrderQuantity)" />
        <DetailField label="취소 가능 시간" :value="policy.order?.cancelHours != null ? `${policy.order.cancelHours}시간` : '-'" />
        <DetailField label="자동 구매확정" :value="policy.order?.autoConfirmDays != null ? `${policy.order.autoConfirmDays}일` : '-'" />
        <DetailField label="기본 적립률" :value="policy.order?.pointRate != null ? `${policy.order.pointRate}%` : '-'" />
        <DetailField label="적립금 최소 주문액" :value="formatCurrency(policy.order?.pointMinOrder)" />
        <DetailField label="최소 사용 적립금" :value="formatCurrency(policy.order?.pointMinUse)" />
        <DetailField label="최대 사용 비율" :value="policy.order?.pointMaxUseRate ? `${policy.order.pointMaxUseRate}%` : '-'" />
        <DetailField label="적립금 유효기간" :value="policy.order?.pointExpirationType" />
      </DetailSection>

      <DetailSection title="배송 정책">
        <DetailField label="기본 배송비" :value="formatCurrency(policy.delivery?.baseShippingFee ?? policy.delivery?.shippingFee)" />
        <DetailField label="무료배송 기준" :value="formatCurrency(policy.delivery?.freeShippingAmount ?? policy.delivery?.freeShippingThreshold)" />
        <DetailField label="도서산간 추가비" :value="formatCurrency(policy.delivery?.islandExtraFee ?? policy.delivery?.remoteAreaFee)" />
        <DetailField label="예상 배송기간" :value="policy.delivery?.estimatedDays" />
      </DetailSection>

      <DetailSection title="상품 정책">
        <DetailField label="기본 세율" :value="policy.product?.defaultTaxRate ? `${policy.product.defaultTaxRate}%` : '-'" />
        <DetailField label="재고 부족 기준" :value="formatNumber(policy.product?.lowStockThreshold)" />
        <DetailField label="최대 옵션 수" :value="policy.product?.maxOptions" />
        <DetailField label="최대 이미지 수" :value="policy.product?.maxImages" />
        <DetailField label="품절 표시" :value="policy.product?.showSoldout === undefined ? '-' : (policy.product.showSoldout ? '예' : '아니오')" />
        <DetailField label="재고 표시" :value="policy.product?.showStock === undefined ? '-' : (policy.product.showStock ? '예' : '아니오')" />
      </DetailSection>

      <DetailSection title="반품 정책">
        <DetailField label="반품 가능 기간" :value="policy.returnPolicy?.returnDays ? `${policy.returnPolicy.returnDays}일` : '-'" />
        <DetailField label="교환 가능 기간" :value="policy.returnPolicy?.exchangeDays ? `${policy.returnPolicy.exchangeDays}일` : '-'" />
        <DetailField label="반품 배송비" :value="formatCurrency(policy.returnPolicy?.returnFee)" />
        <DetailField label="교환 배송비" :value="formatCurrency(policy.returnPolicy?.exchangeFee)" />
      </DetailSection>
    </div>
  </div>
</template>
