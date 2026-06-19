import type { BorrowSystemState } from "@/app/lib/credit-engine"

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

export function serializeBorrowSystemState(state: BorrowSystemState) {
  return JSON.stringify(encode(state))
}

export function deserializeBorrowSystemState(serialized: string): BorrowSystemState {
  return decode(JSON.parse(serialized) as JsonValue) as BorrowSystemState
}
