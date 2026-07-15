"use client"

import { useCallback } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { SupportCenterForm, type SupportSubmit } from "./support-center-client"

export function ConvexSupportCenter() {
  const submitSupportRequest = useMutation(api.support.submitSupportRequest)
  const submit = useCallback<SupportSubmit>(
    async (payload) => {
      await submitSupportRequest({
        ...payload,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      })
    },
    [submitSupportRequest],
  )
  return <SupportCenterForm submit={submit} />
}
