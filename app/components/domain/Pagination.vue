<script setup lang="ts">
interface Props {
  page: number
  size: number
  total: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ change: [page: number] }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.size)))

const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.page - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const go = (p: number) => {
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('change', p)
}
</script>

<template>
  <div v-if="total > 0" class="flex items-center justify-between mt-4">
    <p class="text-xs text-muted-foreground">
      {{ total.toLocaleString() }}건 · {{ page }} / {{ totalPages }} 페이지
    </p>
    <div class="flex items-center gap-1">
      <Button variant="outline" size="sm" :disabled="page <= 1" @click="go(1)">«</Button>
      <Button variant="outline" size="sm" :disabled="page <= 1" @click="go(page - 1)">‹</Button>
      <Button
        v-for="p in pageNumbers"
        :key="p"
        :variant="p === page ? 'default' : 'outline'"
        size="sm"
        class="min-w-9"
        @click="go(p)"
      >
        {{ p }}
      </Button>
      <Button variant="outline" size="sm" :disabled="page >= totalPages" @click="go(page + 1)">›</Button>
      <Button variant="outline" size="sm" :disabled="page >= totalPages" @click="go(totalPages)">»</Button>
    </div>
  </div>
</template>
