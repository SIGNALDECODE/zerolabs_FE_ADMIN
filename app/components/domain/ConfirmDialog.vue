<script setup lang="ts">
const state = useConfirmState()

/**
 * 동일 resolver 가 두 번 호출되지 않도록 첫 호출만 유효.
 * reka-ui 의 AlertDialogAction/Cancel 은 클릭 시 내부적으로 bubble 단계에서
 * `update:open(false)` 를 emit 한다. 버튼 핸들러(@click.capture) 는 캡처 단계에서
 * 먼저 실행되어 의도한 값(true/false)으로 resolver 를 소비하고, 이후 bubble 단계에서
 * 오는 `update:open(false)` 은 null 이 된 resolver 로 인해 no-op 이 된다.
 */
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
        <AlertDialogCancel @click.capture="resolve(false)">{{ state.cancelText }}</AlertDialogCancel>
        <AlertDialogAction
          :class="state.tone === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
          @click.capture="resolve(true)"
        >
          {{ state.confirmText }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
