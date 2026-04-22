<script setup lang="ts" generic="T extends Record<string, unknown>">
/**
 * Column.key 는 slot name 으로도 쓰여 `select`, `period`, `actions` 같은 **가상 key**
 * (실제 row 필드가 아닌 slot 전용) 도 허용해야 한다. 그래서 `string` 으로 둔다.
 */
interface Column {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  class?: string
}

interface Props {
  columns: Column[]
  rows: T[]
  loading?: boolean
  rowKey?: string | ((row: T) => string | number)
  emptyMessage?: string
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  emptyMessage: '데이터가 없습니다.',
  clickable: false
})

const emit = defineEmits<{ rowClick: [row: T] }>()

const getKey = (row: T, i: number): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  const v = row[props.rowKey]
  return (typeof v === 'string' || typeof v === 'number') ? v : i
}

const alignClass = (a?: string) => a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : ''
const cellClass = (col: Column) => [col.class, alignClass(col.align)].filter(Boolean).join(' ')
</script>

<template>
  <Card>
    <CardContent class="p-0">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/40 hover:bg-muted/40 border-b">
            <TableHead
              v-for="col in columns"
              :key="col.key"
              :class="`${cellClass(col)} text-xs font-semibold text-muted-foreground uppercase tracking-wider`"
              :style="col.width ? { width: col.width } : undefined"
            >
              {{ col.label }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-10">
              <Icon name="lucide:loader-2" size="16" class="inline animate-spin mr-1.5 -mt-0.5" />
              불러오는 중…
            </TableCell>
          </TableRow>
          <TableRow v-else-if="!rows.length">
            <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-12">
              <Icon name="lucide:inbox" size="24" class="block mx-auto mb-2 opacity-50" />
              {{ emptyMessage }}
            </TableCell>
          </TableRow>
          <TableRow
            v-for="(row, i) in rows"
            :key="getKey(row, i)"
            :class="clickable ? 'cursor-pointer transition-colors hover:bg-muted/30' : ''"
            @click="clickable && emit('rowClick', row)"
          >
            <TableCell
              v-for="col in columns"
              :key="col.key"
              :class="cellClass(col)"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">{{ row[col.key] ?? '-' }}</slot>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
