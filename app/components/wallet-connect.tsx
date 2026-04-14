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
  AlertTriangle,
  ChevronDown,
  Code2,
  ExternalLink,
  FileText,
  FlaskConical,
  Info,
  LifeBuoy,
  Mail,
  Newspaper,
  Palette,
  Shield,
  Wallet,
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
  icon: typeof AlertTriangle
  newTab?: boolean
  internal?: boolean
}

function MenuLink({ href, label, icon: Icon, newTab, internal }: MenuLinkItem) {
  if (internal) {
    return (
      <DropdownMenuItem asChild>
        <Link href={href} className="cursor-pointer gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem asChild>
      <a href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noopener noreferrer" : undefined} className="cursor-pointer gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </a>
    </DropdownMenuItem>
  )
}

export function WalletConnect({ isResourcesActive = false }: { isResourcesActive?: boolean }) {
  const menuContentClass = "rounded-xl border border-border bg-popover p-1 shadow-md"

  const toolLinks: MenuLinkItem[] = [
    {
      href: "/incentivize",
      label: "Simulate",
      icon: FlaskConical,
      internal: true,
    },
    {
      href: "/risk-warning",
      label: "Risk warning",
      icon: AlertTriangle,
      internal: true,
    },
  ]

  const learnLinks: MenuLinkItem[] = [
    {
      href: "mailto:support@avana.cc?subject=Avana%20Feedback",
      label: "Give feedback",
      icon: Mail,
    },
    {
      href: "https://avana-ashen.vercel.app/faq",
      label: "Support center",
      icon: LifeBuoy,
      newTab: true,
    },
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
  ]

  const companyLinks: MenuLinkItem[] = [
    {
      href: "https://avana-ashen.vercel.app/about",
      label: "About",
      icon: Info,
      newTab: true,
    },
    {
      href: "https://avana-ashen.vercel.app/blog",
      label: "Blog",
      icon: Newspaper,
      newTab: true,
    },
    {
      href: "https://avana-ashen.vercel.app/brand",
      label: "Brand",
      icon: Palette,
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
    {
      href: "mailto:legal@avana.cc?subject=Avana%20Legal%20Inquiry",
      label: "Contact legal",
      icon: Mail,
    },
    {
      href: "https://avana-ashen.vercel.app/",
      label: "Visit Avana",
      icon: ExternalLink,
      newTab: true,
    },
  ]

  return (
    <div className="flex items-center gap-3 pl-2">
      <div className="h-9 w-px bg-border/80" />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Open resources and support"
            title="Resources and support"
            className={`h-10 w-10 rounded-none border-transparent bg-transparent shadow-none hover:bg-transparent ${
              isResourcesActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AppsGridIcon className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className={`w-64 ${menuContentClass}`}>
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Resources
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0" />
          {toolLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
          <DropdownMenuSeparator className="my-0" />
          {learnLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
          <DropdownMenuSeparator className="my-0" />
          {companyLinks.map((item) => (
            <MenuLink key={item.label} {...item} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="h-11 rounded-full border border-border/80 bg-card px-6 text-[14px] font-medium text-foreground shadow-none hover:bg-muted/35"
          >
            <span className="font-medium">Connect</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className={`w-56 ${menuContentClass}`}>
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Access Avana
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuItem className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect wallet
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Mail className="h-4 w-4" />
            Continue with email
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuItem asChild>
            <Link href="/risk-warning" className="cursor-pointer gap-2">
              <AlertTriangle className="h-4 w-4" />
              Review risk warning
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
