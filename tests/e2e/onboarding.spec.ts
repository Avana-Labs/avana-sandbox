import { expect, test } from "@playwright/test"

const AUTH_TOKEN = process.env.AVANA_E2E_AUTH_TOKEN
const SECOND_AUTH_TOKEN = process.env.AVANA_E2E_SECOND_AUTH_TOKEN

function walletFromToken(token: string) {
  const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()) as {
    wallet?: string
    sub?: string
  }
  return (payload.wallet ?? payload.sub ?? "").toLowerCase()
}

async function installAuthToken(page: import("@playwright/test").Page, token: string) {
  const wallet = walletFromToken(token)
  await page.addInitScript(
    ({ jwt, address }) => {
      window.localStorage.setItem("avana.siwe.token.v1", JSON.stringify({ jwt, wallet: address }))
    },
    { jwt: token, address: wallet },
  )
  return wallet
}

async function attachStateScreenshot(locator: import("@playwright/test").Locator, name: string) {
  await expect(locator).toBeVisible()
  await test.info().attach(name, {
    body: await locator.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  })
}

async function attachResponsiveStateScreenshots(
  page: import("@playwright/test").Page,
  locator: import("@playwright/test").Locator,
  name: string,
) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await attachStateScreenshot(locator, `${name}-desktop`)
  await page.setViewportSize({ width: 390, height: 844 })
  await attachStateScreenshot(page.getByTestId("onboarding-canvas"), `${name}-mobile`)
  await page.setViewportSize({ width: 1440, height: 900 })
}

test.describe("sandbox onboarding", () => {
  test("rejects malformed and unsigned SIWE verification", async ({ request }) => {
    const malformed = await request.post("/api/siwe/verify", { data: { message: "invalid", signature: "0x00" } })
    expect(malformed.status()).toBe(400)

    const nonce = await request.get("/api/siwe/nonce")
    expect(nonce.ok()).toBeTruthy()
    const { nonce: value } = (await nonce.json()) as { nonce: string }
    const unsigned = await request.post("/api/siwe/verify", {
      data: {
        message: `127.0.0.1:3000 wants you to sign in with your Ethereum account:\n0x0000000000000000000000000000000000000001\n\nURI: http://127.0.0.1:3000\nVersion: 1\nChain ID: 1\nNonce: ${value}\nIssued At: ${new Date().toISOString()}`,
        signature: "0x00",
      },
    })
    expect(unsigned.status()).toBe(401)
  })

  test("connect state is responsive at desktop and mobile widths", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/onboarding")
    await expect(page.getByTestId("onboarding-canvas")).toHaveAttribute("data-onboarding-step", "connect")
    await attachStateScreenshot(page.getByTestId("onboarding-canvas"), "onboarding-connect-desktop")

    await page.setViewportSize({ width: 390, height: 844 })
    await attachStateScreenshot(page.getByTestId("onboarding-canvas"), "onboarding-connect-mobile")
  })

  test("authenticated wallet analyzes, claims, reloads, and rehydrates", async ({ page }) => {
    test.skip(!AUTH_TOKEN, "Set AVANA_E2E_AUTH_TOKEN to run authenticated Convex onboarding.")
    await installAuthToken(page, AUTH_TOKEN!)
    await page.goto("/onboarding")
    const canvas = page.getByTestId("onboarding-canvas")

    const initialStep = await canvas.getAttribute("data-onboarding-step")
    if (initialStep === "wallet") {
      await page.getByRole("button", { name: "Proceed" }).click()
      await expect(canvas).toHaveAttribute("data-onboarding-step", "analyzing")
      await attachResponsiveStateScreenshots(page, canvas, "onboarding-analyzing")
      await expect(canvas).toHaveAttribute("data-onboarding-step", "eligible", { timeout: 15_000 })
      await attachResponsiveStateScreenshots(page, canvas, "onboarding-eligible")
    }

    if ((await canvas.getAttribute("data-onboarding-step")) === "eligible") {
      await page.getByRole("button", { name: "Continue to allocation" }).click()
      await expect(canvas).toHaveAttribute("data-onboarding-step", "xConfirmed")
      await attachResponsiveStateScreenshots(page, canvas, "onboarding-allocation")
    }

    if ((await canvas.getAttribute("data-onboarding-step")) === "xConfirmed") {
      await page.getByRole("button", { name: "Claim your allocation" }).click()
      await expect(canvas).toHaveAttribute("data-onboarding-step", "claimPending")
      await attachResponsiveStateScreenshots(page, canvas, "onboarding-claim-pending")
    }

    await expect(canvas).toHaveAttribute("data-onboarding-step", "done", { timeout: 20_000 })
    await expect(page.getByText("Synthetic transaction receipt")).toBeVisible()
    await attachResponsiveStateScreenshots(page, canvas, "onboarding-success")

    await page.reload()
    await expect(page.getByTestId("onboarding-canvas")).toHaveAttribute("data-onboarding-step", "done")
  })

  test("switching wallets never exposes the previous wallet state", async ({ page }) => {
    test.skip(!AUTH_TOKEN || !SECOND_AUTH_TOKEN, "Set both authenticated wallet tokens to run isolation coverage.")
    const firstWallet = await installAuthToken(page, AUTH_TOKEN!)
    await page.goto("/onboarding")
    await expect(page.getByText(firstWallet.slice(0, 6), { exact: false })).toBeVisible()

    const secondWallet = walletFromToken(SECOND_AUTH_TOKEN!)
    await page.evaluate(
      ({ jwt, wallet }) => {
        window.localStorage.setItem("avana.siwe.token.v1", JSON.stringify({ jwt, wallet }))
        window.dispatchEvent(new StorageEvent("storage", { key: "avana.siwe.token.v1" }))
      },
      { jwt: SECOND_AUTH_TOKEN!, wallet: secondWallet },
    )
    await page.reload()
    await expect(page.getByText(secondWallet.slice(0, 6), { exact: false })).toBeVisible()
    await expect(page.getByText(firstWallet.slice(0, 6), { exact: false })).toHaveCount(0)
  })
})
