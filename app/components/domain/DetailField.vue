<script setup lang="ts">
defineProps<{
  label: string
  value?: string | number | null
  mono?: boolean
  full?: boolean
}>()
</script>

<template>
  <div :class="['py-2 grid grid-cols-[120px_1fr] gap-2 text-sm border-b border-dashed border-border/60 last:border-0', full ? 'col-span-2' : '']">
    <dt class="text-muted-foreground">{{ label }}</dt>
    <dd :class="['text-foreground break-all', mono ? 'font-mono text-xs' : '']">
      <slot>{{ value ?? '-' }}</slot>
    </dd>
  </div>
</template>
