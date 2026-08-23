import { cn } from "@/lib/utils"
/* eslint-disable @next/next/no-img-element */

type BrandLogoProps = {
  mobileOnly?: boolean
  className?: string
}

const HEADER_WORDMARK_PATH = "/avana-wordmark-220.png"
const SITE_NAME = "Avana"

export function BrandLogo({ mobileOnly = false, className }: BrandLogoProps) {
  return (
    // className must live on the wrapper — hiding only the <img> leaves an
    // inline-flex strut that shifts vertical centering vs BrandIcon routes.
    <span className={cn("inline-flex items-center overflow-hidden", className)}>
      <img
        src={HEADER_WORDMARK_PATH}
        srcSet={`${HEADER_WORDMARK_PATH} 220w, /avana-wordmark-440.png 440w`}
        sizes="220px"
        alt={`${SITE_NAME} logo`}
        width={220}
        height={86}
        loading="eager"
        fetchPriority="high"
        className={mobileOnly ? "h-[56px] w-auto scale-[1.08] origin-left" : "h-[36px] w-auto origin-left"}
      />
    </span>
  )
}

type BrandIconProps = {
  className?: string
}

export function BrandIcon({ className }: BrandIconProps) {
  return (
    <span className={cn("inline-flex items-center overflow-hidden", className)}>
      {/* Plain img avoids next/image SSR markup drift in the mobile header. */}
      <img
        src="/avana-icon-64.png"
        alt="Avana logo"
        width={58}
        height={64}
        loading="eager"
        fetchPriority="high"
        className="h-8 w-8 object-cover"
      />
    </span>
  )
}
