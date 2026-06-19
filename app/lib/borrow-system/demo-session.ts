import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import { serializeBorrowSystemState } from "./codec"
import { buildMockBorrowSystemState } from "./mock"

export function getBorrowSessionWalletId() {
  return getDefaultWalletProfileId()
}

export function buildBorrowSessionSeed(walletId = getBorrowSessionWalletId()) {
  return serializeBorrowSystemState(buildMockBorrowSystemState(walletId))
}
