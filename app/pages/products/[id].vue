<script setup lang="ts">
import { formatCurrency, formatDate, formatNumber } from '~/utils/format'

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

const product = ref<any>(null)
const categories = ref<any[]>([])
const tags = ref<any[]>([])
const loading = ref(!isNew)
const saving = ref(false)
const editing = ref(isNew)

const imageFile = ref<File | null>(null)
const imagePreview = ref<string>('')

const form = reactive<any>({
  name: '',
  summary: '',
  description: '',
  categoryIds: [] as number[],
  tagIds: [] as number[],
  costPrice: null,
  regularPrice: null,
  salePrice: null,
  discountType: 'NONE',
  discountValue: 0,
  status: 'ON_SALE',
  maxPurchaseQuantity: null,
  primaryImageAltText: '',
  options: [] as { name: string, optionValues: string[] }[],
  variants: [] as { sku: string, name: string, additionalPrice: number | string, stockQuantity: number | string, optionValueIds: number[] }[]
})

const baseSku = computed(() => (form.name || 'SKU').replace(/\s+/g, '-').toUpperCase().slice(0, 20))

const statusLabel = computed(() => ({
  ACTIVE: '판매중', ON_SALE: '판매중', INACTIVE: '판매중지', DRAFT: '임시저장', DISCONTINUED: '단종', SOLD_OUT: '품절'
} as Record<string, string>)[product.value?.status] ?? product.value?.status)

const resetForm = () => {
  const p = product.value
  if (!p) return
  // Option groups → { name, optionValues[] }
  const optionGroups = (p.optionGroups ?? []).map((g: any) => ({
    name: g.name ?? '',
    optionValues: (g.values ?? g.optionValues ?? []).map((v: any) => typeof v === 'string' ? v : (v.name ?? v.value ?? ''))
  }))
  // Build optionValueIds mapping: for each variant, find indices in optionGroups
  const variants = (p.variants ?? []).map((v: any) => {
    const ids: number[] = optionGroups.map((g: any, gi: number) => {
      const variantVal = v.optionValues?.[gi]
      if (!variantVal) return -1
      const name = typeof variantVal === 'string' ? variantVal : (variantVal.name ?? variantVal.value)
      const idx = g.optionValues.indexOf(name)
      return idx >= 0 ? idx : 0
    })
    return {
      sku: v.sku ?? '',
      name: v.name ?? ids.map((i, gi) => optionGroups[gi]?.optionValues[i]).filter(Boolean).join(' / '),
      additionalPrice: v.additionalPrice ?? 0,
      stockQuantity: v.stock ?? v.stockQuantity ?? 0,
      optionValueIds: ids
    }
  })
  Object.assign(form, {
    name: p.name ?? '',
    summary: p.summary ?? '',
    description: p.description ?? '',
    categoryIds: (p.categories?.map((c: any) => c.id) ?? []) as number[],
    tagIds: (p.tags?.map((t: any) => t.id) ?? []) as number[],
    costPrice: p.price?.costPrice ?? null,
    regularPrice: p.price?.regularPrice ?? null,
    salePrice: p.price?.salePrice ?? null,
    discountType: p.price?.discountType ?? 'NONE',
    discountValue: p.price?.discountValue ?? 0,
    status: p.status ?? 'ON_SALE',
    maxPurchaseQuantity: p.maxPurchaseQuantity ?? null,
    primaryImageAltText: p.images?.[0]?.altText ?? '',
    options: optionGroups,
    variants
  })
  imageFile.value = null
  imagePreview.value = p.images?.[0]?.url ?? ''
}

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    product.value = await productApi.detail(id)
    resetForm()
  } finally { loading.value = false }
}

const loadCategories = async () => {
  try { categories.value = (await categoryApi.list()) as any[] } catch { categories.value = [] }
}

const loadTags = async () => {
  try { tags.value = (await tagApi.list()) as any[] } catch { tags.value = [] }
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
    const res: any = await tagApi.create({ name })
    toast.success('태그를 생성했습니다.')
    await loadTags()
    const newId = typeof res === 'object' ? (res.id ?? res) : res
    if (newId && !form.tagIds.includes(newId)) form.tagIds.push(newId)
  } catch (e) { toast.error(e, '태그 생성 실패') }
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

