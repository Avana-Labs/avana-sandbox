import { cn } from "@/lib/utils"
/* eslint-disable @next/next/no-img-element */

type BrandLogoProps = {
  mobileOnly?: boolean
  className?: string
}

const HEADER_WORDMARK_PATH = "/avana-wordmark.png"
const SITE_NAME = "Avana"

export function BrandLogo({ mobileOnly = false, className }: BrandLogoProps) {
  return (
    <span className="inline-flex items-center overflow-hidden">
      {/* Plain img avoids next/image SSR markup drift in the site header. */}
      <img
        src={HEADER_WORDMARK_PATH}
        alt={`${SITE_NAME} logo`}
        width={2464}
        height={967}
        className={
          cn(
            mobileOnly
              ? "h-[56px] w-auto scale-[1.08] origin-left"
              : "h-[44px] w-auto origin-left md:h-[44px]",
            className,
          )
        }
      />
    </span>
  )
}

type BrandIconProps = {
  className?: string
}

export function BrandIcon({ className }: BrandIconProps) {
  return (
    <span className="inline-flex items-center overflow-hidden">
      {/* Plain img avoids next/image SSR markup drift in the mobile header. */}
      <img
        src="/avana-icon.png"
        alt="Avana logo"
        width={1236}
        height={1359}
        className={cn("h-8 w-8 object-cover", className)}
      />
    </span>
  )
}
