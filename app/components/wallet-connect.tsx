"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  CircleUserRound,
  Code2,
  FileText,
  LifeBuoy,
  Mail,
  Moon,
  Shield,
  Sun,
  type LucideIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

function AppsGridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden className={className}>
      {[3, 9, 15].flatMap((cx) =>
        [3, 9, 15].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.7} fill="currentColor" />),
      )}
    </svg>
  )
}

type MenuLinkItem = {
  href: string
  label: string
  icon: LucideIcon
  newTab?: boolean
  internal?: boolean
}

function MenuLink({ href, label, icon: Icon, newTab, internal }: MenuLinkItem) {
  const outbound = !internal

  const itemContent = (
    <>
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {outbound ? <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden /> : null}
    </>
  )

  if (internal) {
    return (
      <DropdownMenuItem asChild>
        <Link href={href} className="cursor-pointer justify-between gap-2">
          {itemContent}
        </Link>
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem asChild>
      <a
        href={href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        className="cursor-pointer justify-between gap-2"
      >
        {itemContent}
      </a>
    </DropdownMenuItem>
  )
}

export function WalletConnect({ isResourcesActive = false }: { isResourcesActive?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const menuContentClass = "rounded-radius-sm border border-border bg-popover p-1 shadow-elev-3"

  const topLinks: MenuLinkItem[] = [
    {
      href: "/risk-warning",
      label: "Risk warning",
      icon: AlertTriangle,
      internal: true,
    },
    {
      href: "https://avana-ashen.vercel.app/faq",
      label: "Support center",
      icon: LifeBuoy,
      newTab: true,
    },
  ]

  const docsLinks: MenuLinkItem[] = [
    {
      href: "https://avana-ashen.vercel.app/lightpaper",
      label: "Lightpaper",
      icon: FileText,
      newTab: true,
    },
    {
      href: "https://avana-ashen.vercel.app/developers",
      label: "Developer docs",
      icon: Code2,
      newTab: true,
    },
    {
      href: "https://avana-ashen.vercel.app/privacy",
      label: "Privacy",
      icon: Shield,
      newTab: true,
    },
    {
      href: "https://avana-ashen.vercel.app/terms",
      label: "Terms",
      icon: FileText,
      newTab: true,
    },
  ]

  const moreLinks: MenuLinkItem[] = [
    {
      href: "mailto:support@avana.cc?subject=Avana%20Feedback",
      label: "Give feedback",
      icon: Mail,
    },
    {
      href: "https://avana-ashen.vercel.app/",
      label: "About Avana",
      icon: FileText,
      newTab: true,
    },
  ]

  return (
    <div className="flex items-center gap-2 pl-2">
      <div className="h-5 w-px bg-border" />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open resources and support"
            title="Resources and support"
            className={cn(
              "flex size-8 appearance-none select-none items-center justify-center rounded-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-emphasis/25",
              isResourcesActive
                ? "text-foreground"
                : "text-muted-foreground hover:bg-surface-inset/60 hover:text-foreground",
            )}
          >
            <AppsGridIcon className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className={`w-64 ${menuContentClass}`}>
          <DropdownMenuLabel>Global preferences</DropdownMenuLabel>
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span className="text-[12px] text-muted-foreground">Theme</span>
            <div className="flex items-center gap-0.5 rounded-xs border border-border bg-surface-inset p-0.5">
              <button
                onClick={() => setTheme("system")}
                className={cn(
                  "rounded-xs px-2 py-1 text-[11px] font-medium transition-colors",
                  mounted && theme === "system"
                    ? "bg-surface-raised text-foreground shadow-elev-1"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Auto
              </button>
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "rounded-xs p-1 transition-colors",
                  mounted && theme === "light"
                    ? "bg-surface-raised text-foreground shadow-elev-1"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sun className="h-3 w-3" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "rounded-xs p-1 transition-colors",
                  mounted && theme === "dark"
                    ? "bg-surface-raised text-foreground shadow-elev-1"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Moon className="h-3 w-3" />
              </button>
            </div>
          </div>
          <DropdownMenuItem className="cursor-pointer justify-between gap-2 text-[12px] text-muted-foreground">
            <span>Language</span>
            <span className="font-medium text-foreground">English <span className="ml-1 opacity-50">&gt;</span></span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer justify-between gap-2 text-[12px] text-muted-foreground">
            <span>Currency</span>
            <span className="font-medium text-foreground">USD <span className="ml-1 opacity-50">&gt;</span></span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Resources</DropdownMenuLabel>
          {topLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Docs</DropdownMenuLabel>
          {docsLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
          <DropdownMenuSeparator />
          {moreLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label="Sign in"
        title="Sign in"
        className="inline-flex size-8 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-surface-inset/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-emphasis/25"
      >
        <CircleUserRound className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  )
}
