import { NextResponse } from "next/server"

const ENDPOINT = "https://open.er-api.com/v6/latest/USD"
const REVALIDATE_SECONDS = 6 * 60 * 60

export async function GET() {
  const res = await fetch(ENDPOINT, {
    cache: "force-cache",
    next: { revalidate: REVALIDATE_SECONDS },
  })

  if (!res.ok) {
    return NextResponse.json({ result: "error", rates: null }, { status: 502 })
  }

  const data = (await res.json()) as { result?: string; rates?: Record<string, number> }
  return NextResponse.json(
    { result: data.result ?? "error", rates: data.rates ?? null },
    {
      headers: {
        "Cache-Control": `public, max-age=${REVALIDATE_SECONDS}, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS}`,
      },
    },
  )
}
