import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  mobileOnly?: boolean
  className?: string
}

export function BrandLogo({ mobileOnly = false, className }: BrandLogoProps) {
  return (
    <span
      data-framer-name="Logo"
      className={cn(
        "inline-flex h-[56px] w-auto origin-left scale-[1.08] items-center leading-none",
        mobileOnly ? "md:h-[56px]" : "md:h-[52px]",
        className,
      )}
    >
      <Image
        src="/Avana Full (Personal) PNG.png"
        alt="Avana"
        width={300}
        height={150}
        className="h-full w-auto object-contain"
        priority
      />
    </span>
  )
}
