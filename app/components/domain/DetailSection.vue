<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle class="text-base">{{ title }}</CardTitle>
      <CardDescription v-if="description">{{ description }}</CardDescription>
    </CardHeader>
    <CardContent>
      <dl class="grid gap-x-6 grid-cols-1 md:grid-cols-2">
        <slot />
      </dl>
      <div v-if="$slots.footer" class="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-end">
        <slot name="footer" />
      </div>
    </CardContent>
  </Card>
</template>
