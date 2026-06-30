import { getDefaultWalletProfileId } from "@/app/lib/data/wallet/profiles"
import { serializeMultiplySystemState } from "./codec"
import { buildMockMultiplySystemState, buildMockMultiplySystemStateWithSeedPosition } from "./mock"

export function getMultiplySessionWalletId() {
  return getDefaultWalletProfileId()
}

export function buildMultiplySessionSeed(walletId = getMultiplySessionWalletId()) {
  return serializeMultiplySystemState(buildMockMultiplySystemStateWithSeedPosition(walletId))
}

export function buildConvexMultiplySessionSeed(walletId: string) {
  return serializeMultiplySystemState(buildMockMultiplySystemState(walletId))
}
