import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  mobileOnly?: boolean
}

const HEADER_WORDMARK_PATH = "/avana-wordmark.svg"
const SITE_NAME = "Avana"

export function BrandLogo({ mobileOnly = false }: BrandLogoProps) {
  return (
    <span className="inline-flex items-center overflow-hidden">
      <Image
        src={HEADER_WORDMARK_PATH}
        alt={`${SITE_NAME} logo`}
        width={252}
        height={56}
        sizes={mobileOnly ? "172px" : "(max-width: 767px) 172px, 168px"}
        className={
          mobileOnly
            ? "h-[56px] w-auto scale-[1.08] origin-left"
            : "h-[56px] w-auto scale-[1.08] origin-left md:h-[52px]"
        }
        priority
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
      <Image
        src="/avana-icon.svg"
        alt="Avana logo"
        width={32}
        height={32}
        sizes="32px"
        className={cn("object-cover", className)}
        priority
      />
    </span>
  )
}
