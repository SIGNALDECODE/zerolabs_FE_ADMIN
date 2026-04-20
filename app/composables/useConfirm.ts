import { reactive } from 'vue'

/**
 * 전역 confirm 다이얼로그 상태.
 * - useConfirm().ask('삭제하시겠습니까?', { tone: 'danger' }) → Promise<boolean>
 * - <ConfirmDialog /> 가 app.vue 에 등록되어 있어야 함
 */
interface ConfirmState {
  open: boolean
  title: string
  description?: string
  confirmText: string
  cancelText: string
  tone: 'default' | 'danger'
  resolver: ((val: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  description: undefined,
  confirmText: '확인',
  cancelText: '취소',
  tone: 'default',
  resolver: null
})

export const useConfirmState = () => state

export const useConfirm = () => {
  const ask = (
    title: string,
    options: {
      description?: string
      confirmText?: string
      cancelText?: string
      tone?: 'default' | 'danger'
    } = {}
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      state.title = title
      state.description = options.description
      state.confirmText = options.confirmText ?? '확인'
      state.cancelText = options.cancelText ?? '취소'
      state.tone = options.tone ?? 'default'
      state.resolver = resolve
      state.open = true
    })
  }

  return { ask }
}
