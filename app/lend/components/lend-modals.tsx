import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import { TokenIcon } from "@/app/components/token-icon"
import { sanitizeNumericInput } from "@/app/lib/numeric-input"
import { TOKENS, MARKETS } from "./data"

type ModalStage = "entry" | TransactionFlowStage

type ModalState = {
  isOpen: boolean
  type: "deposit" | "withdraw" | "success"
  actionType: "deposit" | "withdraw"
  token: (typeof TOKENS)[number] | (typeof MARKETS)[number] | null
  amount: string
}

interface LendModalsProps {
  modalState: ModalState
  setModalState: React.Dispatch<React.SetStateAction<ModalState>>
  closeModal: () => void
}

export function LendModals({ modalState, setModalState, closeModal }: LendModalsProps) {
  const [stage, setStage] = useState<ModalStage>("entry")

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
  const tokenEarned = token && "earned" in token ? token.earned : 0
  const parsedAmount = parseFloat(modalState.amount) || 0
  const isExceedsBalance = isWithdraw && parsedAmount > tokenBalance
  const isInvalidAmount = !parsedAmount || parsedAmount <= 0
  const estDailyYield = (parsedAmount * tokenApy / 100 / 365).toFixed(3)

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
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-border bg-surface-raised shadow-elev-3 rounded-radius-md">
          <DialogTitle className="sr-only">
            {modalState.type === "deposit" ? "Deposit" : "Withdraw"} {token.symbol}
          </DialogTitle>
          {stage === "entry" ? (
            <>
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

              <div className="px-5 py-5">
                <div className="mb-5 flex items-center gap-3">
                  <TokenIcon symbol={token.symbol} size="lg" />
                  <div>
                    <div className="text-[14px] font-medium text-foreground">{token.symbol}</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {modalState.type === "withdraw" ? "Withdraw from LP Hub" : "LP Hub · Supply-only spoke"}
                    </div>
                  </div>
                </div>

                <div className="group relative mb-4 border-b border-border pb-3 focus-within:border-accent-primary/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      placeholder="0"
                      value={modalState.amount}
                      onChange={(e) => setModalState((prev) => ({ ...prev, amount: sanitizeNumericInput(e.target.value) }))}
                      className="w-full bg-transparent text-[26px] font-medium outline-none placeholder:text-muted-foreground/30 font-data tabular-nums tracking-tight"
                    />
                    <div className="rounded-xs border border-border bg-surface-raised px-2.5 py-1 text-[12px] font-medium">
                      {token.symbol}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>≈ ${(parseFloat(modalState.amount || "0") * tokenPrice).toFixed(2)}</span>
                    {"balance" in token && (
                      <button
                        className="font-medium text-accent-primary hover:underline"
                        onClick={() => setModalState((prev) => ({ ...prev, amount: tokenBalance.toString() }))}
                      >
                        Max: {isWithdraw ? tokenBalance : 12400}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-5 divide-y divide-border border-y border-border text-[12px]">
                  {modalState.type === "deposit" ? (
                    <>
                      <div className="flex justify-between px-0 py-2.5">
                        <span className="text-muted-foreground">Supply APY</span>
                        <span className="font-data font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{tokenApy.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between px-0 py-2.5">
                        <span className="text-muted-foreground">Base rate + LP premium</span>
                        <span className="font-data font-medium tabular-nums text-foreground">3.85% + {tokenApy - 3.85}%</span>
                      </div>
                      <div className="flex justify-between px-0 py-2.5">
                        <span className="text-muted-foreground">Est. daily yield</span>
                        <span className="font-data font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                          ${estDailyYield} / day
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between px-0 py-2.5">
                        <span className="text-muted-foreground">Deposited balance</span>
                        <span className="font-data font-medium tabular-nums text-foreground">${tokenBalance.toLocaleString()}.00</span>
                      </div>
                      <div className="flex justify-between px-0 py-2.5">
                        <span className="text-muted-foreground">Interest earned</span>
                        <span className="font-data font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                          +${tokenEarned.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between px-0 py-2.5">
                        <span className="text-muted-foreground">You&apos;ll stop earning</span>
                        <span className="font-data font-medium tabular-nums text-foreground">
                          -${estDailyYield} / day
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between px-0 py-2.5">
                    <span className="text-muted-foreground">Network fee</span>
                    <span className="font-data font-medium tabular-nums text-foreground">~$0.80</span>
                  </div>
                </div>

                <Button
                  className="w-full h-10 text-[13px]"
                  disabled={isInvalidAmount || Boolean(isExceedsBalance)}
                  onClick={() => setStage("review")}
                >
                  {isInvalidAmount
                    ? "Enter an amount"
                    : isExceedsBalance
                      ? "Exceeds balance"
                      : `Review ${modalState.type === "deposit" ? "deposit" : "withdrawal"}`}
                </Button>
              </div>
            </>
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
              note="Approve wallet, then wait for confirmation."
              primaryLabel={stage === "review" ? "Continue" : stage === "approve" ? "Approve wallet" : "Done"}
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
