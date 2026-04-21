/**
 * 이미지 업로드 API (/admin/images)
 * - multipart `file` 파트 → `{ url, fileName, originalFileName, fileSize, contentType }`
 * - S3 + CloudFront CDN 반환 URL
 * - JSON 기반 도메인(배너·팝업)에서 URL 필드 채우기 용도
 */

export interface ImageUploadResponse {
  url: string
  fileName: string
  originalFileName: string
  fileSize: number
  contentType: string
}

export const useAdminImage = () => {
  const api = useApi()

  return {
    upload: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return api.post<ImageUploadResponse>('/admin/images', fd)
    }
  }
}
