<script setup lang="ts">
/**
 * 상품 옵션 그룹 + 변형(SKU) 에디터.
 *
 * v-model:options  → ProductOptionRequest[]  ({ name, optionValues: string[] })
 * v-model:variants → ProductVariantRequest[] ({ sku, name, additionalPrice, stockQuantity, optionValueIds })
 *
 * 옵션 변경 시 cartesian product 로 variants 재생성.
 * 기존 variants 의 stock/price/sku 는 optionValueIds 매칭으로 최대한 유지.
 */
export interface OptionGroup {
  name: string
  optionValues: string[]
}

export interface Variant {
  sku: string
  name: string
  additionalPrice: number | string
  stockQuantity: number | string
  optionValueIds: number[]
}

const props = defineProps<{
  options: OptionGroup[]
  variants: Variant[]
  baseSku?: string
}>()

const toast = useToast()
const confirm = useConfirm()

const emit = defineEmits<{
  (e: 'update:options', v: OptionGroup[]): void
  (e: 'update:variants', v: Variant[]): void
}>()

const addGroup = () => {
  emit('update:options', [...props.options, { name: '', optionValues: [''] }])
}

const removeGroup = async (gi: number) => {
  const ok = await confirm.ask('옵션 그룹 삭제', {
    description: `"${props.options[gi]?.name || '#' + (gi + 1)}"을(를) 삭제하면 관련 변형이 재생성됩니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  const next = props.options.filter((_, i) => i !== gi)
  emit('update:options', next)
  regenerate(next, props.variants)
}

const updateGroupName = (gi: number, name: string) => {
  const next = props.options.map((g, i) => i === gi ? { ...g, name } : g)
  emit('update:options', next)
}

const addValue = (gi: number) => {
  const next = props.options.map((g, i) => i === gi ? { ...g, optionValues: [...g.optionValues, ''] } : g)
  emit('update:options', next)
  regenerate(next, props.variants)
}

const updateValue = (gi: number, vi: number, value: string) => {
  const next = props.options.map((g, i) =>
    i === gi
      ? { ...g, optionValues: g.optionValues.map((v, j) => j === vi ? value : v) }
      : g
  )
  emit('update:options', next)
  // regenerate only on name change if already exists (idx stays same)
  // since names are just labels, no need to regen. variant SKU may need rename if auto.
}

const removeValue = (gi: number, vi: number) => {
  const group = props.options[gi]
  if (!group) return
  if (group.optionValues.length <= 1) {
    toast.error('옵션값은 최소 1개 이상이어야 합니다.')
    return
  }
  const next = props.options.map((g, i) =>
    i === gi ? { ...g, optionValues: g.optionValues.filter((_, j) => j !== vi) } : g
  )
  emit('update:options', next)
  // variants referencing this vi need rebuild
  const keptVariants = props.variants
    .filter(v => (v.optionValueIds[gi] ?? -1) !== vi)
    .map(v => ({
      ...v,
      optionValueIds: v.optionValueIds.map((id, idx) => idx === gi && id > vi ? id - 1 : id)
    }))
  regenerate(next, keptVariants)
}

/**
 * Cartesian product of options' indices.
 * [[0,1],[0,1,2]] → [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]]
 */
const cartesian = (arrays: number[][]): number[][] =>
  arrays.reduce<number[][]>(
    (acc, cur) => acc.flatMap(a => cur.map(b => [...a, b])),
    [[]]
  )

const buildVariantName = (groups: OptionGroup[], ids: number[]) =>
  ids.map((vi, gi) => groups[gi]?.optionValues[vi] ?? '').filter(Boolean).join(' / ')

const buildVariantSku = (baseSku: string | undefined, groups: OptionGroup[], ids: number[]) => {
  const parts = ids.map((vi, gi) => {
    const val = groups[gi]?.optionValues[vi] ?? ''
    return val.toUpperCase().replace(/\s+/g, '-')
  }).filter(Boolean)
  return [baseSku || 'SKU', ...parts].join('-')
}

const regenerate = (groups: OptionGroup[], existing: Variant[]) => {
  if (!groups.length) {
    emit('update:variants', [])
    return
  }
  if (groups.some(g => !g.optionValues.length)) {
    emit('update:variants', [])
    return
  }
  const indices = groups.map(g => g.optionValues.map((_, i) => i))
  const combos = cartesian(indices)
  const next: Variant[] = combos.map(ids => {
    const match = existing.find(v => v.optionValueIds.length === ids.length && v.optionValueIds.every((x, i) => x === ids[i]))
    if (match) {
      // update generated fields (name) but keep sku/stock/price
      return { ...match, name: buildVariantName(groups, ids), optionValueIds: ids }
    }
    return {
      sku: buildVariantSku(props.baseSku, groups, ids),
      name: buildVariantName(groups, ids),
      additionalPrice: 0,
      stockQuantity: 0,
      optionValueIds: ids
    }
  })
  emit('update:variants', next)
}

const updateVariant = (idx: number, patch: Partial<Variant>) => {
  const next = props.variants.map((v, i) => i === idx ? { ...v, ...patch } : v)
  emit('update:variants', next)
}

const manualRegen = () => regenerate(props.options, props.variants)
</script>

<template>
  <div class="space-y-4">
    <!-- 옵션 그룹들 -->
    <div class="space-y-3">
      <div
        v-for="(group, gi) in options"
        :key="gi"
        class="border rounded-md p-3 bg-muted/20"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-mono text-muted-foreground w-10">#{{ gi + 1 }}</span>
          <Input
            :model-value="group.name"
            class="h-8 max-w-xs"
            placeholder="옵션 그룹명 (예: 맛, 중량, 연령대)"
            @update:model-value="(v) => updateGroupName(gi, String(v ?? ''))"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0 text-destructive ml-auto"
            @click="removeGroup(gi)"
          >
            <Icon name="lucide:trash-2" size="14" />
          </Button>
        </div>

        <div class="pl-12 flex flex-wrap gap-2 items-center">
          <div v-for="(val, vi) in group.optionValues" :key="vi" class="flex items-center gap-0.5">
            <Input
              :model-value="val"
              class="h-7 w-28 text-sm"
              placeholder="예: 치킨, 200g"
              @update:model-value="(v) => updateValue(gi, vi, String(v ?? ''))"
              @blur="manualRegen"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0 text-muted-foreground"
              @click="removeValue(gi, vi)"
            >
              <Icon name="lucide:x" size="12" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" class="h-7 text-xs" @click="addValue(gi)">
            <Icon name="lucide:plus" size="12" class="mr-0.5" /> 값 추가
          </Button>
        </div>
      </div>

      <Button type="button" variant="outline" @click="addGroup">
        <Icon name="lucide:plus" size="14" class="mr-1" /> 옵션 그룹 추가
      </Button>
    </div>

    <!-- 변형(SKU) 테이블 -->
    <div v-if="variants.length" class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium">변형 (SKU) — {{ variants.length }}개</h4>
        <Button type="button" variant="outline" size="sm" @click="manualRegen">
          <Icon name="lucide:refresh-cw" size="12" class="mr-1" /> 재생성
        </Button>
      </div>

      <div class="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>옵션 조합</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead class="text-right">추가 가격</TableHead>
              <TableHead class="text-right">재고</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(v, i) in variants" :key="v.optionValueIds.join('-')">
              <TableCell class="text-sm">{{ v.name }}</TableCell>
              <TableCell>
                <Input
                  :model-value="v.sku"
                  class="h-8 text-xs font-mono"
                  @update:model-value="(val) => updateVariant(i, { sku: String(val ?? '') })"
                />
              </TableCell>
              <TableCell class="text-right">
                <Input
                  :model-value="v.additionalPrice"
                  type="number"
                  step="100"
                  min="0"
                  class="h-8 text-sm w-28 ml-auto text-right"
                  @update:model-value="(val) => updateVariant(i, { additionalPrice: Math.max(0, Number(val ?? 0)) })"
                />
              </TableCell>
              <TableCell class="text-right">
                <Input
                  :model-value="v.stockQuantity"
                  type="number"
                  step="1"
                  min="0"
                  class="h-8 text-sm w-24 ml-auto text-right"
                  @update:model-value="(val) => updateVariant(i, { stockQuantity: Math.max(0, Number(val ?? 0)) })"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <div v-else-if="options.length && options.every(g => g.name.trim() && g.optionValues.length)" class="text-center text-muted-foreground text-xs py-4">
      옵션 그룹에 최소 1개 값을 추가하면 변형이 자동 생성됩니다.
    </div>
  </div>
</template>
