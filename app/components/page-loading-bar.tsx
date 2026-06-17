"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { PAGE_LOADING_EVENT, triggerPageLoading } from "@/app/lib/page-loading"

const MIN_VISIBLE_MS = 420
const SAFETY_RESET_MS = 15000
const INITIAL_PROGRESS = 8
const MAX_TRICKLE_PROGRESS = 88

function isInternalNavigationLink(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return false
  if (anchor.hasAttribute("download")) return false

  const href = anchor.getAttribute("href")
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return false

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return false

  const current = new URL(window.location.href)
  return `${url.pathname}${url.search}` !== `${current.pathname}${current.search}`
}

export function PageLoadingBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const lastRouteKeyRef = useRef(routeKey)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const progressRef = useRef(0)
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stopTimers = () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }

    const animateProgress = () => {
      setProgress((current) => {
        const remaining = MAX_TRICKLE_PROGRESS - current
        const next = remaining <= 0.2 ? current : current + remaining * 0.045
        progressRef.current = next
        return next
      })

      rafRef.current = requestAnimationFrame(animateProgress)
    }

    const startLoading = () => {
      stopTimers()

      startedAtRef.current = Date.now()
      progressRef.current = INITIAL_PROGRESS
      setProgress(INITIAL_PROGRESS)
      setVisible(true)
      rafRef.current = requestAnimationFrame(animateProgress)

      resetTimerRef.current = setTimeout(() => {
        stopTimers()
        setVisible(false)
        setProgress(0)
        progressRef.current = 0
        startedAtRef.current = null
      }, SAFETY_RESET_MS)
    }

    const handleWindowStart = () => {
      startLoading()
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!isInternalNavigationLink(anchor)) return

      triggerPageLoading()
    }

    window.addEventListener(PAGE_LOADING_EVENT, handleWindowStart)
    document.addEventListener("click", handleDocumentClick, true)

    return () => {
      window.removeEventListener(PAGE_LOADING_EVENT, handleWindowStart)
      document.removeEventListener("click", handleDocumentClick, true)
      stopTimers()
    }
  }, [])

  useEffect(() => {
    if (routeKey === lastRouteKeyRef.current) return

    lastRouteKeyRef.current = routeKey

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : MIN_VISIBLE_MS
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)

    const completeTimer = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setVisible(false)
        setProgress(0)
        progressRef.current = 0
      }, 180)
      startedAtRef.current = null
    }, remaining)

    return () => {
      clearTimeout(completeTimer)
    }
  }, [routeKey])

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] overflow-hidden bg-[hsl(var(--brand)/0.12)] transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-0 left-0 bg-[hsl(var(--brand))] shadow-[0_0_10px_hsl(var(--brand)/0.35)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      >
        <div className="loading-progress-head absolute inset-y-0 right-0 w-14" />
      </div>
    </div>
  )
}
