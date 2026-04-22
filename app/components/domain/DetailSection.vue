<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <div class="flex items-center gap-2">
        <span class="h-4 w-0.5 bg-primary/70 rounded-full" aria-hidden="true" />
        <CardTitle class="text-sm font-semibold">{{ title }}</CardTitle>
        <span v-if="description" class="text-xs text-muted-foreground">· {{ description }}</span>
      </div>
    </CardHeader>
    <CardContent class="pt-0">
      <dl class="grid gap-x-6 grid-cols-1 md:grid-cols-2">
        <slot />
      </dl>
      <div v-if="$slots.footer" class="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-end">
        <slot name="footer" />
      </div>
    </CardContent>
  </Card>
</template>
