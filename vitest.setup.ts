import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => {
  cleanup()
})

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }

  if (!("IntersectionObserver" in window)) {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
      root = null
      rootMargin = ""
      thresholds: number[] = []
    }
    ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      MockIntersectionObserver
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      MockIntersectionObserver
  }

  if (!("ResizeObserver" in window)) {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver
    ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver
  }

  if (!window.scrollTo) {
    window.scrollTo = (() => {}) as typeof window.scrollTo
  }
}

vi.mock("lightweight-charts", () => {
  const makeSeries = () => ({
    setData: vi.fn(),
    applyOptions: vi.fn(),
    priceScale: () => ({ applyOptions: vi.fn() }),
  })
  const makeChart = () => ({
    addSeries: vi.fn(() => makeSeries()),
    applyOptions: vi.fn(),
    subscribeCrosshairMove: vi.fn(),
    unsubscribeCrosshairMove: vi.fn(),
    timeScale: () => ({
      fitContent: vi.fn(),
      applyOptions: vi.fn(),
      subscribeVisibleTimeRangeChange: vi.fn(),
    }),
    priceScale: () => ({ applyOptions: vi.fn() }),
    resize: vi.fn(),
    remove: vi.fn(),
  })
  return {
    createChart: vi.fn(() => makeChart()),
    AreaSeries: { type: "area" },
    LineSeries: { type: "line" },
    HistogramSeries: { type: "histogram" },
    ColorType: { Solid: "solid" },
    CrosshairMode: { Normal: 0, Magnet: 1 },
    LineStyle: { Solid: 0, Dashed: 2 },
    PriceScaleMode: { Normal: 0 },
  }
})

vi.mock("next/navigation", () => {
  return {
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
    useParams: () => ({}),
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND")
    },
    redirect: (_url: string) => {
      throw new Error("NEXT_REDIRECT")
    },
  }
})
