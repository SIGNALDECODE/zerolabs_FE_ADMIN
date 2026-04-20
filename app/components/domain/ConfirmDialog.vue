<script setup lang="ts">
const state = useConfirmState()

const resolve = (value: boolean) => {
  state.resolver?.(value)
  state.resolver = null
  state.open = false
}
</script>

<template>
  <AlertDialog :open="state.open" @update:open="(v: boolean) => !v && resolve(false)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ state.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="state.description">
          {{ state.description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="resolve(false)">{{ state.cancelText }}</AlertDialogCancel>
        <AlertDialogAction
          :class="state.tone === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
          @click="resolve(true)"
        >
          {{ state.confirmText }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
