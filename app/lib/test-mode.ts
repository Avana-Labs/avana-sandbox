export function isDevelopmentTestMode() {
  return process.env.NODE_ENV === "development"
}

export function isPlaywrightTestMode() {
  return process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "1"
}

export function shouldUseOpenGateSession() {
  return isDevelopmentTestMode() || isPlaywrightTestMode()
}

export function shouldUseMockDataSource() {
  return shouldUseOpenGateSession() || process.env.AVANA_DATA_SOURCE === "mock"
}

export const IS_DEV_SHORTCUT_MODE = shouldUseOpenGateSession()
export const IS_OPEN_GATE_TEST_MODE = IS_DEV_SHORTCUT_MODE

export const TEST_MODE_WALLET_ADDRESS =
  "0x0000000000000000000000000000000000000a11"
