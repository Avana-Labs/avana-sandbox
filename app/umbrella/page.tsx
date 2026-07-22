import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Umbrella",
  description: "Umbrella.",
}

export default function UmbrellaPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1152px] items-start px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">Umbrella</h1>
    </main>
  )
}
