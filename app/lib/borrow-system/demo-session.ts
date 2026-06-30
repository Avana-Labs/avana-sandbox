import { getDefaultWalletProfileId } from "@/app/lib/data/wallet/profiles"
import { serializeBorrowSystemState } from "./codec"
import { buildMockBorrowSystemState } from "./mock"

export function getBorrowSessionWalletId() {
  return getDefaultWalletProfileId()
}

export function buildBorrowSessionSeed(walletId = getBorrowSessionWalletId()) {
  return serializeBorrowSystemState(buildMockBorrowSystemState(walletId))
}
