export type ActionSubmitResult = {
  receipt: {
    status: string
    error?: string | null
    hash?: string | null
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function runActionSubmitFlow<T extends ActionSubmitResult>(options: {
  simulated: boolean
  needsAllowance?: boolean
  onStage: (stage: import("./contracts").ActionStage) => void
  execute: () => Promise<T>
}): Promise<T> {
  if (options.needsAllowance) {
    options.onStage("approve_allowance")
    if (options.simulated) await delay(900)
  }

  options.onStage("wallet_sign")
  if (options.simulated) await delay(1200)

  options.onStage("processing")
  if (options.simulated) await delay(1400)

  return options.execute()
}
