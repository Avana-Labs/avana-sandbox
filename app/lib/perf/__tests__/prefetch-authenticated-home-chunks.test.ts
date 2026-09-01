/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest"
import { hasAuthenticatedHomePrefetchHint } from "@/app/lib/perf/prefetch-authenticated-home-chunks"

describe("prefetchAuthenticatedHomeChunks", () => {
  afterEach(() => {
    document.cookie = ""
  })

  it("detects the auth hint cookie", () => {
    expect(hasAuthenticatedHomePrefetchHint()).toBe(false)
    document.cookie = "avana_auth_hint=1"
    expect(hasAuthenticatedHomePrefetchHint()).toBe(true)
  })
})
