import { reactive } from 'vue'

/**
 * 전역 prompt 다이얼로그 상태.
 * - usePrompt().ask('새 태그 이름') → Promise<string | null> (취소 시 null)
 * - <PromptDialog /> 가 app.vue 에 등록되어 있어야 함
 */
interface PromptState {
  open: boolean
  title: string
  description?: string
  placeholder?: string
  defaultValue: string
  multiline: boolean
  resolver: ((val: string | null) => void) | null
}

const state = reactive<PromptState>({
  open: false,
  title: '',
  description: undefined,
  placeholder: undefined,
  defaultValue: '',
  multiline: false,
  resolver: null
})

export const usePromptState = () => state

export const usePrompt = () => {
  const ask = (
    title: string,
    options: {
      description?: string
      placeholder?: string
      defaultValue?: string
      multiline?: boolean
    } = {}
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      state.title = title
      state.description = options.description
      state.placeholder = options.placeholder
      state.defaultValue = options.defaultValue ?? ''
      state.multiline = options.multiline ?? false
      state.resolver = resolve
      state.open = true
    })
  }

  return { ask }
}
