import type { LendSystemState } from "@/app/lib/lend-engine"

export function serializeLendSystemState(state: LendSystemState) {
  return JSON.stringify(state)
}

export function deserializeLendSystemState(serialized: string): LendSystemState {
  return JSON.parse(serialized) as LendSystemState
}
