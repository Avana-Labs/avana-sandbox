import { NextResponse, type NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
