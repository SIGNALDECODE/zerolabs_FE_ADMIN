<script setup lang="ts" generic="T extends Record<string, unknown>">
/**
 * Column.key 는 slot name 으로도 쓰여 `select`, `period`, `actions` 같은 **가상 key**
 * (실제 row 필드가 아닌 slot 전용) 도 허용해야 한다. 그래서 `string` 으로 둔다.
 *
 * sortable 컬럼은 헤더 클릭으로 정렬 토글 (asc → desc → asc …).
 * 부모는 `sort-key`/`sort-dir` 을 넘기고 `@sort` 이벤트로 새 값을 받아 API 재호출.
 * 백엔드는 Spring Pageable 의 `sort=field,direction` 형식으로 매핑.
 */
interface Column {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  class?: string
  sortable?: boolean
}

type SortDirection = 'asc' | 'desc'
interface SortPayload { key: string, dir: SortDirection }

interface Props {
  columns: Column[]
  rows: T[]
  loading?: boolean
  rowKey?: string | ((row: T) => string | number)
  /** 데이터가 없을 때 메시지. */
  emptyMessage?: string
  /** 데이터가 없을 때 아이콘 (lucide). 검색 결과 없음 vs 초기 빈 상태 구분 시 활용. */
  emptyIcon?: string
  clickable?: boolean
  /** 현재 정렬 컬럼 key (서버측 정렬 상태 반영). */
  sortKey?: string | null
  sortDir?: SortDirection | null
  /** 로딩 시 보일 skeleton row 개수. 0 이면 단일 텍스트로 fallback. */
  skeletonRows?: number
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  emptyMessage: '데이터가 없습니다.',
  emptyIcon: 'lucide:inbox',
  clickable: false,
  sortKey: null,
  sortDir: null,
  skeletonRows: 5
})

const emit = defineEmits<{
  rowClick: [row: T]
  sort: [payload: SortPayload]
}>()

const getKey = (row: T, i: number): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  const v = row[props.rowKey]
  return (typeof v === 'string' || typeof v === 'number') ? v : i
}

const alignClass = (a?: string) => a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : ''
const cellClass = (col: Column) => [col.class, alignClass(col.align)].filter(Boolean).join(' ')

const onSort = (col: Column) => {
  if (!col.sortable) return
  const nextDir: SortDirection =
    props.sortKey === col.key && props.sortDir === 'asc' ? 'desc' : 'asc'
  emit('sort', { key: col.key, dir: nextDir })
}

const sortIcon = (col: Column) => {
  if (!col.sortable) return null
  if (props.sortKey !== col.key) return 'lucide:chevrons-up-down'
  return props.sortDir === 'desc' ? 'lucide:chevron-down' : 'lucide:chevron-up'
}
</script>

<template>
  <!--
    overflow-x-auto: 좁은 화면에서 컬럼 합계가 컨테이너 폭을 초과하면 가로 스크롤.
    페이지 본문은 세로 스크롤만 유지되고 테이블만 가로로 스크롤되어 운영자가 모든 컬럼 접근 가능.
  -->
  <Card class="overflow-hidden">
    <CardContent class="p-0 overflow-x-auto">
      <Table>
        <TableHeader>
          <!-- 헤더 띠: 진한 muted 배경 + 두꺼운 하단 보더 → 데이터 행과 명확히 분리 -->
          <!-- whitespace-nowrap: 좁은 컬럼에서 한글 라벨이 글자 단위로 줄바꿈되는 현상 방지 -->
          <TableRow class="bg-muted/70 hover:bg-muted/70 border-b-2 border-border">
            <TableHead
              v-for="col in columns"
              :key="col.key"
              :class="`${cellClass(col)} text-[11px] font-bold text-foreground/70 uppercase tracking-wider h-11 whitespace-nowrap`"
              :style="col.width ? { width: col.width, minWidth: col.width } : undefined"
            >
              <!-- sortable: 키보드 접근 가능한 button 로. align=right 면 아이콘이 라벨 왼쪽 -->
              <button
                v-if="col.sortable"
                type="button"
                class="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                :class="col.align === 'right' ? 'flex-row-reverse' : ''"
                @click="onSort(col)"
              >
                {{ col.label }}
                <Icon
                  :name="sortIcon(col) ?? 'lucide:chevrons-up-down'"
                  size="12"
                  :class="sortKey === col.key ? 'text-foreground' : 'opacity-40'"
                />
              </button>
              <span v-else>{{ col.label }}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- skeleton rows: 테이블 높이 점프 방지 + 로딩 동안 시각적 자리 잡기 -->
          <template v-if="loading && skeletonRows > 0">
            <TableRow
              v-for="i in skeletonRows"
              :key="`skeleton-${i}`"
              class="animate-pulse"
            >
              <TableCell
                v-for="col in columns"
                :key="col.key"
                :class="cellClass(col)"
              >
                <div class="h-3 rounded bg-muted/60" />
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else-if="loading">
            <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-10">
              <Icon name="lucide:loader-2" size="16" class="inline animate-spin mr-1.5 -mt-0.5" />
              불러오는 중…
            </TableCell>
          </TableRow>
          <TableRow v-else-if="!rows.length">
            <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-16">
              <div class="grid place-items-center h-12 w-12 mx-auto mb-3 rounded-full bg-muted/60">
                <Icon :name="emptyIcon" size="22" class="opacity-60" />
              </div>
              <p class="text-sm">{{ emptyMessage }}</p>
            </TableCell>
          </TableRow>
          <!-- 데이터 행: shadcn TableRow 가 onClick prop 을 노출하지 않아 native tr 직접 사용 -->
          <tr
            v-for="(row, i) in rows"
            :key="getKey(row, i)"
            :class="[
              'border-b transition-colors',
              i % 2 === 1 ? 'bg-muted/20' : '',
              clickable ? 'cursor-pointer hover:bg-accent/50' : 'hover:bg-muted/40'
            ]"
            @click="clickable && emit('rowClick', row)"
          >
            <TableCell
              v-for="col in columns"
              :key="col.key"
              :class="`${cellClass(col)} py-3`"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">{{ row[col.key] ?? '-' }}</slot>
            </TableCell>
          </tr>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
