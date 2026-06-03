"use client"

import Link from "next/link"

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
}

export function NewsCard({ items, title = "News" }: Props) {
  return (
    <section className="rounded-2xl bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-0 py-3">
        <h2 className="truncate text-[21px] font-normal leading-none tracking-[-0.02em] text-text-extra-high">{title}</h2>
      </div>
      <ul className="divide-y divide-border-light">
        {items.map((item, index) => {
          const content = (
            <div className="group flex items-stretch gap-3 px-0 py-3 focus-visible:outline-none">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-border-light">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" src={item.imageUrl} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] font-medium text-text-low">
                    {item.imageLabel ?? item.source.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-extra-high text-pretty line-clamp-3 underline-offset-2 group-hover:underline group-focus-visible:underline">
                  {item.title}
                </div>
                {item.description ? (
                  <div className="mt-1 text-xs text-text-extra-low line-clamp-2">{item.description}</div>
                ) : null}
                <div className="mt-1 text-xs text-text-extra-low">
                  {item.source} • {item.time}
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
