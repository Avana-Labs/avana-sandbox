/**
 * Lazy browser Sentry. `@sentry/nextjs` is ~63KB gzipped; a static import puts download, parse
 * and `init()` on every page's critical path ahead of hydration, so it loads on idle after
 * `load` instead. Errors thrown in the gap are buffered by two plain listeners and replayed
 * once `init` completes.
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

function loadSentry(): Promise<SentryModule> {
  if (modulePromise) return modulePromise
  modulePromise = import("@sentry/nextjs").then((Sentry) => {
    const isProd = process.env.NODE_ENV === "production"
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Local `npm run dev` still has a DSN in `.env.local`. Keep the SDK quiet there so
      // expected Convex OCC/auth noise and Fast Refresh unhandledRejections are not shipped
      // to the shared project (and so Sentry itself does not spam the browser console).
      enabled: isProd,

      // Session Replay is intentionally NOT enabled. replayIntegration pulls in rrweb (~hundreds
      // of KB). Error + performance reporting is unaffected. If replay is ever needed again,
      // load it from Sentry's CDN (a separate bundle + a CSP script-src allowance).
      integrations: [],

      // Sampled at 10% in production to bound trace volume; raise locally if needed.
      tracesSampleRate: isProd ? 0.1 : 0,

      ignoreErrors: [
        // Convex client surfaces thrown mutation guards as opaque "Server Error" strings.
        /^\[CONVEX M\(/,
        /REVISION_REQUIRED/,
        /UNAUTHENTICATED/,
      ],
    })
    window.removeEventListener("error", onEarlyError)
    window.removeEventListener("unhandledrejection", onEarlyRejection)
    if (isProd) {
      for (const error of earlyErrors.splice(0)) Sentry.captureException(error)
    } else {
      earlyErrors.length = 0
    }
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
