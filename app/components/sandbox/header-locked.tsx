"use client"

import Link from "next/link"
import { ConnectKitButton } from "connectkit"
import { BrandLogo } from "@/app/components/brand-logo"
import { SandboxSignInButton } from "@/app/lib/siwe/sandbox-sign-in"

/**
 * Minimal "locked" header shown while a signed-in wallet is still onboarding (the
 * SandboxGate replaces the full site chrome with this until onboardingStep === "done").
 * It keeps only the brand mark + the connect/sign-in controls — there is nothing else
 * to navigate to until the sandbox unlocks.
 */
export function HeaderLocked() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-5 sm:px-8">
      <Link href="/" aria-label="Avana home" className="flex items-center">
        <BrandLogo />
      </Link>
      <div className="flex items-center gap-2">
        <ConnectKitButton.Custom>
          {({ show, isConnected, truncatedAddress, ensName }) => (
            <button
              type="button"
              aria-label={isConnected ? "Wallet" : "Connect"}
              onClick={show}
              className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-[15px] font-medium text-brand-foreground transition-colors hover:bg-brand/90"
            >
              {isConnected ? (ensName ?? truncatedAddress ?? "Wallet") : "Connect"}
            </button>
          )}
        </ConnectKitButton.Custom>
        <SandboxSignInButton size="desktop" />
      </div>
    </header>
  )
}
