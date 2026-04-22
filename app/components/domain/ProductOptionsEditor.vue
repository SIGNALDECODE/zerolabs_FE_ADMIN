<script setup lang="ts">
/**
 * 상품 옵션 그룹 + 옵션값 에디터.
 *
 * 백엔드 모델 (ec9ed06 이후): 옵션값(ProductOptionValue) 단위로 재고·추가가격을 관리한다.
 * 기존의 "옵션 조합별 variant (cartesian product)" 개념은 제거되었다.
 *
 * v-model:options → ProductOptionForm[]
 *   각 옵션 그룹: { name, values: [{ name, additionalPrice, stockQuantity }] }
 */
export interface OptionValue {
  id?: number
  name: string
  additionalPrice: number | string
  stockQuantity: number | string
  sortOrder?: number
}

export interface OptionGroup {
  id?: number
  name: string
  values: OptionValue[]
}

const props = defineProps<{
  options: OptionGroup[]
}>()

const emit = defineEmits<{
  (e: 'update:options', v: OptionGroup[]): void
}>()

const toast = useToast()
const confirm = useConfirm()

const addGroup = () => {
  emit('update:options', [
    ...props.options,
    {
      name: '',
      values: [{ name: '', additionalPrice: 0, stockQuantity: 0 }]
    }
  ])
}

const removeGroup = async (gi: number) => {
  const ok = await confirm.ask('옵션 그룹 삭제', {
    description: `"${props.options[gi]?.name || '#' + (gi + 1)}" 그룹과 포함된 옵션값을 삭제합니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  emit('update:options', props.options.filter((_, i) => i !== gi))
}

const updateGroupName = (gi: number, name: string) => {
  emit('update:options', props.options.map((g, i) => i === gi ? { ...g, name } : g))
}

const addValue = (gi: number) => {
  emit(
    'update:options',
    props.options.map((g, i) =>
      i === gi
        ? { ...g, values: [...g.values, { name: '', additionalPrice: 0, stockQuantity: 0 }] }
        : g
    )
  )
}

const updateValue = (gi: number, vi: number, patch: Partial<OptionValue>) => {
  emit(
    'update:options',
    props.options.map((g, i) =>
      i === gi
        ? { ...g, values: g.values.map((v, j) => j === vi ? { ...v, ...patch } : v) }
        : g
    )
  )
}

const removeValue = (gi: number, vi: number) => {
  const group = props.options[gi]
  if (!group) return
  if (group.values.length <= 1) {
    toast.error('옵션값은 최소 1개 이상이어야 합니다. 그룹을 없애려면 그룹 삭제 버튼을 사용하세요.')
    return
  }
  emit(
    'update:options',
    props.options.map((g, i) =>
      i === gi ? { ...g, values: g.values.filter((_, j) => j !== vi) } : g
    )
  )
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(group, gi) in options"
      :key="gi"
      class="border rounded-md overflow-hidden"
    >
      <!-- 옵션 그룹 헤더 -->
      <div class="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b">
        <span class="text-xs font-mono text-muted-foreground w-10 shrink-0">#{{ gi + 1 }}</span>
        <Input
          :model-value="group.name"
          class="h-8 max-w-xs"
          placeholder="옵션 그룹명 (예: 맛, 중량, 연령대)"
          @update:model-value="v => updateGroupName(gi, String(v ?? ''))"
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

      <!-- 옵션값 테이블 -->
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/10 hover:bg-muted/10">
            <TableHead class="w-10 text-center">#</TableHead>
            <TableHead>옵션값</TableHead>
            <TableHead class="text-right w-36">추가 가격</TableHead>
            <TableHead class="text-right w-28">재고</TableHead>
            <TableHead class="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(val, vi) in group.values" :key="vi">
            <TableCell class="text-center text-xs text-muted-foreground">{{ vi + 1 }}</TableCell>
            <TableCell>
              <Input
                :model-value="val.name"
                class="h-8"
                placeholder="예: 치킨, 200g"
                @update:model-value="v => updateValue(gi, vi, { name: String(v ?? '') })"
              />
            </TableCell>
            <TableCell>
              <Input
                :model-value="val.additionalPrice"
                type="number"
                step="100"
                min="0"
                class="h-8 text-right"
                @update:model-value="v => updateValue(gi, vi, { additionalPrice: Math.max(0, Number(v ?? 0)) })"
              />
            </TableCell>
            <TableCell>
              <Input
                :model-value="val.stockQuantity"
                type="number"
                step="1"
                min="0"
                class="h-8 text-right"
                @update:model-value="v => updateValue(gi, vi, { stockQuantity: Math.max(0, Number(v ?? 0)) })"
              />
            </TableCell>
            <TableCell class="text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0 text-muted-foreground"
                @click="removeValue(gi, vi)"
              >
                <Icon name="lucide:x" size="12" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div class="px-2 py-1.5 border-t bg-muted/5">
        <Button type="button" variant="ghost" size="sm" class="h-7 text-xs" @click="addValue(gi)">
          <Icon name="lucide:plus" size="12" class="mr-1" /> 옵션 값 추가
        </Button>
      </div>
    </div>

    <Button type="button" variant="outline" @click="addGroup">
      <Icon name="lucide:plus" size="14" class="mr-1" /> 옵션 그룹 추가
    </Button>
  </div>
</template>
