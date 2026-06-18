import { NextResponse, type NextRequest } from "next/server"

function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString("base64")
}

function buildCsp(nonce: string) {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ]

  if (process.env.NODE_ENV === "production") {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ")
}

export function proxy(request: NextRequest) {
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set("Content-Security-Policy", buildCsp(nonce))
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
