import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/85 before:absolute before:inset-0 before:-translate-x-full before:animate-[loading-shimmer_1.8s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
