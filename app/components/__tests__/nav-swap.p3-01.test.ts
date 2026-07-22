import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { SITE_STATIC_ROUTES } from "@/app/lib/site-static-routes"

describe("nav and runtime routes", () => {
  it("P3-01: keeps /swap reachable via sitemap but not the primary nav, and drops dead /rewards runtime route", () => {
    const nav = readFileSync(resolve(__dirname, "../site-nav.ts"), "utf8")
    const runtime = readFileSync(resolve(__dirname, "../product-runtime-providers.tsx"), "utf8")
    // /swap was removed from the primary nav (restored origin/main nav), but the page stays directly reachable.
    expect(nav).not.toMatch(/href: "\/swap"/)
    expect(SITE_STATIC_ROUTES.some((route) => route.route === "/swap")).toBe(true)
    expect(runtime).not.toMatch(/"\/rewards"/)
  })
})