const toggleCategory = (catId: number) => {
  const i = form.categoryIds.indexOf(catId)
  if (i >= 0) form.categoryIds.splice(i, 1)
  else form.categoryIds.push(catId)
}

const onImageChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = () => { imagePreview.value = reader.result as string }
  reader.readAsDataURL(file)
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  if (isNew) return router.push('/products')
  editing.value = false
  resetForm()
}

const buildFormData = () => {
  const data: any = {
    name: form.name,
    summary: form.summary || undefined,
    description: form.description || undefined,
    categoryIds: form.categoryIds.length ? form.categoryIds : undefined,
    tagIds: form.tagIds.length ? form.tagIds : undefined,
    costPrice: form.costPrice != null && form.costPrice !== '' ? Number(form.costPrice) : undefined,
    regularPrice: Number(form.regularPrice),
    salePrice: Number(form.salePrice),
    discountType: form.discountType,
    discountValue: Number(form.discountValue) || 0,
    status: form.status,
    maxPurchaseQuantity: form.maxPurchaseQuantity != null && form.maxPurchaseQuantity !== '' ? Number(form.maxPurchaseQuantity) : undefined,
    primaryImageAltText: form.primaryImageAltText || undefined,
    options: form.options.length
      ? form.options.filter((g: any) => g.name?.trim()).map((g: any) => ({
        name: g.name,
        optionValues: g.optionValues.filter((v: string) => v?.trim())
      }))
      : undefined,
    variants: form.variants.length
      ? form.variants.map((v: any) => ({
        sku: v.sku,
        name: v.name,
        additionalPrice: Number(v.additionalPrice) || 0,
        stockQuantity: Number(v.stockQuantity) || 0,
        optionValueIds: v.optionValueIds
      }))
      : undefined
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
      const res: any = await productApi.create(buildFormData())
      const newId = typeof res === 'object' ? (res.id ?? res) : res
      toast.success('상품을 등록했습니다.')
      router.push(`/products/${newId}`)
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
  await productApi.remove(id)
  router.push('/products')
}

onMounted(() => { load(); loadCategories(); loadTags() })
useHead({ title: () => isNew ? '새 상품 등록 | ZeroLabs Admin' : `${product.value?.name ?? '상품'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-5xl">
    <DetailHeader
      :title="isNew ? '새 상품 등록' : (product?.name ?? (loading ? '…' : '상품'))"
      :subtitle="isNew ? '기본 정보 등록 후 상세에서 옵션/변형 추가' : (product ? `상품 ID · ${product.id}` : null)"
      back-to="/products"
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

    <!-- 폼 -->
    <div v-else-if="editing" class="grid gap-6 md:grid-cols-[280px_1fr]">
      <Card>
        <CardContent class="pt-6">
          <Label class="mb-2 block">대표 이미지</Label>
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
          <div class="mt-3">
            <Label class="mb-1.5 block text-xs">대체 텍스트 (접근성)</Label>
            <Input v-model="form.primaryImageAltText" placeholder="예: 베이직 코튼 티셔츠 정면" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 space-y-5">
          <div>
            <Label class="mb-1.5 block">상품명 <span class="text-destructive">*</span></Label>
            <Input v-model="form.name" placeholder="상품명" maxlength="255" />
          </div>

          <div>
            <Label class="mb-1.5 block">요약 설명</Label>
            <Input v-model="form.summary" placeholder="리스트에서 표시되는 짧은 설명" maxlength="255" />
          </div>

          <div>
            <Label class="mb-1.5 block">상세 설명 (HTML 가능)</Label>
            <Textarea v-model="form.description" rows="6" placeholder="상품 상세 설명" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <Label class="mb-1.5 block">원가 (비공개)</Label>
              <Input v-model="form.costPrice" type="number" step="100" placeholder="매입가" />
            </div>
            <div>
              <Label class="mb-1.5 block">정가 <span class="text-destructive">*</span></Label>
              <Input v-model="form.regularPrice" type="number" step="100" />
            </div>
            <div>
              <Label class="mb-1.5 block">판매가 <span class="text-destructive">*</span></Label>
              <Input v-model="form.salePrice" type="number" step="100" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="mb-1.5 block">할인 유형</Label>
              <select v-model="form.discountType" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="NONE">할인 없음</option>
                <option value="RATE">정률 (%)</option>
                <option value="AMOUNT">정액 (원)</option>
              </select>
            </div>
            <div>
              <Label class="mb-1.5 block">할인 값</Label>
              <Input v-model="form.discountValue" type="number" :step="form.discountType === 'RATE' ? 1 : 100" :disabled="form.discountType === 'NONE'" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="mb-1.5 block">상태 <span class="text-destructive">*</span></Label>
              <select v-model="form.status" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="ON_SALE">판매중</option>
                <option value="SOLD_OUT">품절</option>
                <option value="DISCONTINUED">단종</option>
              </select>
            </div>
            <div>
              <Label class="mb-1.5 block">최대 구매 수량 (1인당)</Label>
              <Input v-model="form.maxPurchaseQuantity" type="number" step="1" placeholder="제한없음이면 비워두기" />
            </div>
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

          <div>
            <Label class="mb-2 block">옵션 / 변형</Label>
            <p class="mb-3 text-xs text-muted-foreground">
              옵션 그룹(색상/사이즈 등)을 추가하면 조합별 SKU 가 자동 생성됩니다. 재고와 추가 가격은 조합별로 관리하세요.
            </p>
            <ProductOptionsEditor
              v-model:options="form.options"
              v-model:variants="form.variants"
              :base-sku="baseSku"
            />
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
    </div>

    <!-- 조회 -->
    <div v-else-if="product" class="space-y-6">
      <div class="grid gap-6 md:grid-cols-[280px_1fr]">
        <div>
          <div class="aspect-square rounded-md border bg-muted overflow-hidden">
            <img
              v-if="product.images?.[0]?.url"
              :src="product.images[0].url"
              :alt="product.name"
              class="h-full w-full object-cover"
            />
            <div v-else class="h-full w-full grid place-items-center text-muted-foreground">
              <Icon name="lucide:image-off" size="32" />
            </div>
          </div>
          <div v-if="product.images?.length > 1" class="mt-2 grid grid-cols-4 gap-1">
            <img
              v-for="img in product.images.slice(1, 5)"
              :key="img.id ?? img.url"
              :src="img.url"
              class="aspect-square rounded object-cover border"
            />
          </div>
        </div>

        <DetailSection title="기본 정보">
          <DetailField label="상품명" :value="product.name" full />
          <DetailField label="요약" :value="product.summary" full />
          <DetailField label="타입" :value="product.productType" />
          <DetailField label="상태" :value="statusLabel" />
          <DetailField label="브랜드" :value="product.brand?.name" />
          <DetailField label="조회수" :value="formatNumber(product.viewCount)" />
          <DetailField label="정가" :value="formatCurrency(product.price?.regularPrice)" />
          <DetailField label="판매가" :value="formatCurrency(product.price?.salePrice ?? product.price?.finalPrice)" />
          <DetailField label="최대 구매 수량" :value="product.maxPurchaseQuantity" />
          <DetailField label="등록일" :value="formatDate(product.createdAt)" />
        </DetailSection>
      </div>

      <DetailSection v-if="product.categories?.length" title="카테고리">
        <div class="col-span-2 flex flex-wrap gap-1">
          <Badge v-for="c in product.categories" :key="c.id" variant="secondary">{{ c.name }}</Badge>
        </div>
      </DetailSection>

      <DetailSection v-if="product.variants?.length" title="옵션 / 재고" :description="`${product.variants.length}개 옵션`">
        <div class="col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>옵션</TableHead>
                <TableHead class="text-right">판매가</TableHead>
                <TableHead class="text-right">재고</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="v in product.variants" :key="v.id">
                <TableCell class="font-mono text-xs">{{ v.sku }}</TableCell>
                <TableCell>{{ v.optionValues?.map((o: any) => o.name).join(' / ') || '-' }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(v.salePrice ?? v.price) }}</TableCell>
                <TableCell class="text-right">{{ formatNumber(v.stock) }}</TableCell>
                <TableCell><StatusBadge :status="v.stockStatus" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DetailSection>

      <DetailSection v-if="product.description" title="상세 설명">
        <div class="col-span-2 prose prose-sm max-w-none whitespace-pre-wrap text-sm">{{ product.description }}</div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">상품을 찾을 수 없습니다.</div>
  </div>
</template>
