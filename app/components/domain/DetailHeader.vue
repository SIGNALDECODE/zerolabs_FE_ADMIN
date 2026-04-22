<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string | null
  backTo?: string
}

defineProps<Props>()
</script>

<template>
  <header class="mb-6 pb-4 border-b">
    <div class="flex items-center gap-2 mb-3">
      <Button variant="ghost" size="sm" class="h-8 px-2 -ml-2 text-muted-foreground" @click="$router.push(backTo ?? '..')">
        <Icon name="lucide:chevron-left" size="16" />
        뒤로
      </Button>
    </div>
    <div class="flex items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-tight truncate">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm text-muted-foreground font-mono">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
