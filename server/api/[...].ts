/**
 * Admin API Proxy (dev/prod 공통).
 * - FE 와 same-origin 으로 우회시켜 cross-site 쿠키 / CORS 이슈를 회피.
 * - dev/prod 모두 NUXT_PUBLIC_API_BASE=/api, API_BASE_URL=<BE 절대 URL> 로 설정.
 *   prod 도 Vercel(또는 호스팅)의 서버 환경변수에 API_BASE_URL 을 주입해야 한다.
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

  // HTTPS 요청이면 Secure 유지, HTTP(dev)면 제거. SameSite=None 은 same-origin 으로 우회되므로 Lax 로 격하.
  const xfProto = (headers['x-forwarded-proto'] || '').split(',')[0]?.trim()
  const isHttps = xfProto === 'https' || (event.node.req.socket as { encrypted?: boolean })?.encrypted === true
  const rewriteCookie = (cookie: string) => {
    let out = cookie
      .replace(/SameSite=None/gi, 'SameSite=Lax')
      .replace(/Path=\/api[^;]*/gi, 'Path=/')
      .replace(/Domain=[^;]+;?/gi, '')
    if (!isHttps) out = out.replace(/;\s*Secure/gi, '')
    return out
  }

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
