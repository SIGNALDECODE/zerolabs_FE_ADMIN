import { toast } from 'vue-sonner'

/**
 * 토스트 유틸. alert 대체용.
 * - useToast().error('메시지') → 에러 스타일
 * - useToast().success('저장됨') → 성공 스타일
 * - useToast().info('안내')
 *
 * useApi 에서 던지는 ApiError 는 자동으로 `.message` 표시.
 */
export const useToast = () => {
  const error = (err: unknown, fallback = '요청 처리 중 오류가 발생했습니다.') => {
    if (typeof err === 'string') {
      toast.error(err)
      return
    }
    const e = (err && typeof err === 'object') ? err as { message?: string, data?: { errorCode?: { message?: string } } } : {}
    toast.error(e.message ?? e.data?.errorCode?.message ?? fallback)
  }

  const success = (message: string) => toast.success(message)
  const info = (message: string) => toast.info(message)
  const warn = (message: string) => toast.warning(message)

  return { error, success, info, warn, toast }
}
