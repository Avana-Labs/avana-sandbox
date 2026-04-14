"use client"

import { memo, useState } from "react"
import Image, { type ImageProps } from "next/image"

interface OptimizedImageProps extends Omit<ImageProps, "onLoad" | "onError"> {
  fallback?: string
}

/** Image wrapper with a lightweight fallback for remote asset failures. */
function OptimizedImageComponent({ src, alt, fallback = "/placeholder.svg", ...props }: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className={`relative ${isLoading ? "animate-pulse bg-muted" : ""}`}>
      <Image
        {...props}
        src={imgSrc}
        alt={alt}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setImgSrc(fallback)
        }}
      />
    </div>
  )
}

export const OptimizedImage = memo(OptimizedImageComponent)
