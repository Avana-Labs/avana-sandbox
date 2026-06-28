import { cn } from "@/lib/utils"

type BrandLogoProps = {
  mobileOnly?: boolean
}

const HEADER_WORDMARK_PATH = "/avana-wordmark.svg"
const SITE_NAME = "Avana"

export function BrandLogo({ mobileOnly = false }: BrandLogoProps) {
  return (
    <span className="inline-flex items-center overflow-hidden">
      {/* Plain img avoids next/image SSR markup drift in the site header. */}
      <img
        src={HEADER_WORDMARK_PATH}
        alt={`${SITE_NAME} logo`}
        width={252}
        height={56}
        className={
          mobileOnly
            ? "h-[56px] w-auto scale-[1.08] origin-left"
            : "h-[56px] w-auto scale-[1.08] origin-left md:h-[52px]"
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
        src="/avana-icon.svg"
        alt="Avana logo"
        width={32}
        height={32}
        className={cn("h-8 w-auto object-cover", className)}
      />
    </span>
  )
}
