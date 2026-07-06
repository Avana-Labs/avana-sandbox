import { cn } from "@/lib/utils"

/**
 * Wagmi-free presentation helpers shared by the idle and mounted wallet controls. Kept in
 * its own module (no connectkit/wagmi imports) so importing it never drags the wallet SDK
 * onto the critical path.
 */

export type WalletControlSize = "mobile" | "desktop"

/** Deterministic two-stop gradient identicon derived from the wallet address. */
export function walletGradient(address: string): string {
  let h = 0
  for (let i = 0; i < address.length; i++) h = (Math.imul(h, 31) + address.charCodeAt(i)) | 0
  const a = Math.abs(h) % 360
  const b = (a + 90) % 360
  return `linear-gradient(135deg, hsl(${a} 75% 58%), hsl(${b} 75% 48%))`
}

/** 0x1234…abcd — matches ConnectKit's truncatedAddress so the idle/mounted pills align. */
export function truncateAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

/** Shared button footprints so every wallet state (and translated label) keeps the same size. */
export function walletButtonClasses(size: WalletControlSize) {
  const base =
    size === "mobile"
      ? "inline-flex h-9 w-[124px] items-center justify-center truncate rounded-full px-3 text-[14px] font-medium transition-colors sm:w-[136px] sm:px-4"
      : "inline-flex h-10 w-[152px] items-center justify-center truncate rounded-full px-4 font-sans text-[15px] font-medium transition-colors"
  return {
    base,
    brand: cn(base, "bg-brand text-brand-foreground hover:bg-brand/90"),
    pill: cn(base, "gap-2 border border-border bg-transparent text-foreground hover:bg-surface-inset"),
  }
}
