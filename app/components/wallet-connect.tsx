"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertTriangle,
  ChevronDown,
  CircleDollarSign,
  Code2,
  ExternalLink,
  FileText,
  Globe2,
  Info,
  LifeBuoy,
  Mail,
  Newspaper,
  Palette,
  Scale,
  Shield,
  Wallet,
} from "lucide-react"
import Link from "next/link"

export function WalletConnect() {
  const [currency, setCurrency] = useState("USD")
  const [language, setLanguage] = useState("EN")

  const iconButtonClass =
    "h-9 w-9 rounded-full border border-border !bg-transparent text-muted-foreground shadow-none hover:!bg-transparent hover:text-foreground"
  const menuContentClass = "rounded-xl border border-border bg-popover p-1 shadow-md"
  const menuItemClass = "cursor-pointer gap-2"

  const supportLinks = [
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
  ]

  const documentationLinks = [
    {
      href: "https://avana-ashen.vercel.app/lightpaper",
      label: "Lightpaper",
      icon: FileText,
    },
    {
      href: "https://avana-ashen.vercel.app/developers",
      label: "Developer docs",
      icon: Code2,
    },
  ]

  const resourceLinks = [
    {
      href: "https://avana-ashen.vercel.app/about",
      label: "About",
      icon: Info,
    },
    {
      href: "https://avana-ashen.vercel.app/blog",
      label: "Blog",
      icon: Newspaper,
    },
    {
      href: "https://avana-ashen.vercel.app/brand",
      label: "Brand",
      icon: Palette,
    },
  ]

  const legalLinks = [
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
  ]

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Change currency. Current currency: ${currency}`}
            title={`Currency: ${currency}`}
            className={iconButtonClass}
          >
            <CircleDollarSign className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className={`w-44 ${menuContentClass}`}>
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Currency
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuRadioGroup value={currency} onValueChange={setCurrency}>
            <DropdownMenuRadioItem value="USD">USD</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="EUR">EUR</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="GBP">GBP</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Change language. Current language: ${language}`}
            title={`Language: ${language}`}
            className={iconButtonClass}
          >
            <Globe2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className={`w-44 ${menuContentClass}`}>
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Language
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
            <DropdownMenuRadioItem value="EN">English</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="ES">Spanish</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="FR">French</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Open resources and support"
            title="Resources and support"
            className={iconButtonClass}
          >
            <LifeBuoy className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10} className={`w-64 ${menuContentClass}`}>
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Resources
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0" />
          {supportLinks.map(({ href, icon: Icon, label, newTab }) => (
            <DropdownMenuItem asChild key={label}>
              <a
                href={href}
                target={newTab ? "_blank" : undefined}
                rel={newTab ? "noopener noreferrer" : undefined}
                className={menuItemClass}
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem asChild>
            <Link href="/risk-warning" className="cursor-pointer gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk warning
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-0" />
          {documentationLinks.map(({ href, icon: Icon, label }) => (
            <DropdownMenuItem asChild key={label}>
              <a href={href} target="_blank" rel="noopener noreferrer" className={menuItemClass}>
                <Icon className="h-4 w-4" />
                {label}
              </a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="my-0" />
          {resourceLinks.map(({ href, icon: Icon, label }) => (
            <DropdownMenuItem asChild key={label}>
              <a href={href} target="_blank" rel="noopener noreferrer" className={menuItemClass}>
                <Icon className="h-4 w-4" />
                {label}
              </a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-lg">
              <Scale className="h-4 w-4" />
              Legal
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={`w-56 ${menuContentClass}`}>
              {legalLinks.map(({ href, icon: Icon, label, newTab }) => (
                <DropdownMenuItem asChild key={label}>
                  <a
                    href={href}
                    target={newTab ? "_blank" : undefined}
                    rel={newTab ? "noopener noreferrer" : undefined}
                    className={menuItemClass}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem asChild>
            <a href="https://avana-ashen.vercel.app/" target="_blank" rel="noopener noreferrer" className={menuItemClass}>
              <ExternalLink className="h-4 w-4" />
              Visit Avana
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full border border-border !bg-transparent px-3 text-xs text-foreground shadow-none hover:!bg-transparent"
          >
            <span className="font-semibold">Sign in</span>
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
