"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export function SyntheticTransactionClient({ hash }: { hash: string }) {
  const { exact } = useCurrency()
  const { t } = useTranslation()
  const { authedWallet, isSignedIn } = useSiweAuth()
  const receipt = useQuery(
    api.sandbox.transactions.getTransactionByHash,
    isSignedIn && authedWallet ? { wallet: authedWallet, hash } : "skip",
  )

  // When the backend is unreachable the query stays `undefined` forever, leaving an
  // empty card under the title. Time out so the user gets a clear message instead.
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (receipt !== undefined) return
    const timer = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(timer)
  }, [receipt])

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-5 py-16">
      <p className="text-sm text-muted-foreground">{t("Avana sandbox")}</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em]">{t("Synthetic transaction receipt")}</h1>
      {!isSignedIn ? (
        <p className="mt-8 text-muted-foreground">{t("Sign in with the wallet that created this transaction.")}</p>
      ) : receipt === undefined ? (
        timedOut ? (
          <p className="mt-8 text-muted-foreground">
            {t("This receipt is taking too long to load. It may not be available in this environment.")}
          </p>
        ) : (
          <Skeleton className="skeleton-enter mt-8 h-32 rounded-3xl" />
        )
      ) : receipt === null ? (
        <p className="mt-8 text-muted-foreground">{t("This receipt does not exist for the authenticated wallet.")}</p>
      ) : (
        <dl className="mt-8 grid gap-5 rounded-3xl border border-border p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("Status")}</dt>
            <dd className="mt-2 flex items-center gap-2 font-medium">
              <Check className="size-4 text-emerald-500" /> {t("Confirmed")}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("Timestamp")}</dt>
            <dd className="mt-2 font-medium">{new Date(receipt.at).toLocaleString()}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("Hash")}</dt>
            <dd className="mt-2 break-all font-mono text-sm">{receipt.syntheticTxHash}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("Amount")}</dt>
            <dd className="mt-2 font-medium">
              {exact(receipt.amountUsd)}
            </dd>
          </div>
          {"product" in receipt ? (
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{t("Action")}</dt>
              <dd className="mt-2 font-medium capitalize">{receipt.product} · {receipt.kind}</dd>
            </div>
          ) : null}
        </dl>
      )}
      <Link className="mt-8 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background" href="/dashboard">
        {t("Back to dashboard")}
      </Link>
    </main>
  )
}
