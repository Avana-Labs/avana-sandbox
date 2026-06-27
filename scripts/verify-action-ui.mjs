/* global console, process */

import { chromium } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const BASE = process.env.UI_BASE_URL ?? "http://127.0.0.1:3001"
const OUT = "/opt/cursor/artifacts/ui-verification"
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 560, height: 960 },
  { name: "xl", width: 1440, height: 900 },
]

const FLOWS = [
  {
    product: "lend",
    path: "/actions/lend/deposit?amount=100&market=usdc",
    reviewLabel: "Review",
    confirmLabel: "Deposit",
    dashboardTab: "lending",
    dashboardCta: /View Lend dashboard/i,
  },
  {
    product: "borrow",
    path: "/actions/borrow/borrow?asset=uni-v3-bluechip:usdc&amount=500",
    reviewLabel: "Review",
    confirmLabel: "Borrow",
    dashboardTab: "overview",
    dashboardCta: /View Borrow dashboard/i,
  },
  {
    product: "multiply",
    path: "/actions/multiply/multiply?multiplier=1.5&amount=1",
    reviewLabel: "Review",
    confirmLabel: "Multiply",
    dashboardTab: "looping",
    dashboardCta: /View Multiply dashboard/i,
  },
]

async function snap(page, file) {
  await page.screenshot({ path: join(OUT, file), fullPage: true })
}

async function waitForConfigure(page) {
  await page.waitForSelector('[data-testid="action-amount-card"]', { timeout: 60_000 })
  await page.getByRole("button", { name: "Review" }).waitFor({ state: "visible", timeout: 60_000 })
}

async function verifyFlow(browser, viewport, flow) {
  const tag = `${viewport.name}-${flow.product}`
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
  const page = await context.newPage()
  const record = { tag, steps: [], ok: true }

  try {
    await page.goto(`${BASE}${flow.path}`, { waitUntil: "networkidle", timeout: 120_000 })
    await waitForConfigure(page)
    record.steps.push({ step: "configure", status: "pass" })
    await snap(page, `${tag}-01-configure.png`)

    await page.getByRole("button", { name: flow.reviewLabel }).click()
    await page.waitForSelector('[data-testid="action-review-stage"]', { timeout: 10_000 })
    record.steps.push({ step: "review", status: "pass" })
    await snap(page, `${tag}-02-review.png`)

    await page.getByRole("button", { name: "Back" }).click()
    await page.waitForSelector('[data-testid="action-amount-card"]', { timeout: 10_000 })
    record.steps.push({ step: "review-back", status: "pass" })
    await snap(page, `${tag}-03-back-configure.png`)

    await page.getByRole("button", { name: flow.reviewLabel }).click()
    await page.getByRole("button", { name: flow.confirmLabel }).click()
    await page.waitForSelector('[data-testid="action-processing-stage"]', { timeout: 20_000 })
    record.steps.push({ step: "processing", status: (await page.getByText("Pending").isVisible()) ? "pass" : "fail" })
    await snap(page, `${tag}-04-processing.png`)

    await page.waitForSelector('[data-testid="action-success-stage"]', { timeout: 30_000 })
    record.steps.push({ step: "success", status: (await page.getByText("Confirmed").isVisible()) ? "pass" : "fail" })
    await snap(page, `${tag}-05-success.png`)

    const dashboardCta = page.getByRole("link", { name: flow.dashboardCta }).or(page.getByRole("button", { name: flow.dashboardCta }))
    await dashboardCta.waitFor({ state: "visible", timeout: 10_000 })
    const href = await dashboardCta.getAttribute("href")
    const hrefOk = href === `/dashboard?tab=${flow.dashboardTab}`
    record.steps.push({ step: "dashboard-href", status: hrefOk ? "pass" : href ? `fail:${href}` : "button-no-href" })
    if (!hrefOk && href) record.ok = false

    await dashboardCta.click()
    await page.waitForURL(`**/dashboard?tab=${flow.dashboardTab}`, { timeout: 30_000 })
    record.steps.push({ step: "dashboard-nav", status: "pass" })
    await snap(page, `${tag}-06-dashboard.png`)
  } catch (error) {
    record.ok = false
    record.steps.push({ step: "error", status: error instanceof Error ? error.message : String(error) })
    await snap(page, `${tag}-error.png`).catch(() => undefined)
  } finally {
    await context.close()
  }

  return record
}

async function verifyRewardsBlockedUi(browser, viewport) {
  const tag = `${viewport.name}-rewards-blocked`
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
  const page = await context.newPage()
  const record = { tag, steps: [], ok: true }
  try {
    await page.goto(`${BASE}/actions/rewards/claim`, { waitUntil: "networkidle", timeout: 120_000 })
    const blocked = await page.getByText("Nothing to claim").isVisible()
    record.steps.push({ step: "blocked-dialog", status: blocked ? "pass" : "fail" })
    if (!blocked) record.ok = false
    await snap(page, `${tag}.png`)
  } catch (error) {
    record.ok = false
    record.steps.push({ step: "error", status: error instanceof Error ? error.message : String(error) })
  } finally {
    await context.close()
  }
  return record
}

async function verifyBorrowSelectBack(browser, viewport) {
  const tag = `${viewport.name}-borrow-select-back`
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
  const page = await context.newPage()
  const record = { tag, steps: [], ok: true }

  try {
    await page.goto(`${BASE}/actions/borrow/borrow`, { waitUntil: "networkidle", timeout: 120_000 })
    await page.waitForSelector('[data-testid="action-select-stage"], [data-testid="action-amount-card"]', { timeout: 60_000 })
    const onSelect = await page.locator('[data-testid="action-select-stage"]').isVisible()
    if (!onSelect) {
      record.steps.push({ step: "select-stage", status: "skipped-single-asset" })
      return record
    }

    await page.locator('[data-testid="action-select-stage"] button').first().click()
    await page.waitForSelector('[data-testid="action-amount-card"]', { timeout: 10_000 })
    await page.locator('[data-testid="action-amount-card"] input').fill("500")
    await page.getByRole("button", { name: "Review" }).waitFor({ state: "visible", timeout: 30_000 })
    await page.getByRole("button", { name: "Back" }).click()
    await page.waitForSelector('[data-testid="action-select-stage"]', { timeout: 10_000 })
    record.steps.push({ step: "configure-back-to-select", status: "pass" })
    await snap(page, `${tag}.png`)
  } catch (error) {
    record.ok = false
    record.steps.push({ step: "error", status: error instanceof Error ? error.message : String(error) })
    await snap(page, `${tag}-error.png`).catch(() => undefined)
  } finally {
    await context.close()
  }

  return record
}

const browser = await chromium.launch({ headless: true })
const results = []

for (const viewport of VIEWPORTS) {
  for (const flow of FLOWS) {
    results.push(await verifyFlow(browser, viewport, flow))
  }
  results.push(await verifyRewardsBlockedUi(browser, viewport))
  results.push(await verifyBorrowSelectBack(browser, viewport))
}

await browser.close()

writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))

const failed = results.filter((r) => !r.ok)
console.log(`\n=== SUMMARY ===\nTotal: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`)
if (failed.length) process.exit(1)
