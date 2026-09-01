#!/usr/bin/env node
/**
 * First-load JS budget for `/` (root layout + page). Runs against a production
 * Next build (`npm run build`). Fails CI if the unique client JS for that route
 * group grows past the ceiling — a tripwire for accidental critical-path imports.
 */
import fs from "node:fs"
import path from "node:path"

const distDir = process.env.AVANA_NEXT_DIST_DIR || (fs.existsSync(".next-prod") ? ".next-prod" : ".next")
const MAX_BYTES = Number(process.env.HOME_BUNDLE_MAX_BYTES ?? 750 * 1024)
const manifestPath = path.join(distDir, "app-build-manifest.json")

if (!fs.existsSync(manifestPath)) {
  console.error(`[bundle-budget] missing ${manifestPath} — run \`npm run build\` first`)
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
const pages = manifest.pages ?? {}
const keys = Object.keys(pages).filter((key) => key === "/page" || key === "/layout" || key === "/_not-found/page")
const files = new Set()
for (const key of keys.length > 0
  ? keys
  : Object.keys(pages).filter((key) => key.includes("layout") || key === "/page")) {
  for (const file of pages[key] ?? []) {
    if (typeof file === "string" && file.endsWith(".js")) files.add(file)
  }
}

let total = 0
const rows = []
for (const file of files) {
  const candidates = [
    path.join(distDir, file),
    path.join(distDir, file.replace(/^\/_next\//, "")),
    path.join(process.cwd(), ".next", file),
    path.join(process.cwd(), distDir, file.startsWith("static") ? file : path.join("static", path.basename(file))),
  ]
  const hit = candidates.find((candidate) => fs.existsSync(candidate))
  if (!hit) continue
  const size = fs.statSync(hit).size
  total += size
  rows.push({ file, size })
}

rows.sort((a, b) => b.size - a.size)
console.log(
  `[bundle-budget] ${distDir} unique JS for / layout+page: ${rows.length} files, ${Math.round(total / 1024)} KB (max ${Math.round(MAX_BYTES / 1024)} KB)`,
)
for (const row of rows.slice(0, 12)) {
  console.log(`  ${String(Math.round(row.size / 1024)).padStart(5)} KB  ${row.file}`)
}

if (total === 0) {
  console.error("[bundle-budget] resolved 0 bytes — manifest shape may have changed")
  console.error(JSON.stringify({ keys: Object.keys(pages).slice(0, 20) }, null, 2))
  process.exit(1)
}

if (total > MAX_BYTES) {
  console.error(`[bundle-budget] over budget: ${total} > ${MAX_BYTES}`)
  process.exit(1)
}
