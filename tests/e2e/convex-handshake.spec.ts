import { expect, test } from "@playwright/test"

/**
 * Guest loads must not open a Convex WebSocket or mint SIWE access tokens.
 * Default Playwright runs with open-gate for most product e2e; these assertions
 * still catch Convex/SIWE leakage on the guest home path.
 *
 * For a production-equivalent closed-gate proof, set:
 *   AVANA_GUEST_CLOSED_GATE_E2E=1
 *   PLAYWRIGHT_BASE_URL=<prod-like server without NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE>
 * and skip starting the default open-gate webServer (`reuseExistingServer`).
 */
test("guest home does not open a Convex sync socket or request a SIWE token", async ({ page }) => {
  const sockets: string[] = []
  const tokenRequests: string[] = []
  page.on("websocket", (ws) => {
    sockets.push(ws.url())
  })
  page.on("request", (request) => {
    if (request.url().includes("/api/siwe/token")) tokenRequests.push(request.url())
  })
  await page.goto("/")
  await page.waitForTimeout(2500)
  expect(
    sockets.filter((url) => url.includes("convex.cloud") || (url.includes("/api/") && url.includes("sync"))),
  ).toEqual([])
  expect(tokenRequests).toEqual([])
})

test("closed-gate guest home keeps Convex/wallet SDKs out of initial scripts", async ({ page }) => {
  test.skip(
    process.env.AVANA_GUEST_CLOSED_GATE_E2E !== "1",
    "Set AVANA_GUEST_CLOSED_GATE_E2E=1 against a server without NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE.",
  )

  const response = await page.goto("/", { waitUntil: "domcontentloaded" })
  expect(response?.ok()).toBeTruthy()
  const html = await page.content()
  expect(html).not.toMatch(/avana\.siwe\.token\.v1/)
  expect(html.toLowerCase()).not.toContain('"jwt"')

  const scriptSrcs = await page.locator("script[src]").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLScriptElement).src).filter(Boolean),
  )
  const bodies = await Promise.all(
    scriptSrcs.slice(0, 40).map(async (src) => {
      try {
        const res = await page.request.get(src)
        return res.ok() ? await res.text() : ""
      } catch {
        return ""
      }
    }),
  )
  const joined = bodies.join("\n")
  expect(joined).not.toMatch(/\bwagmi\b/)
  expect(joined).not.toMatch(/\bviem\b/)
  expect(joined).not.toMatch(/connectkit/i)
  expect(joined).not.toMatch(/ConvexReactClient/)
})

test("signed-in load authenticates Convex once and does not Remove queries", async ({ page }) => {
  test.skip(!process.env.AVANA_HANDSHAKE_E2E, "set AVANA_HANDSHAKE_E2E=1 against a real SIWE + Convex session")

  const frames: string[] = []
  page.on("websocket", (ws) => {
    if (!ws.url().includes("convex")) return
    ws.on("framessent", (event) => {
      frames.push(event.payload)
    })
  })
  await page.goto("/")
  await page.waitForTimeout(8000)
  const authenticate = frames.filter((frame) => frame.includes('"Authenticate"'))
  const removes = frames.filter((frame) => frame.includes('"Remove"'))
  expect(authenticate.length, `Authenticate frames: ${authenticate.length}`).toBe(1)
  expect(removes, "no ModifyQuerySet Remove on first load").toEqual([])
})
