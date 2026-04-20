/**
 * Admin API Proxy
 * 모든 /api/** 요청을 admin-api 백엔드로 프록시한다.
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

  let body: any = null
  if (!['GET', 'HEAD'].includes(method)) {
    body = isMultipart ? await readRawBody(event, false) : await readBody(event)
  }

  const requestHeaders: Record<string, string> = {}
  if (contentType) requestHeaders['Content-Type'] = contentType
  if (headers.cookie) requestHeaders.cookie = headers.cookie
  if (headers.authorization) requestHeaders.authorization = headers.authorization

  try {
    const response = await $fetch.raw(targetUrl, {
      method: method as any,
      query,
      body,
      headers: requestHeaders,
      credentials: 'include'
    })

    const setCookieHeaders = response.headers.getSetCookie?.() || []
    for (const cookie of setCookieHeaders) {
      const modifiedCookie = cookie
        .replace(/;\s*Secure/gi, '')
        .replace(/SameSite=None/gi, 'SameSite=Lax')
        .replace(/Path=\/api[^;]*/gi, 'Path=/')
        .replace(/Domain=[^;]+;?/gi, '')

      appendResponseHeader(event, 'Set-Cookie', modifiedCookie)
    }

    return response._data
  } catch (error: any) {
    const statusCode = error.response?.status || 500
    const errorData = error.data || { message: error.message }

    const setCookieHeaders = error.response?.headers?.getSetCookie?.() || []
    for (const cookie of setCookieHeaders) {
      const modifiedCookie = cookie
        .replace(/;\s*Secure/gi, '')
        .replace(/SameSite=None/gi, 'SameSite=Lax')
        .replace(/Path=\/api[^;]*/gi, 'Path=/')
        .replace(/Domain=[^;]+;?/gi, '')

      appendResponseHeader(event, 'Set-Cookie', modifiedCookie)
    }

    throw createError({ statusCode, data: errorData })
  }
})
