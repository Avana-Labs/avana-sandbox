import { render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Isolate the render guard: the drawer body pulls in Convex + the session
// provider, none of which matter for "does the trigger render at all".
vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }))
vi.mock("@/convex/_generated/api", () => ({ api: { sandbox: { dev: {}, umbrella: {} } } }))
vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  useAvanaIdentity: () => ({ walletId: `0x${"1".repeat(40)}` }),
}))

async function renderControls() {
  const { UmbrellaDevControls } = await import("../UmbrellaDevControls")
  return render(<UmbrellaDevControls />)
}

describe("UmbrellaDevControls — production render floor (P1-1)", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("renders nothing when the flag is off", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NEXT_PUBLIC_SANDBOX_DEV_CONTROLS", "")
    const { container } = await renderControls()
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing in a production build even when the flag is true", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_SANDBOX_DEV_CONTROLS", "true")
    const { container } = await renderControls()
    expect(container.firstChild).toBeNull()
  })

  it("renders the trigger in local dev when the flag is true", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NEXT_PUBLIC_SANDBOX_DEV_CONTROLS", "true")
    const { queryByLabelText } = await renderControls()
    expect(queryByLabelText("Toggle sandbox dev controls")).not.toBeNull()
  })
})
