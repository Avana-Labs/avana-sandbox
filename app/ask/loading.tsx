export default function AskAILoading() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-68px)] w-full max-w-[1440px] gap-5 px-4 py-4 sm:px-6 lg:px-8">
      <div className="hidden w-72 animate-pulse rounded-2xl border border-border bg-card lg:block" />
      <div className="min-h-[640px] flex-1 animate-pulse rounded-2xl border border-border bg-card" />
    </main>
  )
}
