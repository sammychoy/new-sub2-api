function isStaticAssetPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/index.html' || pathname.endsWith('.html')) {
    return false
  }
  return pathname.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(pathname)
}

function isBackendRoute(pathname: string): boolean {
  if (
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/v1' ||
    pathname.startsWith('/v1/') ||
    pathname === '/v1beta' ||
    pathname.startsWith('/v1beta/') ||
    (pathname.startsWith('/setup/') && pathname.length > '/setup/'.length) ||
    pathname === '/backend-api' ||
    pathname.startsWith('/backend-api/') ||
    pathname === '/antigravity' ||
    pathname.startsWith('/antigravity/') ||
    pathname === '/health' ||
    pathname === '/responses' ||
    pathname.startsWith('/responses/') ||
    pathname === '/alpha/search' ||
    pathname === '/images' ||
    pathname.startsWith('/images/') ||
    pathname === '/videos' ||
    pathname.startsWith('/videos/') ||
    pathname === '/chat/completions' ||
    pathname === '/embeddings'
  ) {
    return true
  }
  return false
}

export default {
  async fetch(
    request: Request,
    env: { ASSETS?: Fetcher; ROUTER?: Fetcher; BACKEND_URL?: string }
  ): Promise<Response> {
    try {
      const url = new URL(request.url)

      // 1. Proxy backend API/gateway routes via Service Binding or BACKEND_URL fallback
      if (isBackendRoute(url.pathname)) {
        if (env.ROUTER) {
          return await env.ROUTER.fetch(request)
        }
        const backendBase = env.BACKEND_URL?.trim().replace(/\/+$/, '')
        if (backendBase && !backendBase.includes('<')) {
          let targetUrl: string | null = null
          try {
            const parsedBackend = new URL(backendBase)
            if (parsedBackend.protocol === 'http:' || parsedBackend.protocol === 'https:') {
              targetUrl = `${backendBase}${url.pathname}${url.search}`
            }
          } catch {
            // Invalid BACKEND_URL falls through to 502 Bad Gateway
          }
          if (targetUrl) {
            return await fetch(new Request(targetUrl, request))
          }
        }
        return new Response(
          JSON.stringify({ code: 502, message: 'Bad Gateway: Backend router is not configured' }),
          {
            status: 502,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            },
          }
        )
      }

      // 2. Route static assets or SPA index.html via ASSETS binding
      if (env.ASSETS) {
        if (isStaticAssetPath(url.pathname)) {
          const res = await env.ASSETS.fetch(request)
          const contentType = res.headers.get('content-type') || ''

          if (contentType.includes('text/html')) {
            return new Response('Asset Not Found', {
              status: 404,
              headers: {
                'content-type': 'text/plain; charset=utf-8',
                'cache-control': 'no-store',
              },
            })
          }

          if (url.pathname.startsWith('/assets/') && res.status === 200) {
            const headers = new Headers(res.headers)
            headers.set('Cache-Control', 'public, max-age=31536000, immutable')
            return new Response(res.body, {
              status: res.status,
              statusText: res.statusText,
              headers,
            })
          }

          if (res.status !== 404) {
            return res
          }
          return new Response('Asset Not Found', {
            status: 404,
            headers: {
              'content-type': 'text/plain; charset=utf-8',
              'cache-control': 'no-store',
            },
          })
        }

        // SPA routes fallback to index.html with strict NO-CACHE headers
        const indexUrl = new URL('/index.html', url.origin)
        const res = await env.ASSETS.fetch(new Request(indexUrl.toString(), {
          method: 'GET',
          headers: {
            'accept': 'text/html',
          },
        }))
        const headers = new Headers(res.headers)
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
        headers.set('Pragma', 'no-cache')
        headers.set('Expires', '0')
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        })
      }

      return new Response('Assets binding not configured', { status: 500 })
    } catch (err: any) {
      console.error('Frontend worker fetch error:', err)
      return new Response(`Frontend Worker Error: ${err?.message || 'Unknown error'}`, {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }
  },
}


