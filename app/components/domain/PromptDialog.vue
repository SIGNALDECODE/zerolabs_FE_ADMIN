<script setup lang="ts">
const state = usePromptState()
const value = ref('')

watch(() => state.open, (open) => {
  if (open) value.value = state.defaultValue ?? ''
})

const submit = () => {
  const trimmed = value.value.trim()
  if (!trimmed) return
  state.resolver?.(trimmed)
  state.resolver = null
  state.open = false
}

const cancel = () => {
  state.resolver?.(null)
  state.resolver = null
  state.open = false
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !state.multiline) submit()
}
</script>

<template>
  <Dialog :open="state.open" @update:open="(v: boolean) => !v && cancel()">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ state.title }}</DialogTitle>
        <DialogDescription v-if="state.description">{{ state.description }}</DialogDescription>
      </DialogHeader>

      <div class="py-2">
        <Textarea
          v-if="state.multiline"
          v-model="value"
          :placeholder="state.placeholder"
          rows="4"
          autofocus
        />
        <Input
          v-else
          v-model="value"
          :placeholder="state.placeholder"
          autofocus
          @keydown="onKey"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" @click="cancel">취소</Button>
        <Button :disabled="!value.trim()" @click="submit">확인</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
