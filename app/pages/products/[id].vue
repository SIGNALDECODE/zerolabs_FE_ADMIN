<script setup lang="ts">
import { formatCurrency, formatNumber, toKoreanCurrency } from '~/utils/format'
import type {
  ProductDetail,
  ProductOption,
  ProductOptionValue,
  ProductTag,
  ProductFormState,
  ProductOptionForm,
  ProductOptionValueForm
} from '~/types/product'
import type { CategoryNode } from '~/types/content'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const productApi = useAdminProduct()
const categoryApi = useAdminCategory()
const tagApi = useAdminTag()
const toast = useToast()
const prompt = usePrompt()
const confirm = useConfirm()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const product = ref<ProductDetail | null>(null)
const categories = ref<CategoryNode[]>([])
const tags = ref<ProductTag[]>([])
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const imageFile = ref<File | null>(null)
const imagePreview = ref<string>('')
const removeImage = ref(false)

/** 마지막 저장(또는 로드) 시점의 폼 스냅샷. dirty 비교용. */
const snapshot = ref<string>('')
const captureSnapshot = () => {
  snapshot.value = JSON.stringify({
    form,
    hasNewImage: !!imageFile.value,
    removeImage: removeImage.value
  })
}

const form = reactive<ProductFormState>({
  name: '',
  summary: '',
  description: '',
  categoryIds: [],
  tagIds: [],
  costPrice: undefined,
  regularPrice: undefined,
  salePrice: undefined,
  discountType: 'NONE',
  discountValue: 0,
  status: 'ON_SALE',
  maxPurchaseQuantity: undefined,
  stockQuantity: 0,
  primaryImageAltText: '',
  options: []
})

/**
 * 전체 재고 합계 — 옵션 유무에 따라 소스가 다르다.
 * - 옵션 있음 → 각 옵션값의 stockQuantity 합계
 * - 옵션 없음 → Product top-level stockQuantity
 *
 * 백엔드 autoSoldOutIfNoStock 훅은 저장 시 이 합계가 0 이면 status 를 SOLD_OUT 으로
 * 강제 복귀시킨다. 수정 시 ON_SALE + 재고 0 조합은 FE 에서 먼저 차단한다.
 */
const totalStock = computed(() => {
  if (form.options.length > 0) {
    return form.options.reduce(
      (sum, g) => sum + g.values.reduce((s, v) => s + (Number(v.stockQuantity) || 0), 0),
      0
    )
  }
  return Math.max(0, Number(form.stockQuantity) || 0)
})

/** 정가-판매가 차이 기반 자동 할인 프리뷰. 저장에는 영향 없음. */
const discountPreview = computed(() => {
  const reg = Number(form.regularPrice) || 0
  const sale = Number(form.salePrice) || 0
  if (reg <= 0 || sale <= 0 || sale >= reg) return ''
  const diff = reg - sale
  const rate = Math.round((diff / reg) * 100)
  return `${rate}% 할인 · ${diff.toLocaleString()}원 인하`
})

const statusLabel = computed(() => {
  const status = product.value?.status ?? ''
  const map: Record<string, string> = {
    ACTIVE: '판매중', ON_SALE: '판매중', INACTIVE: '판매중지', DRAFT: '임시저장',
    DISCONTINUED: '단종', SOLD_OUT: '품절'
  }
  return map[status] ?? status
})

const resetForm = () => {
  const p = product.value
  if (!p) return
  const options: ProductOptionForm[] = (p.options ?? []).map((g: ProductOption) => ({
    id: g.id,
    name: g.name ?? '',
    values: (g.optionValues ?? []).map((v: ProductOptionValue): ProductOptionValueForm => ({
      id: v.id,
      name: v.value ?? '',
      additionalPrice: Number(v.additionalPrice ?? 0),
      stockQuantity: Number(v.stockQuantity ?? 0),
      sortOrder: v.sortOrder
    }))
  }))
  Object.assign(form, {
    name: p.name ?? '',
    summary: p.summary ?? '',
    description: p.description ?? '',
    categoryIds: p.categories?.map(c => c.id) ?? [],
    tagIds: p.tags?.map(t => t.id) ?? [],
    costPrice: p.costPrice ?? undefined,
    regularPrice: p.regularPrice ?? undefined,
    salePrice: p.salePrice ?? undefined,
    discountType: p.discountType ?? 'NONE',
    discountValue: p.discountValue ?? 0,
    status: p.status ?? 'ON_SALE',
    maxPurchaseQuantity: p.maxPurchaseQuantity ?? undefined,
    stockQuantity: p.stockQuantity ?? 0,
    primaryImageAltText: p.primaryImage?.altText ?? '',
    options
  } satisfies ProductFormState)
  imageFile.value = null
  imagePreview.value = p.primaryImage?.url ?? ''
  removeImage.value = false
  captureSnapshot()
}

