"use client"

import Link from "next/link"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center bg-background px-6 py-16 text-foreground sm:px-8 sm:py-20">
      <section className="mx-auto w-full max-w-[760px]">
        <div className="py-14 text-center sm:py-18">
          <p className="mt-5 text-[4.5rem] font-semibold leading-none tracking-[-0.06em] text-brand-readable sm:text-[5.75rem]">
            404
          </p>

          <h1 className="mx-auto mt-6 max-w-[620px] text-[1.05rem] font-semibold leading-7 tracking-[-0.02em] text-foreground">
            {t("This page isn't available.")}
          </h1>

          <p className="mx-auto mt-5 max-w-[440px] text-[1rem] leading-7 text-muted-foreground sm:text-[1.05rem]">
            {t("The address may be wrong or the page may have moved.")}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[hsl(var(--brand))] px-5 text-sm font-medium text-white transition hover:bg-[hsl(var(--brand))]/90"
            >
              {t("Home")}
            </Link>

            <nav aria-label={t("Helpful links")} className="flex flex-wrap justify-center gap-x-5 gap-y-3">
              <Link href="/borrow" className="text-sm font-medium text-foreground transition hover:text-brand-readable">
                {t("Borrow")}
              </Link>
              <Link href="/lend" className="text-sm font-medium text-foreground transition hover:text-brand-readable">
                {t("Lend")}
              </Link>
              <Link href="/multiply" className="text-sm font-medium text-foreground transition hover:text-brand-readable">
                {t("Multiply")}
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-foreground transition hover:text-brand-readable">
                {t("Dashboard")}
              </Link>
            </nav>
          </div>
        </div>
      </section>
    </main>
  )
}
