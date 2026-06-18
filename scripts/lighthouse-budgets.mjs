import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { URL } from "node:url"

const baseUrl = process.env.LH_BASE_URL ?? "http://127.0.0.1:3001"
const routes = ["/", "/borrow", "/borrow/asset/usdc", "/lend", "/multiply", "/portfolio", "/rewards"]
const budgets = {
  performance: Number(process.env.LH_PERFORMANCE_MIN ?? 80),
  accessibility: Number(process.env.LH_ACCESSIBILITY_MIN ?? 100),
  "best-practices": Number(process.env.LH_BEST_PRACTICES_MIN ?? 95),
  seo: Number(process.env.LH_SEO_MIN ?? 100),
}

function runLighthouse(route, outputPath) {
  const url = new URL(route, baseUrl).toString()
  const args = [
    "lighthouse",
    url,
    "--output=json",
    `--output-path=${outputPath}`,
    "--chrome-flags=--headless --no-sandbox",
    "--quiet",
  ]

  return new Promise((resolve, reject) => {
    const child = spawn("npx", args, { stdio: "inherit" })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Lighthouse failed for ${route} with exit code ${code}`))
    })
  })
}

function score(report, category) {
  return Math.round((report.categories[category]?.score ?? 0) * 100)
}

const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "avana-lighthouse-"))
const failures = []

for (const route of routes) {
  const outputPath = path.join(outputDir, `${route.replaceAll("/", "_") || "home"}.json`)
  await runLighthouse(route, outputPath)
  const report = JSON.parse(await fs.readFile(outputPath, "utf8"))
  const row = { route }

  for (const category of Object.keys(budgets)) {
    row[category] = score(report, category)
    if (row[category] < budgets[category]) {
      failures.push(`${route} ${category}: ${row[category]} < ${budgets[category]}`)
    }
  }

  process.stdout.write(`${JSON.stringify(row)}\n`)
}

if (failures.length > 0) {
  process.stderr.write(`Lighthouse budgets failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`)
  process.exit(1)
}
