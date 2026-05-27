"use client"

import { ArrowUpRight, ExternalLink, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type PendingExternalLink = {
  href: string
  target: string | null
  rel: string | null
  host: string
}

function getHostLabel(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return href
  }
}

function shouldInterceptExternalLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href")
  if (!href || href.startsWith("#")) {
    return false
  }

  const protocol = href.split(":")[0]?.toLowerCase()
  if (protocol && !["http", "https"].includes(protocol)) {
    return false
  }

  const url = new URL(anchor.href, window.location.href)
  if (!["http:", "https:"].includes(url.protocol)) {
    return false
  }

  return url.origin !== window.location.origin
}

export function ExternalLinkGuard() {
  const [pendingLink, setPendingLink] = useState<PendingExternalLink | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      const anchor = target.closest("a")
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) {
        return
      }

      if (anchor.hasAttribute("download") || anchor.getAttribute("aria-disabled") === "true") {
        return
      }

      if (!shouldInterceptExternalLink(anchor)) {
        return
      }

      event.preventDefault()
      setPendingLink({
        href: anchor.href,
        target: anchor.target || null,
        rel: anchor.rel || null,
        host: getHostLabel(anchor.href),
      })
    }

    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("click", handleClick, true)
    }
  }, [])

  const openExternalLink = () => {
    if (!pendingLink) {
      return
    }

    const { href, target } = pendingLink
    const openTarget = target && target !== "_self" ? target : "_self"

    setPendingLink(null)

    if (openTarget === "_blank") {
      window.open(href, "_blank", "noopener,noreferrer")
      return
    }

    if (openTarget === "_self") {
      window.location.assign(href)
      return
    }

    window.open(href, openTarget, "noopener,noreferrer")
  }

  const description = useMemo(() => {
    if (!pendingLink) {
      return null
    }

    return (
      <>
        You are about to leave Avana and open a third-party website.
        <span className="mt-2 block text-[13px] text-muted-foreground">
          Destination: <span className="font-medium text-foreground">{pendingLink.host}</span>
        </span>
      </>
    )
  }, [pendingLink])

  return (
    <Dialog
      open={pendingLink !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPendingLink(null)
        }
      }}
    >
      <DialogContent className="overflow-hidden rounded-[24px] border-border bg-surface-raised p-0 shadow-elev-3 sm:max-w-[520px]">
        <div className="relative flex flex-col gap-6 px-5 pb-5 pt-12 sm:px-6 sm:pb-6 sm:pt-6">
          <DialogClose
            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogClose>

          <div className="flex items-start gap-4">
            <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-[#01AACF] shadow-sm">
              <ExternalLink className="h-5 w-5" strokeWidth={1.9} aria-hidden />
            </div>
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-[24px] font-medium leading-tight tracking-[-0.03em] text-foreground sm:text-[28px]">
                Third-Party Website
              </DialogTitle>
              <DialogDescription className="text-[15px] leading-6 text-muted-foreground">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-start gap-3 rounded-[18px] bg-surface-inset/40 px-4 py-3">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#01AACF]" aria-hidden />
              <p className="text-[13px] leading-5 text-muted-foreground">
                Avana does not control third-party sites and is not responsible for their content, security, or
                privacy practices.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingLink(null)}
              className="w-full rounded-full border-border bg-background/80 text-foreground hover:bg-surface-inset sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={openExternalLink}
              className="w-full rounded-full bg-brand text-brand-foreground shadow-none hover:bg-brand/90 sm:w-auto"
            >
              Continue
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
