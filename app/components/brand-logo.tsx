import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  mobileOnly?: boolean
}

const HEADER_WORDMARK_PATH = "/Avana Full (Personal) PNG.png"
const SITE_NAME = "Avana"

export function BrandLogo({ mobileOnly = false }: BrandLogoProps) {
  return (
    <span className="inline-flex items-center overflow-hidden">
      <Image
        src={HEADER_WORDMARK_PATH}
        alt={`${SITE_NAME} logo`}
        width={3000}
        height={1500}
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
        src="/Avana Icon (Personal) PNG.png"
        alt="Avana logo"
        width={256}
        height={256}
        className={cn("h-8 w-8 object-cover", className)}
        priority
      />
    </span>
  )
}