useFormDirty(
  () => snapshot.value,
  () => JSON.stringify({
    form,
    hasNewImage: !!imageFile.value,
    removeImage: removeImage.value
  }),
  () => editing.value
)

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    product.value = await productApi.detail(id)
    resetForm()
  } finally { loading.value = false }
}

const loadCategories = async () => {
  try { categories.value = await categoryApi.list() } catch { categories.value = [] }
}

const loadTags = async () => {
  try { tags.value = await tagApi.list() } catch { tags.value = [] }
}

const toggleTag = (tagId: number) => {
  const i = form.tagIds.indexOf(tagId)
  if (i >= 0) form.tagIds.splice(i, 1)
  else form.tagIds.push(tagId)
}

const createTag = async () => {
  const name = await prompt.ask('태그 생성', {
    placeholder: '예: 신상품, 베스트셀러, SALE'
  })
  if (!name) return
  try {
    const created = await tagApi.create({ name })
    toast.success('태그를 생성했습니다.')
    await loadTags()
    if (created?.id != null && !form.tagIds.includes(created.id)) form.tagIds.push(created.id)
  } catch (e) { toast.error(e, '태그 생성 실패') }
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

const toggleCategory = (catId: number) => {
  const i = form.categoryIds.indexOf(catId)
  if (i >= 0) form.categoryIds.splice(i, 1)
  else form.categoryIds.push(catId)
}

const onImageChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value = file
  removeImage.value = false
  const reader = new FileReader()
  reader.onload = () => { imagePreview.value = reader.result as string }
  reader.readAsDataURL(file)
}

const clearImage = () => {
  imageFile.value = null
  imagePreview.value = ''
  removeImage.value = true
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/products')
  editing.value = false
  resetForm()
}

const toNumberOrUndefined = (v: number | string | null | undefined): number | undefined =>
  v != null && v !== '' ? Number(v) : undefined

interface OptionValuePayload {
  name: string
  additionalPrice: number
  stockQuantity: number
  sortOrder?: number
}

interface OptionPayload {
  name: string
  values: OptionValuePayload[]
}

interface ProductSavePayload {
  name: string
  summary?: string
  description?: string
  categoryIds?: number[]
  tagIds?: number[]
  costPrice?: number
  regularPrice: number
  salePrice: number
  discountType: ProductFormState['discountType']
  discountValue: number
  status: ProductFormState['status']
  maxPurchaseQuantity?: number
  stockQuantity?: number
  primaryImageAltText?: string
  removeImage?: boolean
  options?: OptionPayload[]
}

const buildFormData = () => {
  // 빈 그룹/값은 제거
  const cleanedOptions: OptionPayload[] = form.options
    .filter(g => g.name.trim().length > 0)
    .map(g => ({
      name: g.name.trim(),
      values: g.values
        .filter(v => String(v.name).trim().length > 0)
        .map((v, idx) => ({
          name: String(v.name).trim(),
          additionalPrice: Math.max(0, Number(v.additionalPrice) || 0),
          stockQuantity: Math.max(0, Number(v.stockQuantity) || 0),
          sortOrder: v.sortOrder ?? idx
        }))
    }))
    .filter(g => g.values.length > 0)

  const data: ProductSavePayload = {
    name: form.name,
    summary: form.summary || undefined,
    description: form.description || undefined,
    categoryIds: form.categoryIds.length ? form.categoryIds : undefined,
    tagIds: form.tagIds.length ? form.tagIds : undefined,
    costPrice: toNumberOrUndefined(form.costPrice),
    regularPrice: Number(form.regularPrice),
    salePrice: Number(form.salePrice),
    discountType: form.discountType,
    discountValue: Number(form.discountValue) || 0,
    status: form.status,
    maxPurchaseQuantity: toNumberOrUndefined(form.maxPurchaseQuantity),
    // 옵션 없으면 Product top-level 재고 전송, 옵션 있으면 생략 (옵션값에 분산됨)
    stockQuantity: cleanedOptions.length === 0
      ? Math.max(0, Number(form.stockQuantity) || 0)
      : undefined,
    primaryImageAltText: form.primaryImageAltText || undefined,
    removeImage: !isNew && removeImage.value ? true : undefined,
    options: cleanedOptions.length ? cleanedOptions : undefined
  }
  const fd = new FormData()
  fd.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  if (imageFile.value) fd.append('primaryImage', imageFile.value)
  return fd
}

