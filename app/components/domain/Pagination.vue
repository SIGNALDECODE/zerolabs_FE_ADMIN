<script setup lang="ts">
/**
 * 페이지네이션 컴포넌트.
 * - 페이지 이동: `@change` 이벤트로 새 페이지 번호 emit (1-based)
 * - 페이지 사이즈 변경: `size-options` 가 1개 초과면 Select UI 노출, `@size-change` emit
 *   부모는 보통 `filters.size = s; filters.page = 1; load()` 패턴으로 처리
 *
 * 반응형:
 *  - 모바일: 정보·버튼이 세로로 stack. 가운데 페이지 번호는 양 끝 ‹ › 만 보이고
 *    중간 번호 버튼은 1개(현재 페이지) 만 표시 (버튼 폭 절약).
 *  - sm 이상: 한 줄로 정렬, 페이지 번호 5개 표시.
 */
interface Props {
  page: number
  size: number
  total: number
  /** size Select 옵션. 단일/0 길이면 사이즈 변경 UI 숨김. */
  sizeOptions?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  sizeOptions: () => [20, 30, 50, 100]
})

const emit = defineEmits<{
  change: [page: number]
  sizeChange: [size: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.size)))

const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.page - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

/** 현재 페이지가 보여주는 행 범위 — 운영자가 어디까지 봤는지 한눈에. */
const rangeStart = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.size + 1)
const rangeEnd = computed(() => Math.min(props.page * props.size, props.total))

const showSizeSelect = computed(() => (props.sizeOptions?.length ?? 0) > 1)

const sizeStr = computed<string>({
  get: () => String(props.size),
  set: (v) => {
    const next = Number(v)
    if (next && next !== props.size) emit('sizeChange', next)
  }
})

const go = (p: number) => {
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('change', p)
}
</script>

<template>
  <div
    v-if="total > 0"
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3 flex-wrap"
  >
    <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground order-2 sm:order-1">
      <span>
        전체 <strong class="text-foreground">{{ total.toLocaleString() }}</strong>건
        <span class="mx-1 text-muted-foreground/60">·</span>
        {{ rangeStart.toLocaleString() }}~{{ rangeEnd.toLocaleString() }}건
        <span class="mx-1 text-muted-foreground/60 hidden sm:inline">·</span>
        <span class="hidden sm:inline">{{ page }} / {{ totalPages }} 페이지</span>
      </span>
      <div v-if="showSizeSelect" class="flex items-center gap-1.5">
        <span class="text-muted-foreground/80">행</span>
        <Select v-model="sizeStr">
          <SelectTrigger class="h-7 w-[72px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="opt in sizeOptions" :key="opt" :value="String(opt)">
              {{ opt }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div class="flex items-center gap-1 order-1 sm:order-2 flex-wrap">
      <Button variant="outline" size="sm" :disabled="page <= 1" @click="go(1)">«</Button>
      <Button variant="outline" size="sm" :disabled="page <= 1" @click="go(page - 1)">‹</Button>
      <!-- 모바일: 현재 페이지만 강조해서 표시 (버튼 폭 절약) -->
      <span class="sm:hidden text-xs font-medium px-2 tabular-nums">{{ page }} / {{ totalPages }}</span>
      <!-- sm 이상: 페이지 번호 버튼 5개 -->
      <Button
        v-for="p in pageNumbers"
        :key="p"
        :variant="p === page ? 'default' : 'outline'"
        size="sm"
        class="min-w-9 hidden sm:inline-flex"
        @click="go(p)"
      >
        {{ p }}
      </Button>
      <Button variant="outline" size="sm" :disabled="page >= totalPages" @click="go(page + 1)">›</Button>
      <Button variant="outline" size="sm" :disabled="page >= totalPages" @click="go(totalPages)">»</Button>
    </div>
  </div>
</template>
