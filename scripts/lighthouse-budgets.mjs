import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { URL } from "node:url"
import {
  CHROME_FLAGS,
  LIGHTHOUSE_CATEGORY_BUDGETS,
  LIGHTHOUSE_ONBOARDING_MARKER,
  LIGHTHOUSE_ROUTE_MARKERS,
  LIGHTHOUSE_ROUTES,
} from "./lighthouse-config.mjs"

const baseUrl = process.env.LH_BASE_URL ?? "http://127.0.0.1:3001"
const budgets = {
  performance: Number(process.env.LH_PERFORMANCE_MIN ?? LIGHTHOUSE_CATEGORY_BUDGETS.performance),
  accessibility: Number(process.env.LH_ACCESSIBILITY_MIN ?? LIGHTHOUSE_CATEGORY_BUDGETS.accessibility),
  "best-practices": Number(process.env.LH_BEST_PRACTICES_MIN ?? LIGHTHOUSE_CATEGORY_BUDGETS["best-practices"]),
  seo: Number(process.env.LH_SEO_MIN ?? LIGHTHOUSE_CATEGORY_BUDGETS.seo),
}
const runCount = Math.max(1, Number(process.env.LH_RUNS ?? 3))

function runLighthouse(route, outputPath) {
  const url = new URL(route, baseUrl).toString()
  const args = [
    "lighthouse",
    url,
    "--output=json",
    `--output-path=${outputPath}`,
    `--chrome-flags=${CHROME_FLAGS}`,
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

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle]
}

async function assertRouteContent(route) {
  const response = await fetch(new URL(route, baseUrl))
  const html = await response.text()
  const expectedMarker = LIGHTHOUSE_ROUTE_MARKERS[route]

  if (!response.ok) {
    throw new Error(`${route} returned ${response.status} during the Lighthouse preflight`)
  }
  if (html.includes(LIGHTHOUSE_ONBOARDING_MARKER)) {
    throw new Error(`${route} rendered the onboarding gate instead of the audited application surface`)
  }
  if (expectedMarker && !html.includes(expectedMarker)) {
    throw new Error(`${route} did not render its expected marker: ${expectedMarker}`)
  }
}

const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "avana-lighthouse-"))
const failures = []

for (const route of LIGHTHOUSE_ROUTES) {
  await assertRouteContent(route)
  const categoryScores = Object.fromEntries(Object.keys(budgets).map((category) => [category, []]))

  for (let run = 1; run <= runCount; run += 1) {
    const outputPath = path.join(outputDir, `${route.replaceAll("/", "_") || "home"}-${run}.json`)
    await runLighthouse(route, outputPath)
    const report = JSON.parse(await fs.readFile(outputPath, "utf8"))

    for (const category of Object.keys(budgets)) {
      categoryScores[category].push(score(report, category))
    }
  }

  const row = { route, runs: runCount }

  for (const category of Object.keys(budgets)) {
    row[category] = median(categoryScores[category])
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
