/**
 * 백엔드 공통 응답 타입
 */

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  errorCode: ErrorCodeBody | null
}

export interface ErrorCodeBody {
  code: string
  message: string
  status: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  total_elements: number
}

export class ApiError extends Error {
  code?: string
  status?: string | number

  constructor(message: string, code?: string, status?: string | number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}
