/**
 * Lazy browser Sentry.
 *
 * `@sentry/nextjs` is ~200KB (≈63KB gzipped) of JavaScript. Importing it statically from
 * `instrumentation-client.ts` put all of it — download, parse AND `Sentry.init()` — on the
 * critical path of every page, ahead of React hydration. Monitoring must never be the thing
 * that makes the page slow, so the SDK is loaded once the page is idle after `load`.
 *
 * Errors thrown before the SDK is up are buffered by two plain listeners and forwarded as soon
 * as `init` completes, so nothing is lost in the gap.
 */
import { scheduleIdle } from "@/app/lib/web3/schedule-idle"

type SentryModule = typeof import("@sentry/nextjs")

let modulePromise: Promise<SentryModule> | null = null
let loaded: SentryModule | null = null
const earlyErrors: unknown[] = []

function onEarlyError(event: ErrorEvent) {
  earlyErrors.push(event.error ?? new Error(event.message))
}

function onEarlyRejection(event: PromiseRejectionEvent) {
  earlyErrors.push(event.reason)
}

export function loadSentry(): Promise<SentryModule> {
  if (modulePromise) return modulePromise
  modulePromise = import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Session Replay is intentionally NOT enabled. replayIntegration pulls in rrweb (~hundreds
      // of KB). Error + performance reporting is unaffected. If replay is ever needed again,
      // load it from Sentry's CDN (a separate bundle + a CSP script-src allowance).
      integrations: [],

      // Sampled at 10% in production to bound trace volume; raise locally if needed.
      tracesSampleRate: 0.1,
    })
    window.removeEventListener("error", onEarlyError)
    window.removeEventListener("unhandledrejection", onEarlyRejection)
    for (const error of earlyErrors.splice(0)) Sentry.captureException(error)
    loaded = Sentry
    return Sentry
  })
  return modulePromise
}

/** Report an error now if the SDK is up, otherwise after it loads. Never throws. */
export function captureException(error: unknown) {
  if (loaded) {
    loaded.captureException(error)
    return
  }
  void loadSentry()
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => undefined)
}

/** Forwarded from `instrumentation-client.ts` so App Router navigations still become spans. */
export function onRouterTransitionStart(href: string, navigationType: string) {
  loaded?.captureRouterTransitionStart(href, navigationType)
}

/** Call once at startup: buffer early errors, then load the SDK off the critical path. */
export function scheduleSentryLoad() {
  if (typeof window === "undefined") return
  window.addEventListener("error", onEarlyError)
  window.addEventListener("unhandledrejection", onEarlyRejection)
  const start = () => scheduleIdle(() => void loadSentry().catch(() => undefined), 4000)
  if (document.readyState === "complete") start()
  else window.addEventListener("load", start, { once: true })
}
