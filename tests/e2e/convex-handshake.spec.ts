import { expect, test } from "@playwright/test"

/**
 * Guest loads must not open a Convex WebSocket. Signed-in handshake (exactly one
 * Authenticate, no query Removes on first paint) is opt-in: set
 * AVANA_HANDSHAKE_E2E=1 and provide a real session against a running backend.
 */
test("guest home does not open a Convex sync socket", async ({ page }) => {
  const sockets: string[] = []
  page.on("websocket", (ws) => {
    sockets.push(ws.url())
  })
  await page.goto("/")
  await page.waitForTimeout(2500)
  expect(
    sockets.filter((url) => url.includes("convex.cloud") || (url.includes("/api/") && url.includes("sync"))),
  ).toEqual([])
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
