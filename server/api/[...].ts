/**
 * Admin API Proxy (dev 우회용).
 * - prod 배포 시 FE 가 BE 를 직접 호출하므로 사용 안 함 (NUXT_PUBLIC_API_BASE 가 절대 URL).
 * - dev 에서 BE 가 cross-site/HTTP 라 브라우저가 SameSite 쿠키를 못 실어보낼 때,
 *   FE 와 same-origin 으로 우회시키기 위해 사용.
 *   `.env` 에 API_BASE_URL=<BE 절대 URL>, NUXT_PUBLIC_API_BASE=/api 로 설정.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBaseUrl = config.apiBaseUrl

  if (!apiBaseUrl) {
    throw createError({
      statusCode: 500,
      message: 'API_BASE_URL 환경변수가 설정되지 않았습니다.'
    })
  }

  const pathParam = event.context.params?._ || ''
  const path = Array.isArray(pathParam) ? pathParam.join('/') : pathParam
  const targetUrl = `${apiBaseUrl}/${path}`

  const method = getMethod(event)
  const query = getQuery(event)
  const headers = getHeaders(event)

  const contentType = headers['content-type'] || ''
  const isMultipart = contentType.includes('multipart/form-data')

  let body: unknown = null
  if (!['GET', 'HEAD'].includes(method)) {
    body = isMultipart ? await readRawBody(event, false) : await readBody(event)
  }

  const requestHeaders: Record<string, string> = {}
  if (contentType) requestHeaders['Content-Type'] = contentType
  if (headers.cookie) requestHeaders.cookie = headers.cookie
  if (headers.authorization) requestHeaders.authorization = headers.authorization

  const rewriteCookie = (cookie: string) => cookie
    .replace(/;\s*Secure/gi, '')
    .replace(/SameSite=None/gi, 'SameSite=Lax')
    .replace(/Path=\/api[^;]*/gi, 'Path=/')
    .replace(/Domain=[^;]+;?/gi, '')

  try {
    const response = await $fetch.raw(targetUrl, {
      method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      query,
      body: body as Record<string, unknown> | null,
      headers: requestHeaders,
      credentials: 'include'
    })

    const setCookieHeaders = response.headers.getSetCookie?.() || []
    for (const cookie of setCookieHeaders) {
      appendResponseHeader(event, 'Set-Cookie', rewriteCookie(cookie))
    }

    return response._data
  } catch (error) {
    const e = error as { response?: { status?: number, headers?: Headers }, data?: unknown, message?: string }
    const statusCode = e.response?.status || 500
    const errorData = e.data || { message: e.message }

    const setCookieHeaders = e.response?.headers?.getSetCookie?.() || []
    for (const cookie of setCookieHeaders) {
      appendResponseHeader(event, 'Set-Cookie', rewriteCookie(cookie))
    }

    throw createError({ statusCode, data: errorData })
  }
})
