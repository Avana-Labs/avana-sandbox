import { expect, test } from "@playwright/test"

test("dashboard page renders its product account tabs", async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto("/dashboard", { waitUntil: "commit" })

  const borrowTab = page.getByRole("tab", { name: "Borrow" }).first()
  await expect(borrowTab).toBeVisible({ timeout: 15_000 })
  await borrowTab.click()
  await expect(page.getByRole("heading", { name: "Borrow Account" })).toBeVisible({ timeout: 15_000 })
})

test("old portfolio and rewards routes redirect to the dashboard page", async ({ page }) => {
  test.setTimeout(30_000)

  await page.goto("/portfolio", { waitUntil: "commit" })
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })

  await page.goto("/rewards", { waitUntil: "commit" })
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
})
