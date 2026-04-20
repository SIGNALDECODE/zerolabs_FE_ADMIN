<script setup lang="ts" generic="T extends Record<string, any>">
interface Column<T> {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  class?: string
}

interface Props {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  rowKey?: keyof T | ((row: T) => string | number)
  emptyMessage?: string
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id' as any,
  emptyMessage: '데이터가 없습니다.',
  clickable: false
})

const emit = defineEmits<{ rowClick: [row: T] }>()

const getKey = (row: T, i: number): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  return row[props.rowKey as keyof T] ?? i
}

const alignClass = (a?: string) => a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : ''
const cellClass = (col: Column<T>) => [col.class, alignClass(col.align)].filter(Boolean).join(' ')
</script>

<template>
  <Card>
    <CardContent class="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              v-for="col in columns"
              :key="col.key"
              :class="cellClass(col)"
              :style="col.width ? { width: col.width } : undefined"
            >
              {{ col.label }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-10">
              불러오는 중…
            </TableCell>
          </TableRow>
          <TableRow v-else-if="!rows.length">
            <TableCell :colspan="columns.length" class="text-center text-muted-foreground py-10">
              {{ emptyMessage }}
            </TableCell>
          </TableRow>
          <TableRow
            v-for="(row, i) in rows"
            :key="getKey(row, i)"
            :class="clickable ? 'cursor-pointer' : ''"
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
