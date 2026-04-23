import { onBeforeRouteLeave } from 'vue-router'

/**
 * 폼 변경 감지 + 떠나기 경고.
 *
 * - `originalGetter`: 마지막 저장 시점의 폼 스냅샷. 보통 `() => snapshot.value` 형태.
 * - `currentGetter`: 현재 편집 중인 폼. `() => form` (reactive 객체) 그대로.
 * - `enabledGetter`: 추적 활성 조건. 편집 모드일 때만 true 로 (조회 모드면 추적 끔).
 *
 * 라우터 이동: `useConfirm().ask()` 로 한 번 확인.
 * 새로고침/탭 닫기: `beforeunload` 로 브라우저 native 경고 (메시지 커스텀 불가).
 *
 * 호출 측 책임:
 * - 저장 성공 시 `snapshot.value = JSON.parse(JSON.stringify(form))` 로 원본 동기화
 * - 취소 시에도 동일하게 원본으로 form 복원하면 isDirty 자동으로 false
 *
 * 비교 한계: File / Blob / 함수는 JSON 직렬화 불가 → 별도 추적 필요 (예: `imageFile.value`).
 */
export const useFormDirty = (
  originalGetter: () => unknown,
  currentGetter: () => unknown,
  enabledGetter: () => boolean = () => true,
  options: { warnTitle?: string, warnDescription?: string } = {}
) => {
  const warnTitle = options.warnTitle ?? '저장하지 않은 변경사항'
  const warnDescription = options.warnDescription
    ?? '편집 중인 내용이 저장되지 않았습니다. 페이지를 떠나시겠습니까?'

  const isDirty = computed(() => {
    if (!enabledGetter()) return false
    return !shallowJsonEqual(originalGetter(), currentGetter())
  })

  // 새로고침 / 탭 닫기 경고 (브라우저 정책상 메시지 커스텀 불가, 표시 여부만 제어)
  if (import.meta.client) {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty.value) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
  }

  // 라우터 이동 경고 (Nuxt 의 vue-router 통합)
  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true
    const ok = await useConfirm().ask(warnTitle, {
      description: warnDescription,
      confirmText: '이동',
      cancelText: '머무르기',
      tone: 'danger'
    })
    return ok
  })

  return { isDirty }
}

const shallowJsonEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true
  if (a == null || b == null) return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}
