<script setup lang="ts">
import { cn } from '~/lib/utils'

const props = defineProps<{
  modelValue?: string | number
  class?: string
  type?: string
}>()

defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<template>
  <input
    :value="modelValue"
    :type="type || 'text'"
    :class="cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
</template>
