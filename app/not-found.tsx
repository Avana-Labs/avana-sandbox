import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex h-full flex-col bg-background">
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-lg font-semibold tracking-tight text-foreground mb-2">404 — Page not found</h1>
          <p className="text-sm text-muted-foreground mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
