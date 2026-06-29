import type { BorrowAccountState, BorrowSystemState } from "@/app/lib/credit-engine"

function normalizeBorrowAccount(account: BorrowAccountState): BorrowAccountState {
  return {
    ...account,
    walletLpBalancesUsd6: account.walletLpBalancesUsd6 ?? {},
    collateralPositions: account.collateralPositions ?? [],
    debtPositions: account.debtPositions ?? [],
    rewardPositions: account.rewardPositions ?? [],
  }
}

/** Repair persisted sandbox sessions that predate rewardPositions on accounts. */
export function normalizeBorrowSystemState(state: BorrowSystemState): BorrowSystemState {
  return {
    ...state,
    accounts: Object.fromEntries(
      Object.entries(state.accounts).map(([walletId, account]) => [walletId, normalizeBorrowAccount(account)]),
    ),
  }
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

function encode(value: unknown): JsonValue {
  if (typeof value === "bigint") {
    return { __bigint: value.toString() }
  }
  if (Array.isArray(value)) {
    return value.map((entry) => encode(entry))
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry)]))
  }
  return value as JsonValue
}

function decode(value: JsonValue): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => decode(entry))
  }
  if (value && typeof value === "object") {
    if ("__bigint" in value && typeof value.__bigint === "string") {
      return BigInt(value.__bigint)
    }
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, decode(entry)]))
  }
  return value
}

export function serializeBorrowValue(value: unknown) {
  return JSON.stringify(encode(value))
}

export function deserializeBorrowValue<T>(serialized: string): T {
  return decode(JSON.parse(serialized) as JsonValue) as T
}

export function serializeBorrowSystemState(state: BorrowSystemState) {
  return serializeBorrowValue(state)
}

export function deserializeBorrowSystemState(serialized: string): BorrowSystemState {
  return normalizeBorrowSystemState(deserializeBorrowValue<BorrowSystemState>(serialized))
}
