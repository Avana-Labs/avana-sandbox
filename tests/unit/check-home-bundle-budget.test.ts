import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { gzipSync } from "node:zlib"
import { afterEach, describe, expect, it } from "vitest"
import {
  analyzeInitialBundles,
  collectInitialFiles,
  parseClientReferenceManifest,
} from "../../scripts/check-home-bundle-budget.mjs"

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

describe("home bundle budget", () => {
  it("parses the Next 16 client-reference assignment", () => {
    const manifest = parseClientReferenceManifest(
      'globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {}; globalThis.__RSC_MANIFEST["/page"] = {"entryJSFiles":{"[project]/app/page":["static/page.js"]}};',
    )
    expect(manifest.entryJSFiles["[project]/app/page"]).toEqual(["static/page.js"])
  })

  it("deduplicates runtime, layout, and page entry chunks", () => {
    expect(
      collectInitialFiles({
        clientManifest: {
          entryJSFiles: {
            "[project]/app/layout": ["static/shared.js", "static/layout.js"],
            "[project]/app/page": ["static/shared.js", "static/page.js"],
          },
        },
        routeBuildManifest: { rootMainFiles: ["static/runtime.js", "static/shared.js"] },
      }),
    ).toEqual(["static/runtime.js", "static/shared.js", "static/layout.js", "static/page.js"])
  })

  it("measures gzip bytes and identifies forbidden runtime markers", () => {
    const distDir = fs.mkdtempSync(path.join(os.tmpdir(), "avana-bundle-budget-"))
    temporaryDirectories.push(distDir)
    fs.mkdirSync(path.join(distDir, "static"))
    const contents = Buffer.from("const client = new ConvexReactClient('https://example.test')")
    fs.writeFileSync(path.join(distDir, "static", "entry.js"), contents)

    const result = analyzeInitialBundles({
      distDir,
      files: ["static/entry.js"],
      forbiddenGroups: { convex: ["ConvexReactClient"] },
    })

    expect(result.rawBytes).toBe(contents.byteLength)
    expect(result.gzipBytes).toBe(gzipSync(contents, { level: 9 }).byteLength)
    expect(result.forbidden.get("convex")).toEqual(["static/entry.js"])
  })
})
