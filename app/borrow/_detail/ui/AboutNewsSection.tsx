"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { AboutCard } from "@/app/borrow/_detail/pool-sections"
import { NewsCard } from "./NewsCard"
import { buildNewsItems } from "@/app/borrow/_detail/lib/news"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type Props = {
  about: AboutCardData
  newsImageUrl?: string
  newsImageLabel?: string
  aboutTitle?: string
  compactAboutTitle?: boolean
  newsTitle?: string
  /** Optional outbound link for "View all" / items. Never default to Aave governance. */
  governanceUrl?: string
  /** Legacy prop; media placement is now fixed to the news-style thumbnail. */
  mediaVariant?: "card" | "icon"
  afterAbout?: React.ReactNode
  className?: string
}

export function AboutNewsSection({
  about,
  newsImageUrl,
  newsImageLabel,
  aboutTitle = "About",
  compactAboutTitle = false,
  newsTitle = "Risk Parameters",
  governanceUrl,
  afterAbout,
  className,
}: Props) {
  const { t } = useTranslation()
  const newsItems = buildNewsItems(about, newsImageUrl, newsImageLabel)
  const governanceParameters = about.governanceParameters

  return (
    <div className={cn("space-y-12 pt-10", className)}>
      <AboutCard about={about} title={aboutTitle} compact={compactAboutTitle} plain />
      {afterAbout}
      {governanceParameters ? (
        <>
          <section aria-label={t(newsTitle)} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="truncate text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
                {t(newsTitle)}
              </h2>
              {governanceUrl ? (
                <a
                  href={governanceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[13px] font-medium text-sky-500 transition-colors hover:text-sky-400"
                >
                  {t("View all")}
                </a>
              ) : null}
            </div>

            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {governanceParameters.parameters.map((parameter) => {
                const parameterContent = (
                  <>
                    <div className="flex min-w-0 items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[14px] font-normal leading-snug text-muted-foreground">
                          {t(parameter.label)}
                          {parameter.description ? (
                            <ActionMetricHelp text={parameter.description} topic={parameter.label} />
                          ) : null}
                        </div>
                      </div>
                      {parameter.status ? (
                        <span className="shrink-0 rounded-full bg-surface-inset px-2.5 py-1 text-[12px] font-medium leading-none text-muted-foreground">
                          {t(parameter.status)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 font-data text-[22px] font-semibold leading-none tracking-[-0.03em] text-foreground">
                      {t(parameter.value)}
                    </div>
                  </>
                )

                return parameter.href ? (
                  <a
                    key={parameter.id}
                    href={parameter.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group min-w-0 border-b border-border/70 pb-4 transition-colors hover:border-border-medium"
                  >
                    {parameterContent}
                  </a>
                ) : (
                  <article key={parameter.id} className="min-w-0 border-b border-border/70 pb-4">
                    {parameterContent}
                  </article>
                )
              })}
            </div>
          </section>

          <section aria-label={t("Parameter changelog")} className="space-y-5">
            <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
              {t("Parameter changelog")}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-[13px]">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[26%]" />
                </colgroup>
                <thead>
                  <tr className="bg-table-header text-left text-muted-foreground">
                    <th className="bg-table-header pb-2 pl-5 pr-4 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      {t("Parameter")}
                    </th>
                    <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      {t("Previous")}
                    </th>
                    <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      {t("Current")}
                    </th>
                    <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      {t("Date")}
                    </th>
                    <th className="bg-table-header px-4 pb-2 pr-5 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      {t("Source")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-white/6">
                  {governanceParameters.changelog.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-hover">
                      <th scope="row" className="py-3 pl-5 pr-4 text-left text-[13px] font-medium text-foreground">
                        {t(entry.parameter)}
                      </th>
                      <td className="px-4 py-3 font-data text-[13px] font-medium tabular-nums text-muted-foreground">
                        {t(entry.previous)}
                      </td>
                      <td className="px-4 py-3 font-data text-[13px] font-medium tabular-nums text-foreground">
                        {t(entry.current)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">{t(entry.date)}</td>
                      <td className="min-w-0 px-4 py-3 pr-5 text-[13px]">
                        {entry.href ? (
                          <a
                            href={entry.href}
                            target="_blank"
                            rel="noreferrer"
                            className="group block min-w-0 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <span className="block truncate">{t(entry.source)}</span>
                            <span className="block truncate text-[12px] text-text-low transition-colors group-hover:text-muted-foreground">
                              {t(entry.executor)}
                            </span>
                          </a>
                        ) : (
                          <span className="block min-w-0 text-muted-foreground">
                            <span className="block truncate">{t(entry.source)}</span>
                            <span className="block truncate text-[12px] text-text-low">{t(entry.executor)}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : newsItems.length > 0 ? (
        <NewsCard
          items={newsItems}
          title={newsTitle}
          viewAllHref={governanceUrl}
          itemHrefFallback={governanceUrl}
          plain
        />
      ) : null}
    </div>
  )
}
