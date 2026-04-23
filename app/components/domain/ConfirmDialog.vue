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

/**
 * Enter 키 자동 제출.
 * - danger tone 은 실수 방지를 위해 Enter 차단 (명시적 클릭 필요)
 * - cancel 버튼에 포커스가 있을 때는 cancel 동작 우선 (브라우저 기본 button click)
 */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Enter' || e.isComposing) return
  const target = e.target as HTMLElement | null
  if (target?.tagName === 'BUTTON') return // 버튼 자체 click 우선
  if (state.tone === 'danger') return
  e.preventDefault()
  resolve(true)
}

/**
 * 다이얼로그 열림 시 default 액션 버튼에 자동 포커스.
 * - default tone: 확인 버튼 (즉시 Enter 가능)
 * - danger tone: 취소 버튼 (실수 방지 — Enter 시 취소가 안전)
 */
watch(() => state.open, async (open) => {
  if (!open) return
  await nextTick()
  await nextTick() // reka-ui 트랜지션 후 초기 포커스 트랩이 잡히고 난 뒤
  // 전역에 ConfirmDialog 인스턴스 1개라 querySelector 안전
  const selector = state.tone === 'danger'
    ? 'button[data-confirm-cancel]'
    : 'button[data-confirm-action]'
  ;(document.querySelector(selector) as HTMLElement | null)?.focus()
})
</script>

<template>
  <AlertDialog :open="state.open" @update:open="(v: boolean) => !v && resolve(false)">
    <AlertDialogContent @keydown="onKeydown">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ state.title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="state.description">
          {{ state.description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-confirm-cancel @click.capture="resolve(false)">
          {{ state.cancelText }}
        </AlertDialogCancel>
        <AlertDialogAction
          data-confirm-action
          :class="state.tone === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
          @click.capture="resolve(true)"
        >
          {{ state.confirmText }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
