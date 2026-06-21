import { chromium } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const OUT = "/opt/cursor/artifacts/leverage-picker-verify"
mkdirSync(OUT, { recursive: true })
const BASE = "http://127.0.0.1:3001"
const path = "/actions/multiply/multiply?multiplier=1.5&amount=1&market=eth-usdt"

const browser = await chromium.launch()
const report = []

for (const [name, width, height, isMobile] of [
  ["mobile", 390, 844, true],
  ["desktop", 560, 960, false],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    hasTouch: isMobile,
    isMobile,
  })
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60_000 })
  await page.waitForSelector('[data-testid="action-leverage-scroll-picker"]', { timeout: 60_000 })

  const before = await page.getByTestId("leverage-value").textContent()
  await page.screenshot({ path: join(OUT, `${name}-initial.png`), fullPage: true })

  const slider = page.locator('[data-testid="action-leverage-scroll-picker"] [role="slider"]')
  const box = await slider.boundingBox()
  if (!box) throw new Error("no slider box")

  if (isMobile) {
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 25 })
    await page.mouse.up()
  } else {
    await slider.hover({ position: { x: box.width / 2, y: box.height / 2 } })
    await page.mouse.wheel(600, 0)
  }

  await page.waitForTimeout(800)
  const afterScroll = await page.getByTestId("leverage-value").textContent()
  await page.screenshot({ path: join(OUT, `${name}-after-scroll.png`), fullPage: true })

  await page.getByTestId("action-leverage-scroll-picker").getByRole("button", { name: "Max" }).click()
  await page.waitForTimeout(500)
  const afterMax = await page.getByTestId("leverage-value").textContent()
  await page.screenshot({ path: join(OUT, `${name}-after-max.png`), fullPage: true })

  report.push({
    name,
    before,
    afterScroll,
    afterMax,
    scrollChanged: before !== afterScroll,
    maxIs20: afterMax?.includes("20"),
  })
  await page.close()
}

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
