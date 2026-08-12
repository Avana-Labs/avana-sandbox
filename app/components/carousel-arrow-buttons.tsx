"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "@/app/components/icons"

const ARROW_CLASS =
  "inline-flex size-10 items-center justify-center rounded-full border border-border bg-muted text-foreground transition-colors hover:bg-hover disabled:pointer-events-none disabled:opacity-40"

export function CarouselArrowButtons({
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel = "Previous",
  nextLabel = "Next",
}: {
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  prevLabel?: string
  nextLabel?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={prevLabel} disabled={!canPrev} onClick={onPrev} className={ARROW_CLASS}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label={nextLabel} disabled={!canNext} onClick={onNext} className={ARROW_CLASS}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

export function useOverflowCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateScrollState = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    setCanPrev(scroller.scrollLeft > 4)
    setCanNext(maxScroll > 4 && scroller.scrollLeft < maxScroll - 4)
  }

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    updateScrollState()
    scroller.addEventListener("scroll", updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(scroller)
    return () => {
      scroller.removeEventListener("scroll", updateScrollState)
      observer.disconnect()
    }
  }, [])

  const scrollByCard = (direction: -1 | 1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const card = scroller.querySelector("[data-carousel-card]") ?? scroller.querySelector(":scope > * > *")
    const distance = (card?.getBoundingClientRect().width ?? scroller.clientWidth / 3) + 12
    scroller.scrollBy({ left: direction * distance, behavior: "smooth" })
  }

  return { scrollerRef, canPrev, canNext, scrollByCard }
}
