"use client"

import { ArrowUpRight, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
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
  const { t } = useTranslation()

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

  return (
    <Dialog
      open={pendingLink !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPendingLink(null)
        }
      }}
    >
      <DialogContent className="overflow-hidden rounded-radius-lg border-border bg-background p-0 shadow-elev-3 sm:max-w-[600px]">
        <div className="relative flex flex-col px-5 pb-5 pt-8 sm:px-7 sm:pb-6 sm:pt-7">
          <DialogClose
            className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label={t("Close dialog")}
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogClose>

          <DialogHeader className="pb-5 text-left">
            <DialogTitle className="text-[20px] font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-[22px]">
              {t("Third-Party Website")}
            </DialogTitle>
          </DialogHeader>

          <div className="border-t border-border pt-5">
            <p className="max-w-[40rem] text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
              {t(
                'By clicking "Continue", you will leave the Avana website and access a website made available by an independent third party. Avana is not responsible for the actions or content of any third-party websites.',
              )}
            </p>
          </div>

          <div className="border-t border-border pt-5">
            <Button
              type="button"
              onClick={openExternalLink}
              className="h-10 w-full rounded-radius-sm bg-brand text-[14px] font-medium text-white shadow-none hover:bg-[#009dbd]"
            >
              {t("Continue")}
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
