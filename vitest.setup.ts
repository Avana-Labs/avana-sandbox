import "@testing-library/jest-dom/vitest"
import { beforeEach, vi } from "vitest"
import { setActiveCurrency } from "@/app/lib/currency/active-rate"

// The shared USD formatters read a module-level active currency. Reset it to USD
// before every test so one test selecting a non-USD currency can't leak into
// another test's formatted-string assertions.
beforeEach(() => {
  setActiveCurrency("USD")
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock)

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))
