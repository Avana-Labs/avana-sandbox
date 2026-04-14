import { createElement } from "react"
import { act, render, screen } from "@testing-library/react"
import { DeferredRender } from "@/app/components/deferred-render"

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  static options: IntersectionObserverInit[] = []
  callback: IntersectionObserverCallback
  disconnect = vi.fn()

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
    MockIntersectionObserver.options.push(options ?? {})
  }

  observe() {}
  unobserve() {}

  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}

describe("DeferredRender", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = []
    MockIntersectionObserver.options = []
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("shows the fallback before the section is visible", () => {
    render(
      createElement(
        DeferredRender,
        { fallback: createElement("div", null, "Loading section") },
        createElement("div", null, "Loaded section"),
      ),
    )

    expect(screen.getByText("Loading section")).toBeInTheDocument()
    expect(screen.queryByText("Loaded section")).not.toBeInTheDocument()
  })

  it("renders children after intersection", async () => {
    render(
      createElement(
        DeferredRender,
        { fallback: createElement("div", null, "Loading section") },
        createElement("div", null, "Loaded section"),
      ),
    )

    await act(async () => {
      MockIntersectionObserver.instances[0].trigger(true)
    })

    expect(screen.getByText("Loaded section")).toBeInTheDocument()
  })

  it("passes the provided rootMargin to IntersectionObserver", () => {
    render(
      createElement(
        DeferredRender,
        { fallback: createElement("div", null, "Loading section"), rootMargin: "320px 0px" },
        createElement("div", null, "Loaded section"),
      ),
    )

    expect(MockIntersectionObserver.options[0]).toMatchObject({ rootMargin: "320px 0px" })
  })

  it("keeps children mounted after the first reveal", async () => {
    render(
      createElement(
        DeferredRender,
        { fallback: createElement("div", null, "Loading section") },
        createElement("div", null, "Loaded section"),
      ),
    )

    const observer = MockIntersectionObserver.instances[0]

    await act(async () => {
      observer.trigger(true)
    })

    await act(async () => {
      observer.trigger(false)
    })

    expect(screen.getByText("Loaded section")).toBeInTheDocument()
    expect(observer.disconnect).toHaveBeenCalled()
  })
})
