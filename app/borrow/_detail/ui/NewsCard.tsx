"use client"

import Link from "next/link"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type NewsItem = {
  title: string
  source: string
  time: string
  description?: string
  href?: string
  imageUrl?: string
  imageLabel?: string
}

type Props = {
  items: NewsItem[]
  title?: string
  plain?: boolean
  mediaVariant?: "card" | "icon"
}

export function NewsCard({ items, title = "Parameter Changes", plain = false, mediaVariant = "card" }: Props) {
  const { t } = useTranslation()
  return (
    <section className={plain ? "space-y-4" : "overflow-hidden rounded-radius-lg border border-border bg-surface-raised shadow-elev-1"}>
      <div className={plain ? "flex items-center justify-between gap-3" : "flex items-center justify-between gap-3 px-4 py-3"}>
        <h2 className="truncate text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">{t(title)}</h2>
      </div>
      <ul className={plain ? "space-y-0 divide-y divide-border/70" : "divide-y divide-border/70"}>
        {items.map((item, index) => {
          const content = (
            <div className={plain ? "group flex items-stretch gap-3 focus-visible:outline-none" : "group flex items-stretch gap-3 px-4 py-3 focus-visible:outline-none"}>
              {mediaVariant === "card" ? (
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-radius-md bg-surface-inset ring-1 ring-border">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" src={item.imageUrl} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-inset text-[10px] font-medium text-text-low">
                      {item.imageLabel ?? item.source.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              ) : mediaVariant === "icon" ? (
                item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-10 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                    src={item.imageUrl}
                  />
                ) : (
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-inset text-[10px] font-medium text-text-low">
                    {item.imageLabel ?? item.source.slice(0, 2).toUpperCase()}
                  </span>
                )
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-extra-high text-pretty line-clamp-3 underline-offset-2 group-hover:underline group-focus-visible:underline">
                  {t(item.title)}
                </div>
                {item.description ? (
                  <div className="mt-1 text-xs text-text-extra-low line-clamp-2">{t(item.description)}</div>
                ) : null}
                <div className="mt-1 text-xs text-text-extra-low">
                  {t(item.source)} • {t(item.time)}
                </div>
              </div>
            </div>
          )

          return (
            <li key={`${item.source}-${item.time}-${index}`} className="min-w-0">
              {item.href ? (
                <Link
                  href={item.href}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-medium"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
