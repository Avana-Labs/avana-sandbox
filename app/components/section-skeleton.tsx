import { Skeleton } from "@/components/ui/skeleton"

type SectionSkeletonProps = {
  cards?: number
  rows?: number
}

/** Lightweight placeholder used while deferred marketing sections are loading. */
export function SectionSkeleton({ cards = 4, rows = 1 }: SectionSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cards }).map((__, cardIndex) => (
            <div
              key={`card-${rowIndex}-${cardIndex}`}
              className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm"
            >
              <Skeleton className="mb-3 h-4 w-1/2" />
              <Skeleton className="mb-2 h-8 w-2/3" />
              <Skeleton className="h-16 rounded-[18px]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
