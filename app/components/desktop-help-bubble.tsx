"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, BookOpen, CircleHelp, FileText, LifeBuoy, Mail, ShieldCheck } from "lucide-react"
import { AVANA_EXTERNAL_LINKS } from "./external-links"

type HelpLink = {
  href: string
  label: string
  icon: typeof CircleHelp
  external?: boolean
}

type HelpLinkItemProps = HelpLink & {
  onActivate: () => void
}

const HELP_LINKS: HelpLink[] = [
  {
    href: AVANA_EXTERNAL_LINKS.terms,
    label: "Terms of Service",
    icon: FileText,
    external: true,
  },
  {
    href: AVANA_EXTERNAL_LINKS.privacy,
    label: "Privacy policy",
    icon: ShieldCheck,
    external: true,
  },
  {
    href: "mailto:support@avana.cc?subject=Avana%20Support",
    label: "Contact us",
    icon: Mail,
    external: true,
  },
  {
    href: "/support-center",
    label: "Help Center",
    icon: LifeBuoy,
  },
  {
    href: AVANA_EXTERNAL_LINKS.developers,
    label: "Docs",
    icon: BookOpen,
    external: true,
  },
]

function HelpLinkItem({ href, label, icon: Icon, external, onActivate }: HelpLinkItemProps) {
  const content = (
    <>
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-foreground/70" strokeWidth={1.8} />
        <span>{label}</span>
      </span>
      {external ? <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden /> : null}
    </>
  )

  if (external) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noreferrer"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
        onClick={onActivate}
        className="flex items-center justify-between gap-3 rounded-[10px] px-2.5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
      <Link
        href={href}
        onClick={onActivate}
        className="flex items-center justify-between gap-3 rounded-[10px] px-2.5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
      >
        {content}
      </Link>
    </motion.div>
  )
}

export function DesktopHelpBubble() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="fixed bottom-4 left-4 z-50 hidden md:block"
      style={{ width: "min(16rem, calc(100vw - 2rem))" }}
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            key="help-popover"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.96 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.75 }}
            className="pointer-events-none absolute bottom-full left-0 mb-3 w-full origin-bottom-left"
          >
            <div className="pointer-events-auto rounded-[14px] border border-border bg-background p-2 shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: {
                      staggerChildren: 0.03,
                      delayChildren: shouldReduceMotion ? 0 : 0.03,
                    },
                  },
                }}
                className="space-y-0.5"
              >
                {HELP_LINKS.map((item) => (
                  <motion.div
                    key={item.label}
                    variants={{
                      hidden: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -6 },
                      show: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 },
                    }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <HelpLinkItem {...item} onActivate={() => setOpen(false)} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label="Open help menu"
        title="Help"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.16 }}
        className="inline-flex size-10 items-center justify-center rounded-none bg-transparent text-[#01AACF] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-emphasis/25 dark:text-white"
      >
        <CircleHelp className="h-6 w-6" strokeWidth={2.3} />
      </motion.button>
    </div>
  )
}