const submit = async () => {
  if (!form.name.trim()) return toast.error('상품명은 필수입니다.')
  if (!form.regularPrice) return toast.error('정가는 필수입니다.')
  if (!form.salePrice) return toast.error('판매가는 필수입니다.')

  // 옵션 유효성: 그룹명/옵션값명 공백 검사
  for (const g of form.options) {
    if (!g.name.trim()) return toast.error('옵션 그룹명이 비어있습니다.')
    for (const v of g.values) {
      if (!String(v.name).trim()) return toast.error(`"${g.name}" 그룹에 이름 없는 옵션값이 있습니다.`)
    }
  }

  // 백엔드 autoSoldOutIfNoStock 훅 회피 (수정 시에만):
  // 저장 후 재고합=0 이면 서버가 status 를 SOLD_OUT 으로 강제 복귀.
  if (!isNew && form.status === 'ON_SALE' && totalStock.value === 0) {
    if (form.options.length > 0) {
      toast.error('모든 옵션값의 재고가 0 입니다. 판매중으로 저장하려면 최소 1개 옵션값의 재고를 입력하세요.')
    } else {
      toast.error('재고가 0 입니다. 판매중으로 저장하려면 기본 정보의 재고를 입력하거나, 상태를 품절·단종으로 선택하세요.')
    }
    return
  }

  if (isNew && !imageFile.value) {
    const ok = await confirm.ask('대표 이미지 없이 등록', {
      description: '이미지 없이 상품을 등록하시겠습니까? 나중에 수정에서 추가할 수 있습니다.',
      confirmText: '등록'
    })
    if (!ok) return
  }
  saving.value = true
  try {
    if (isNew) {
      const res = await productApi.create(buildFormData())
      toast.success('상품을 등록했습니다.')
      // dirty 플래그 해제 후 이동 (떠나기 경고 회피)
      captureSnapshot()
      router.push(`/products/${res.id}`)
    } else {
      await productApi.update(id, buildFormData())
      toast.success('상품을 수정했습니다.')
      editing.value = false
      await load()
    }
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const remove = async () => {
  const ok = await confirm.ask('상품 삭제', {
    description: `"${product.value?.name}"을(를) 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await productApi.remove(id)
    toast.success('상품을 삭제했습니다.')
    router.push('/products')
  } catch (e) {
    toast.error(e, '상품 삭제 실패')
  }
}

onMounted(() => { load(); loadCategories(); loadTags() })
// 신규 모드 — load() 가 호출되지 않으므로 초기 폼 상태를 기준 스냅샷으로 잡아둠
if (isNew) captureSnapshot()
useHead({ title: () => isNew ? '새 상품 등록 | ZeroLabs Admin' : `${product.value?.name ?? '상품'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-4 sm:p-8 max-w-5xl">
    <DetailHeader
      icon="lucide:package"
      :title="isNew ? '새 상품 등록' : (product?.name ?? (loading ? '…' : '상품'))"
      :subtitle="isNew ? '기본 정보만 입력해도 등록 가능. 옵션은 선택사항.' : (product ? `상품 ID · ${product.id}` : null)"
      back-to="/products"
      back-label="상품 목록으로"
    >
      <template #actions>
        <template v-if="!editing && product">
          <StatusBadge :status="product.status" :label="statusLabel" />
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

    <!-- 편집 모드 -->
    <div v-else-if="editing" class="grid gap-6 md:grid-cols-[280px_1fr]">
      <!-- 대표 이미지 -->
      <Card class="self-start">
        <CardContent class="pt-6">
          <Label class="mb-2 block">대표 이미지 <span class="text-destructive">*</span></Label>
          <div class="aspect-square rounded-md border bg-muted overflow-hidden mb-3">
            <img
              v-if="imagePreview"
              :src="imagePreview"
              class="h-full w-full object-cover"
            />
            <div v-else class="h-full w-full grid place-items-center text-muted-foreground">
              <Icon name="lucide:image" size="32" />
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            class="text-xs w-full"
            @change="onImageChange"
          />
          <Button
            v-if="!isNew && imagePreview && !imageFile"
            type="button"
            variant="ghost"
            size="sm"
            class="mt-2 w-full h-8 text-xs text-destructive"
            @click="clearImage"
          >
            <Icon name="lucide:trash-2" size="12" class="mr-1" /> 이미지 제거
          </Button>
        </CardContent>
      </Card>

      <div class="space-y-5">
        <!-- 기본 정보 -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-semibold">기본 정보</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
            <div>
              <Label class="mb-1.5 block">상품명 <span class="text-destructive">*</span></Label>
              <Input v-model="form.name" placeholder="예: 유기농 치킨 져키" maxlength="255" />
            </div>
            <div>
              <Label class="mb-1.5 block">요약 설명</Label>
              <Input v-model="form.summary" placeholder="리스트에서 보일 한 줄 요약" maxlength="255" />
            </div>
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <Label>재고</Label>
                <span v-if="form.options.length > 0" class="text-xs text-muted-foreground">옵션값별 합계</span>
              </div>
              <CurrencyInput
                v-if="form.options.length === 0"
                v-model="form.stockQuantity"
                placeholder="재고 수량 (예: 100)"
              />
              <div
                v-else
                class="px-3 py-2 text-sm rounded-md border bg-muted/40 text-muted-foreground flex items-center justify-between"
              >
                <span>현재 {{ totalStock.toLocaleString() }}개</span>
                <span class="text-xs">아래 옵션 · 재고 섹션에서 옵션값별로 관리</span>
              </div>
            </div>
            <div>
              <Label class="mb-1.5 block">상세 설명</Label>
              <RichTextEditor
                v-model="form.description"
                placeholder="성분, 급여 가이드, 보관 방법 등"
                min-height="280px"
              />
            </div>
          </CardContent>
        </Card>

        <!-- 가격 -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-semibold">가격</CardTitle>
            <CardDescription class="text-xs leading-relaxed">
              <strong class="text-foreground">정가</strong> 보다 <strong class="text-foreground">판매가</strong> 가 낮으면 자동으로 할인 % 가 계산되어 고객에게 표시됩니다.
              할인이 없으면 두 값을 동일하게 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0">
            <div>
              <Label class="mb-1.5 flex items-center gap-2">
                <span>정가 <span class="text-destructive">*</span></span>
                <span v-if="toKoreanCurrency(form.regularPrice)" class="text-xs font-normal text-primary">
                  ≈ {{ toKoreanCurrency(form.regularPrice) }}
                </span>
              </Label>
              <CurrencyInput
                v-model="form.regularPrice"
                placeholder="할인 전 원래 가격 (예: 29,000)"
              />
              <p class="mt-1 text-xs text-muted-foreground">소비자에게 <span class="line-through">취소선</span> 으로 표시됩니다.</p>
            </div>
            <div>
              <Label class="mb-1.5 flex items-center gap-2">
                <span>판매가 <span class="text-destructive">*</span></span>
                <span v-if="toKoreanCurrency(form.salePrice)" class="text-xs font-normal text-primary">
                  ≈ {{ toKoreanCurrency(form.salePrice) }}
                </span>
              </Label>
              <CurrencyInput
                v-model="form.salePrice"
                placeholder="실제 결제하는 금액 (예: 26,100)"
              />
              <p v-if="discountPreview" class="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                <Icon name="lucide:tag" size="11" class="inline mr-0.5 -mt-0.5" />
                {{ discountPreview }}
              </p>
              <p v-else class="mt-1 text-xs text-muted-foreground">실제 결제 금액. 정가보다 낮으면 할인으로 표시됩니다.</p>
            </div>
          </CardContent>
        </Card>

        <!-- 분류 · 노출 -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-semibold">분류 · 노출</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
            <div>
              <Label class="mb-1.5 block">상태 <span class="text-destructive">*</span></Label>
              <Select v-model="form.status">
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ON_SALE">판매중</SelectItem>
                  <SelectItem value="SOLD_OUT">품절</SelectItem>
                  <SelectItem value="DISCONTINUED">단종</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="!isNew && form.status === 'ON_SALE' && totalStock === 0" class="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 leading-relaxed">
                <Icon name="lucide:alert-triangle" size="12" class="inline -mt-0.5 mr-0.5" />
                재고가 0 입니다. 저장 시 서버가 자동으로 품절로 되돌립니다.
                <template v-if="form.options.length > 0">
                  <strong class="font-medium">아래 옵션 · 재고 섹션에서 재고를 먼저 입력</strong> 하세요.
                </template>
                <template v-else>
                  <strong class="font-medium">기본 정보 섹션의 재고를 입력</strong> 하세요.
                </template>
              </p>
            </div>

            <div>
              <Label class="mb-1.5 block">카테고리</Label>
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
              <div class="flex items-center justify-between mb-1.5">
                <Label>태그</Label>
                <Button type="button" variant="ghost" size="sm" class="h-7 text-xs" @click="createTag">
                  <Icon name="lucide:plus" size="12" class="mr-0.5" /> 새 태그
                </Button>
              </div>
              <div v-if="tags.length" class="flex flex-wrap gap-1.5 p-3 rounded-md border min-h-[3rem]">
                <button
                  v-for="t in tags"
                  :key="t.id"
                  type="button"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition"
                  :class="form.tagIds.includes(t.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted'"
                  @click="toggleTag(t.id)"
                >
                  <Icon v-if="form.tagIds.includes(t.id)" name="lucide:check" size="10" />
                  {{ t.name }}
                </button>
              </div>
              <p v-else class="text-xs text-muted-foreground py-2">
                등록된 태그가 없습니다. "새 태그" 로 만들어 주세요.
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- 옵션 · 재고 -->
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-semibold">옵션 · 재고</CardTitle>
            <CardDescription class="text-xs">
              맛·중량 같은 선택지가 있으면 옵션 그룹을 추가하세요. 각 옵션값마다 추가 가격과 재고를 관리합니다.
              옵션이 필요 없으면 비워두고 <strong>기본 정보 섹션의 재고</strong> 만 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent class="pt-0">
            <ProductOptionsEditor v-model:options="form.options" />
          </CardContent>
        </Card>

        <!-- 고급 설정 (접힘) -->
        <details class="rounded-md border bg-card overflow-hidden group">
          <summary class="px-4 py-3 cursor-pointer select-none text-sm font-medium flex items-center gap-2 hover:bg-muted/30">
            <Icon name="lucide:chevron-right" size="14" class="transition-transform group-open:rotate-90" />
            고급 설정
            <span class="text-xs text-muted-foreground font-normal">원가 · 최대 구매 수량 · 이미지 대체 텍스트</span>
          </summary>
          <div class="p-4 border-t space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="mb-1.5 flex items-center gap-2">
                  <span>원가 <span class="text-xs text-muted-foreground">(비공개 · 마진 계산용)</span></span>
                  <span v-if="toKoreanCurrency(form.costPrice)" class="text-xs font-normal text-primary">
                    ≈ {{ toKoreanCurrency(form.costPrice) }}
                  </span>
                </Label>
                <CurrencyInput v-model="form.costPrice" placeholder="매입 단가 (예: 15,000)" />
              </div>
              <div>
                <Label class="mb-1.5 block">최대 구매 수량 <span class="text-xs text-muted-foreground">(1인당)</span></Label>
                <CurrencyInput v-model="form.maxPurchaseQuantity" placeholder="제한없음이면 비워두기" />
              </div>
            </div>
            <div>
              <Label class="mb-1.5 block">이미지 대체 텍스트 <span class="text-xs text-muted-foreground">(접근성)</span></Label>
              <Input v-model="form.primaryImageAltText" placeholder="예: 유기농 치킨 간식 패키지 정면" />
            </div>
          </div>
        </details>

        <!-- 저장 -->
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" :disabled="saving" @click="cancelEdit">취소</Button>
          <Button :disabled="saving" @click="submit">
            <Icon :name="isNew ? 'lucide:plus' : 'lucide:save'" size="14" class="mr-1" />
            {{ isNew ? '등록' : '저장' }}
          </Button>
        </div>
      </div>
    </div>

    <!-- 조회 모드 -->
    <div v-else-if="product" class="space-y-6">
      <div class="grid gap-6 md:grid-cols-[280px_1fr]">
        <div>
          <div class="aspect-square rounded-md border bg-muted overflow-hidden">
            <img
              v-if="product.primaryImage?.url"
              :src="product.primaryImage.url"
              :alt="product.primaryImage.altText ?? product.name"
              class="h-full w-full object-cover"
            />
            <div v-else class="h-full w-full grid place-items-center text-muted-foreground">
              <Icon name="lucide:image-off" size="32" />
            </div>
          </div>
        </div>

        <DetailSection title="기본 정보">
          <DetailField label="상품명" :value="product.name" full />
          <DetailField label="요약" :value="product.summary" full />
          <DetailField label="상태" :value="statusLabel" />
          <DetailField label="정가" :value="formatCurrency(product.regularPrice)" />
          <DetailField label="판매가" :value="formatCurrency(product.salePrice)" />
          <DetailField
            v-if="(product.options?.length ?? 0) === 0"
            label="재고"
            :value="`${formatNumber(product.stockQuantity ?? 0)}개`"
          />
        </DetailSection>
      </div>

      <DetailSection v-if="product.categories?.length || product.tags?.length" title="분류">
        <div class="col-span-2 space-y-3">
          <div v-if="product.categories?.length">
            <p class="mb-1.5 text-xs text-muted-foreground">카테고리</p>
            <div class="flex flex-wrap gap-1">
              <Badge v-for="c in product.categories" :key="c.id" variant="secondary">{{ c.name }}</Badge>
            </div>
          </div>
          <div v-if="product.tags?.length">
            <p class="mb-1.5 text-xs text-muted-foreground">태그</p>
            <div class="flex flex-wrap gap-1">
              <Badge v-for="t in product.tags" :key="t.id" variant="outline">{{ t.name }}</Badge>
            </div>
          </div>
        </div>
      </DetailSection>

      <!-- 옵션 · 재고 (그룹 단위로 테이블) -->
      <DetailSection
        v-if="product.options?.length"
        title="옵션 · 재고"
        :description="`${product.options.length}개 그룹 · ${product.options.reduce((n, g) => n + g.optionValues.length, 0)}개 옵션값`"
      >
        <div class="col-span-2 space-y-4">
          <div
            v-for="group in product.options"
            :key="group.id ?? group.name"
            class="border rounded-md overflow-hidden"
          >
            <div class="px-3 py-2 bg-muted/30 border-b text-sm font-medium">{{ group.name }}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>옵션값</TableHead>
                  <TableHead class="text-right w-32">추가 가격</TableHead>
                  <TableHead class="text-right w-24">재고</TableHead>
                  <TableHead class="w-28">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="v in group.optionValues" :key="v.id ?? v.value">
                  <TableCell>{{ v.value }}</TableCell>
                  <TableCell class="text-right">
                    <span v-if="v.additionalPrice && v.additionalPrice > 0" class="text-xs">+{{ formatCurrency(v.additionalPrice) }}</span>
                    <span v-else class="text-muted-foreground text-xs">-</span>
                  </TableCell>
                  <TableCell class="text-right">{{ formatNumber(v.stockQuantity) }}</TableCell>
                  <TableCell><StatusBadge :status="v.stockStatus" /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </DetailSection>

      <!-- 상세 설명 -->
      <DetailSection v-if="product.description" title="상세 설명">
        <div class="col-span-2 rte-content" v-html="product.description" />
      </DetailSection>

      <!-- 기타 정보 (접힘) -->
      <details class="rounded-md border bg-card overflow-hidden group">
        <summary class="px-4 py-3 cursor-pointer select-none text-sm font-medium flex items-center gap-2 hover:bg-muted/30">
          <Icon name="lucide:chevron-right" size="14" class="transition-transform group-open:rotate-90" />
          기타 정보
        </summary>
        <div class="p-4 border-t grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <p class="mb-0.5 text-xs text-muted-foreground">원가 (비공개)</p>
            <p class="font-medium">{{ product.costPrice ? formatCurrency(product.costPrice) : '-' }}</p>
          </div>
          <div>
            <p class="mb-0.5 text-xs text-muted-foreground">최대 구매 수량</p>
            <p class="font-medium">{{ product.maxPurchaseQuantity ?? '제한없음' }}</p>
          </div>
        </div>
      </details>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">상품을 찾을 수 없습니다.</div>
  </div>
</template>
