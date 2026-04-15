"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowUpRight,
  Code2,
  FileText,
  FlaskConical,
  LifeBuoy,
  Mail,
  Shield,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

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
  const menuContentClass = "rounded-xl border border-border bg-popover p-1 shadow-md"

  const topLinks: MenuLinkItem[] = [
    {
      href: "/incentivize",
      label: "Simulate",
      icon: FlaskConical,
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
    <div className="flex items-center gap-3 pl-2">
      <div className="h-10 w-px bg-foreground/20" />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open resources and support"
            title="Resources and support"
            className={`flex h-10 w-10 items-center justify-center rounded-none border-transparent bg-transparent shadow-none hover:bg-transparent ${
              isResourcesActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AppsGridIcon className="h-6 w-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className={`w-64 ${menuContentClass}`}>
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Resources
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0" />
          {topLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Docs
          </DropdownMenuLabel>
          {docsLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
          <DropdownMenuSeparator className="my-0" />
          {moreLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="sm"
        className="h-11 rounded-full border border-border/80 bg-card px-6 text-[14px] font-medium text-foreground shadow-none hover:bg-muted/35"
      >
        <span className="font-medium">Sign In</span>
      </Button>
    </div>
  )
}
