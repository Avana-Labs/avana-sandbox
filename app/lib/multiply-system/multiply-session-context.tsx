"use client"

export {
  AvanaSessionsProvider,
  useAvanaSessions,
  useOptionalAvanaSessions,
  useBorrowSessionContext,
  useMultiplySessionContext,
} from "@/app/lib/avana-session/avana-sessions-provider"

// Backward-compatible alias for existing imports.
export { AvanaSessionsProvider as MultiplySessionProvider } from "@/app/lib/avana-session/avana-sessions-provider"
