import { toast } from 'vue-sonner'
import { resolveErrorMessage } from '~/utils/api/errorMessage'

/**
 * 토스트 유틸. alert 대체용.
 * - useToast().error('메시지') → 에러 스타일
 * - useToast().success('저장됨') → 성공 스타일
 * - useToast().info('안내')
 *
 * 에러 → 메시지 변환은 `resolveErrorMessage` 로 단일화. 코드(`AUTH_006` 등) 노출 금지.
 */
export const useToast = () => {
  const error = (err: unknown, fallback = '요청 처리 중 오류가 발생했습니다.') => {
    toast.error(resolveErrorMessage(err, fallback))
  }

  const success = (message: string) => toast.success(message)
  const info = (message: string) => toast.info(message)
  const warn = (message: string) => toast.warning(message)

  return { error, success, info, warn, toast }
}
