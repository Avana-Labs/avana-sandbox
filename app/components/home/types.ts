import type { HomeSuccessRow } from "@/app/lib/home-sim"

export type HomeSuccessState = {
  emoji: string
  title: string
  amount: string
  description: string
  rows: HomeSuccessRow[]
}

export type PoolDialogMode = "borrow" | "repay" | "remove"
