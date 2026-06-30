"use client"

import Link from "next/link"
import { ConnectKitButton } from "connectkit"
import { Moon, Sun } from "lucide-react"
import { BrandLogo } from "@/app/components/brand-logo"
import { SandboxSignInButton } from "@/app/lib/siwe/sandbox-sign-in"
import { useTheme } from "@/app/components/theme-provider"

/**
 * Minimal "locked" header shown while a signed-in wallet is still onboarding (the
 * SandboxGate replaces the full site chrome with this until onboardingStep === "done").
 * It keeps only the brand mark + the connect/sign-in controls — there is nothing else
 * to navigate to until the sandbox unlocks.
 */
export function HeaderLocked() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="px-5 sm:px-8">
      <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between">
        <div className="flex items-center gap-14">
          <Link href="/" aria-label="Avana home" className="flex items-center">
            <BrandLogo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Onboarding">
            <Link className="transition-colors hover:text-foreground" href="/">
              Home
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/borrow">
              Borrow
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/lend">
              Lend
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/multiply">
              Multiply
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/75"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            type="button"
          >
            {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <ConnectKitButton.Custom>
            {({ show, isConnected, truncatedAddress, ensName }) => (
              <button
                type="button"
                aria-label={isConnected ? "Wallet" : "Connect"}
                onClick={show}
                className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85"
              >
                {isConnected ? (ensName ?? truncatedAddress ?? "Wallet") : "Connect"}
              </button>
            )}
          </ConnectKitButton.Custom>
          <SandboxSignInButton size="desktop" />
        </div>
      </div>
    </header>
  )
}
