import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const APP_ROOTS = ["borrow", "lend", "multiply", "dashboard", "umbrella", "swap", "ask", "components"]
const USER_OWNED_EXCLUSIONS = new Set(["app/components/sandbox/onboarding-flow.tsx"])

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : collectTsxFiles(path)
    return entry.name.endsWith(".tsx") ? [path] : []
  })
}

describe("product typography scale", () => {
  it("uses semantic size tokens instead of page-specific pixel sizes", () => {
    const projectRoot = resolve(__dirname, "../../..")
    const roots = [...APP_ROOTS.map((root) => resolve(projectRoot, "app", root)), resolve(projectRoot, "components")]
    const violations = roots
      .flatMap(collectTsxFiles)
      .filter((file) => !USER_OWNED_EXCLUSIONS.has(file.slice(projectRoot.length + 1)))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8")
        return [...source.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)]
          .filter((match) => Number(match[1]) >= 10)
          .map((match) => `${file.slice(projectRoot.length + 1)}:${match[0]}`)
      })

    expect(violations).toEqual([])
  })
})
