/**
 * live-concurrency.k6.js — live HTTP concurrency stress test for the Avana app.
 *
 * WHY THIS EXISTS
 * ---------------
 * The engine-level stress test exercises the pure simulation math in-process; it does
 * NOT prove that the deployed app (Next.js route handlers + the Convex read path behind
 * them) survives ~1,000 concurrent users hitting the balance/market read endpoints and
 * subscribing to live position/price updates. This k6 script drives that live HTTP path.
 *
 * SAFETY
 * ------
 *   - Parameterized by BASE_URL and defaults to a safe localhost origin.
 *   - Refuses to run against anything that looks like production (see the prod guard in
 *     setup()). Point it at a STAGING deployment.
 *   - Read-only: it only issues GET requests. It never mutates state, signs in, or writes.
 *
 * RUN
 * ---
 *   # local dev server (default)
 *   k6 run scripts/load/live-concurrency.k6.js
 *
 *   # staging (see scripts/load/README.md — never prod)
 *   BASE_URL=https://staging.example.internal k6 run scripts/load/live-concurrency.k6.js
 *
 *   # tune the peak (defaults to ~1000 VUs)
 *   PEAK_VUS=1000 BASE_URL=https://staging.example.internal k6 run scripts/load/live-concurrency.k6.js
 */

/* global __ENV */
import http from "k6/http"
import { check, sleep } from "k6"
import { Counter, Rate } from "k6/metrics"

// --- Configuration (all overridable via env) --------------------------------------

// Default to loopback so an accidental `k6 run` never touches a shared environment.
const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/+$/, "")
const PEAK_VUS = Number(__ENV.PEAK_VUS || 1000)

// p95 latency ceiling (ms) and the maximum tolerated share of failed requests.
const P95_MS = Number(__ENV.P95_MS || 800)
const MAX_ERROR_RATE = Number(__ENV.MAX_ERROR_RATE || 0.01)

// Read-only endpoints that model what a browsing/authenticated user polls. Adjust the
// paths to match the deployment under test; these are the app's balance/market reads.
const READ_ENDPOINTS = [
  "/", // home / market overview shell
  "/borrow", // market list read path
  "/lend", // supply market read path
  "/dashboard", // portfolio/balance read path
]

// --- Custom metrics ----------------------------------------------------------------

const droppedRequests = new Counter("dropped_requests")
const requestErrors = new Rate("request_errors")

// --- Load profile: ramp toward ~1,000 concurrent VUs and hold -----------------------

export const options = {
  scenarios: {
    live_concurrency: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: Math.ceil(PEAK_VUS * 0.25) },
        { duration: "2m", target: PEAK_VUS },
        { duration: "3m", target: PEAK_VUS }, // hold at ~1,000 concurrent users
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    // p95 latency ceiling — the primary SLO this test defends.
    http_req_duration: [`p(95)<${P95_MS}`],
    // No dropped requests: k6 records connection failures / timeouts as failed http_reqs.
    http_req_failed: [`rate<${MAX_ERROR_RATE}`],
    dropped_requests: ["count==0"],
    request_errors: [`rate<${MAX_ERROR_RATE}`],
  },
}

// --- Prod guard: fail fast rather than ever stress production -----------------------

function looksLikeProd(url) {
  const u = url.toLowerCase()
  return (
    u.includes("avana.cc") ||
    u.includes("://avana.") ||
    u.includes("www.avana") ||
    u.includes(".prod.") ||
    u.includes("production")
  )
}

export function setup() {
  if (looksLikeProd(BASE_URL)) {
    throw new Error(
      `Refusing to run: BASE_URL="${BASE_URL}" looks like production. ` +
        `This load test must only target localhost or a staging deployment.`,
    )
  }
  // Smoke the target once so a misconfigured BASE_URL fails before the ramp starts.
  const res = http.get(`${BASE_URL}/`, { tags: { name: "setup" } })
  check(res, { "target reachable": (r) => r.status !== 0 })
  return { baseUrl: BASE_URL }
}

// --- Virtual user loop --------------------------------------------------------------

export default function (data) {
  const base = data.baseUrl
  const path = READ_ENDPOINTS[Math.floor(Math.random() * READ_ENDPOINTS.length)]
  const res = http.get(`${base}${path}`, {
    tags: { name: path },
    // A user waiting >P95_MS on a read is effectively a dropped experience.
    timeout: `${Math.max(P95_MS * 5, 5000)}ms`,
  })

  // status 0 == connection refused / reset / timed out == a dropped request.
  if (res.status === 0) {
    droppedRequests.add(1)
  }
  const ok = res.status >= 200 && res.status < 400
  requestErrors.add(!ok)
  check(res, {
    "status is 2xx/3xx": () => ok,
    "not dropped": () => res.status !== 0,
  })

  // Model a browsing user's think-time between reads.
  sleep(Math.random() * 2 + 1)
}

/*
 * ------------------------------------------------------------------------------------
 * OPTIONAL: live position/price subscriptions (WebSocket) against STAGING only.
 * ------------------------------------------------------------------------------------
 * The app's live position/price updates flow over Convex's reactive WebSocket
 * (wss://<deployment>.convex.cloud). To prove the subscription path holds under
 * concurrency, run a second scenario against the STAGING Convex deployment. This is
 * left commented because it needs the staging Convex URL and a valid session/subscribe
 * frame, and MUST NEVER be pointed at the production Convex deployment.
 *
 * import ws from "k6/ws"
 *
 * const CONVEX_WS_URL = __ENV.CONVEX_WS_URL // e.g. wss://<staging-deployment>.convex.cloud
 *
 * export function subscribeToLiveUpdates() {
 *   if (!CONVEX_WS_URL) return
 *   if (looksLikeProd(CONVEX_WS_URL)) {
 *     throw new Error(`Refusing to subscribe: CONVEX_WS_URL="${CONVEX_WS_URL}" looks like production.`)
 *   }
 *   const res = ws.connect(CONVEX_WS_URL, {}, (socket) => {
 *     socket.on("open", () => {
 *       // Send the Convex Sync-protocol Connect + ModifyQuerySet frames here to
 *       // subscribe to the live positions/prices queries under test.
 *     })
 *     socket.on("message", () => {}) // count/inspect pushed updates
 *     socket.setTimeout(() => socket.close(), 30000)
 *   })
 *   check(res, { "ws upgrade 101": (r) => r && r.status === 101 })
 * }
 *
 * Add a matching scenario to `options.scenarios` that invokes subscribeToLiveUpdates,
 * e.g. a `constant-vus` scenario holding a few hundred long-lived sockets.
 */
