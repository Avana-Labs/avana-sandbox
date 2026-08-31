// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Session Replay is intentionally NOT enabled. replayIntegration pulls in rrweb (~hundreds of
  // KB), which Turbopack bundles onto the first-load critical path of EVERY page (it was the
  // single biggest chunk on `/`). With no reference to it anywhere, rrweb tree-shakes out entirely.
  // Error + performance reporting is unaffected. If replay is ever needed again, load it from
  // Sentry's CDN (a separate bundle + a CSP script-src allowance) rather than bundling it.
  integrations: [],

  // Sampled at 10% in production to bound trace volume; raise locally if needed.
  tracesSampleRate: 0.1,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
