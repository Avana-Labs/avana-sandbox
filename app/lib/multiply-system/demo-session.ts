import { getDefaultWalletProfileId } from "@/app/lib/data/wallet/profiles"
import { serializeMultiplySystemState } from "./codec"
import { buildMockMultiplySystemStateWithSeedPosition } from "./mock"

export function getMultiplySessionWalletId() {
  return getDefaultWalletProfileId()
}

export function buildMultiplySessionSeed(walletId = getMultiplySessionWalletId()) {
  return serializeMultiplySystemState(buildMockMultiplySystemStateWithSeedPosition(walletId))
}
