import { createRef } from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HighlightCarousel, type HighlightCarouselHandle } from "@/app/components/highlight-carousel"

describe("HighlightCarousel", () => {
  let frameId = 0
  let frames: Map<number, FrameRequestCallback>

  beforeEach(() => {
    frames = new Map()
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frameId += 1
      frames.set(frameId, callback)
      return frameId
    })
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id))
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe() {
          this.callback([], this as unknown as ResizeObserver)
        }
        disconnect() {}
      },
    )
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get: () => 380,
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  function runNextFrame(time: number) {
    const [id, callback] = [...frames.entries()][0]
    frames.delete(id)
    act(() => callback(time))
  }

  it("preserves the original distance and duration calculation", () => {
    const { container } = render(<HighlightCarousel durationSeconds={38} renderSequence={() => <div>Market</div>} />)
    const viewport = container.firstElementChild as HTMLDivElement
    const track = viewport.firstElementChild as HTMLDivElement

    runNextFrame(1_000)
    runNextFrame(2_000)

    expect(track.style.transform).toBe("translate3d(-10px, 0, 0)")
  })

  it("stops scheduling frames while hovered and resumes from the same position", () => {
    const { container } = render(<HighlightCarousel durationSeconds={38} renderSequence={() => <div>Market</div>} />)
    const viewport = container.firstElementChild as HTMLDivElement
    const track = viewport.firstElementChild as HTMLDivElement

    runNextFrame(1_000)
    runNextFrame(2_000)
    fireEvent.mouseEnter(viewport)

    expect(frames.size).toBe(0)
    expect(track.style.transform).toBe("translate3d(-10px, 0, 0)")

    fireEvent.mouseLeave(viewport)
    expect(frames.size).toBe(1)
    expect(track.style.transform).toBe("translate3d(-10px, 0, 0)")
  })

  it("eases one card on arrow step instead of jumping", () => {
    const ref = createRef<HighlightCarouselHandle>()
    const { container } = render(
      <HighlightCarousel ref={ref} durationSeconds={38} renderSequence={() => <div>Market</div>} />,
    )
    const viewport = container.firstElementChild as HTMLDivElement
    const track = viewport.firstElementChild as HTMLDivElement
    const sequence = track.firstElementChild as HTMLDivElement
    vi.spyOn(sequence.firstElementChild as HTMLElement, "getBoundingClientRect").mockReturnValue({
      width: 200,
    } as DOMRect)

    runNextFrame(1_000)
    runNextFrame(2_000)
    expect(ref.current).not.toBeNull()
    act(() => ref.current?.step(1))
    runNextFrame(2_100)
    runNextFrame(2_200)

    const x = Number(/translate3d\((-?[\d.]+)px/.exec(track.style.transform)?.[1])
    expect(x).toBeLessThan(-20)
    expect(x).toBeGreaterThan(-222)
  })
})
