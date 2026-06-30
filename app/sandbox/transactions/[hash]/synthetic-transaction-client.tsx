"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

export function SyntheticTransactionClient({ hash }: { hash: string }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  const receipt = useQuery(
    api.sandbox.transactions.getTransactionByHash,
    isSignedIn && authedWallet ? { wallet: authedWallet, hash } : "skip",
  )

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-5 py-16">
      <p className="text-sm text-muted-foreground">Avana sandbox</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em]">Synthetic transaction receipt</h1>
      {!isSignedIn ? (
        <p className="mt-8 text-muted-foreground">Sign in with the wallet that created this transaction.</p>
      ) : receipt === undefined ? (
        <Skeleton className="skeleton-enter mt-8 h-32 rounded-3xl" />
      ) : receipt === null ? (
        <p className="mt-8 text-muted-foreground">This receipt does not exist for the authenticated wallet.</p>
      ) : (
        <dl className="mt-8 grid gap-5 rounded-3xl border border-border p-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Status</dt>
            <dd className="mt-2 flex items-center gap-2 font-medium">
              <Check className="size-4 text-emerald-500" /> Confirmed
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Timestamp</dt>
            <dd className="mt-2 font-medium">{new Date(receipt.at).toLocaleString()}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Hash</dt>
            <dd className="mt-2 break-all font-mono text-sm">{receipt.syntheticTxHash}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Amount</dt>
            <dd className="mt-2 font-medium">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(receipt.amountUsd)}
            </dd>
          </div>
          {"product" in receipt ? (
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Action</dt>
              <dd className="mt-2 font-medium capitalize">{receipt.product} · {receipt.kind}</dd>
            </div>
          ) : null}
        </dl>
      )}
      <Link className="mt-8 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  )
}
