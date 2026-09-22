"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RouteContentSkeleton } from "@/app/components/loading-states"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"

/**
 * Rendered by a gated page in place of its content when the request had no session (see
 * `isGuestRequest`). The gate hides it while the visitor is a guest; once they sign in on
 * this page the gate mounts it, and it re-requests the page so the server renders the real
 * content with the new session cookie.
 */
export function GuestPagePlaceholder() {
  const router = useRouter()
  const { isSignedIn } = useSiweAuth()
  useEffect(() => {
    if (isSignedIn) router.refresh()
  }, [isSignedIn, router])
  return <RouteContentSkeleton />
}
