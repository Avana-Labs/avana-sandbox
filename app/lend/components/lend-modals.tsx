import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import { PrimaryCardButton } from "@/app/components/home/shared"
import { TokenIcon } from "@/app/components/token-icon"
import { sanitizeNumericInput } from "@/app/lib/numeric-input"
import type { LendPageData } from "@/app/lib/data/providers/lend"

type ModalStage = "entry" | TransactionFlowStage

type ModalState = {
  isOpen: boolean
  type: "deposit" | "withdraw" | "success"
  actionType: "deposit" | "withdraw"
  token: LendPageData["tokens"][number] | LendPageData["markets"][number] | null
  amount: string
}

interface LendModalsProps {
  tokens: LendPageData["tokens"]
  markets: LendPageData["markets"]
  modalState: ModalState
  setModalState: React.Dispatch<React.SetStateAction<ModalState>>
  closeModal: () => void
}

export function LendModals({ tokens, markets, modalState, setModalState, closeModal }: LendModalsProps) {
  const [stage, setStage] = useState<ModalStage>("entry")
  void tokens
  void markets

  useEffect(() => {
    if (modalState.isOpen) {
      setStage("entry")
    }
  }, [modalState.isOpen, modalState.type, modalState.token?.symbol])

  const isWithdraw = modalState.type === "withdraw"
  const token = modalState.token
  const tokenBalance = token && "balance" in token ? token.balance : 0
  const tokenPrice = token && "price" in token ? token.price : 1
  const tokenApy = token?.apy ?? 5.2
  const parsedAmount = parseFloat(modalState.amount) || 0
  const isExceedsBalance = isWithdraw && parsedAmount > tokenBalance
  const isInvalidAmount = !parsedAmount || parsedAmount <= 0
  const aaveFooterNote = (
    <>
      Powered by Aave v4.{" "}
      <a href="https://aave.com/docs/aave-v4" target="_blank" rel="noreferrer" className="text-accent-emphasis">
        Learn More
      </a>
    </>
  )

  useEffect(() => {
    if (stage !== "processing" || !token) return

    const timer = window.setTimeout(() => {
      setStage("success")
      toast.success(`${modalState.type === "deposit" ? "Deposited" : "Withdrawn"} ${modalState.amount} ${token.symbol}`)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [modalState.amount, modalState.type, stage, token])

  const handleClose = () => {
    if (stage === "processing") return
    setStage("entry")
    closeModal()
  }

  return (
    <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && handleClose()}>
      {token && (
        <DialogContent
          fullScreenOnMobile
          hideMobileHandle
          className="sm:max-w-[440px] p-0 overflow-hidden border-border bg-surface-raised shadow-elev-3 rounded-radius-md"
        >
          <DialogTitle className="sr-only">
            {modalState.type === "deposit" ? "Deposit" : "Withdraw"} {token.symbol}
          </DialogTitle>
          {stage === "entry" ? (
            <div className="flex h-full min-h-0 flex-col bg-background sm:h-auto">
              <DialogHeader className="px-5 py-4 border-b border-border relative">
                <div className="flex gap-5 relative">
                  <button
                    onClick={() => setModalState((prev) => ({ ...prev, type: "deposit" }))}
                    className={`text-[13px] font-medium pb-4 -mb-4 transition-colors border-b-[1.5px] ${modalState.type === "deposit" ? "text-foreground border-accent-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                  >
                    Deposit
                  </button>
                  {"balance" in token && (
                    <button
                      onClick={() => setModalState((prev) => ({ ...prev, type: "withdraw" }))}
                      className={`text-[13px] font-medium pb-4 -mb-4 transition-colors border-b-[1.5px] ${modalState.type === "withdraw" ? "text-foreground border-accent-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </DialogHeader>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:pb-5 sm:pt-6">
                <div className="flex min-h-full flex-col gap-2.5">
                  <div className="px-1 py-3 md:flex-1 md:min-h-[140px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[hsl(var(--brand))]">
                        {modalState.type === "deposit" ? "You're depositing" : "You're withdrawing"}
                      </span>
                      {"balance" in token ? (
                        <button
                          type="button"
                          onClick={() => setModalState((prev) => ({ ...prev, amount: tokenBalance.toString() }))}
                          className="text-[12px] font-medium text-[hsl(var(--brand))] transition-colors hover:opacity-80"
                        >
                          Max
                        </button>
                      ) : null}
                    </div>

                    <div className="flex min-h-[100px] flex-col items-center justify-center gap-3 py-2 text-center sm:min-h-[120px] md:min-h-[110px] md:py-0">
                      <label className="flex w-full justify-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={modalState.amount}
                          onChange={(e) => setModalState((prev) => ({ ...prev, amount: sanitizeNumericInput(e.target.value) }))}
                          className="no-number-spinner w-[min(100%,12ch)] bg-transparent text-center font-compact text-[clamp(3.2rem,9vw,4.8rem)] font-medium leading-none tracking-[-0.05em] text-foreground outline-none placeholder:text-muted-foreground/20"
                        />
                      </label>
                      <div className="text-[12px] text-muted-foreground">
                        {modalState.amount
                          ? `≈ $${(parseFloat(modalState.amount || "0") * tokenPrice).toFixed(2)}`
                          : modalState.type === "deposit"
                            ? "Start earning from LP Hub deposits"
                            : "Choose how much to withdraw"}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)] md:gap-2.5 md:px-3.5">
                      <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
                        <TokenIcon symbol={token.symbol} size="lg" />
                      </span>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">
                          {modalState.type === "deposit" ? "Deposit asset" : "Withdraw asset"}
                        </span>
                        <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
                          {token.symbol}
                        </span>
                      </span>
                    </div>

                    <div className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)] md:gap-2.5 md:px-3.5">
                      <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
                        <span className="font-compact text-[28px] leading-none text-[hsl(var(--brand))]">{modalState.type === "deposit" ? "%" : "$"}</span>
                      </span>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">
                          {modalState.type === "deposit" ? "Supply APY" : "Available balance"}
                        </span>
                        <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
                          {modalState.type === "deposit" ? `${tokenApy.toFixed(2)}%` : `${tokenBalance.toLocaleString()}`}
                        </span>
                      </span>
                    </div>
                  </div>

                  <PrimaryCardButton
                    disabled={isInvalidAmount || Boolean(isExceedsBalance)}
                    onClick={() => setStage("review")}
                  >
                    {isInvalidAmount
                      ? "Enter an amount"
                      : isExceedsBalance
                        ? "Exceeds balance"
                      : `Review ${modalState.type === "deposit" ? "deposit" : "withdrawal"}`}
                  </PrimaryCardButton>

                  <div className="mt-auto pt-3 text-center text-[12px] text-muted-foreground">
                    {aaveFooterNote}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <TransactionFlowPanel
              stage={stage as TransactionFlowStage}
              actionLabel={modalState.type === "deposit" ? "deposit" : "withdrawal"}
              amountLabel={`${modalState.amount} ${token.symbol}`}
              title={modalState.type === "deposit" ? "Deposit submitted" : "Withdrawal submitted"}
              subtitle={
                modalState.type === "deposit" ? "Deposit completed." : "Withdrawal completed."
              }
              visual={<TokenIcon symbol={token.symbol} size="lg" />}
              rows={[
                { label: "Asset", value: token.symbol },
                { label: modalState.type === "deposit" ? "Supply APY" : "Deposited balance", value: modalState.type === "deposit" ? `${tokenApy.toFixed(2)}%` : `$${tokenBalance.toLocaleString()}.00`, tone: modalState.type === "deposit" ? "positive" as const : "default" as const },
                { label: "Network fee", value: "~$0.80" },
              ]}
              note={undefined}
              footerNote={aaveFooterNote}
              primaryLabel={
                stage === "review"
                  ? modalState.type === "deposit"
                    ? "Deposit now"
                    : "Withdraw now"
                  : stage === "approve"
                    ? "Approve wallet"
                    : "Done"
              }
              onPrimary={() => {
                if (stage === "review") setStage("approve")
                else if (stage === "approve") setStage("processing")
                else handleClose()
              }}
              onBack={() => setStage("entry")}
              onClose={handleClose}
              className="rounded-none border-0 bg-transparent shadow-none"
              variant="bare"
            />
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
