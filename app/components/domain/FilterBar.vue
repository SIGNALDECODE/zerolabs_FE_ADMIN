<script setup lang="ts">
defineEmits<{ search: [] }>()
</script>

<template>
  <Card class="mb-4">
    <CardContent class="pt-6">
      <div class="flex flex-wrap items-center gap-2">
        <slot />
        <div class="ml-auto flex items-center gap-2">
          <slot name="actions">
            <Button @click="$emit('search')">
              <Icon name="lucide:search" size="14" class="mr-1" /> 검색
            </Button>
          </slot>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
