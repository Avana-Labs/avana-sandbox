import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { TokenIcon } from "@/app/components/token-icon"
import { TOKENS, MARKETS } from "./data"

type ModalState = {
  isOpen: boolean;
  type: 'deposit' | 'withdraw' | 'success';
  actionType: 'deposit' | 'withdraw';
  token: typeof TOKENS[number] | typeof MARKETS[number] | null;
  amount: string;
}

interface LendModalsProps {
  modalState: ModalState;
  setModalState: React.Dispatch<React.SetStateAction<ModalState>>;
  closeModal: () => void;
}

export function LendModals({ modalState, setModalState, closeModal }: LendModalsProps) {
  const handleAction = () => {
    const amountNum = parseFloat(modalState.amount)
    if (isNaN(amountNum) || amountNum <= 0) return
    
    setTimeout(() => {
      setModalState(prev => ({ ...prev, type: 'success' }))
      toast.success(`${modalState.type === 'deposit' ? 'Deposited' : 'Withdrawn'} ${modalState.amount} ${modalState.token?.symbol}`)
    }, 500)
  }

  const isWithdraw = modalState.type === 'withdraw'
  const isDeposit = modalState.type === 'deposit'
  const token = modalState.token as any
  const tokenSymbol = token?.symbol || ''
  const tokenBg = token?.bg || ''
  const tokenColor = token?.color || ''
  const tokenBalance = token?.balance || 0
  const tokenPrice = token?.price || 1
  const tokenApy = token?.apy || 5.20
  const tokenEarned = token?.earned || 0
  const parsedAmount = parseFloat(modalState.amount) || 0
  const isExceedsBalance = isWithdraw && parsedAmount > tokenBalance
  const isInvalidAmount = !parsedAmount || parsedAmount <= 0
  const estDailyYield = (parsedAmount * tokenApy / 100 / 365).toFixed(3)

  return (
    <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && closeModal()}>
      {modalState.token && (
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-border bg-surface-raised shadow-elev-3 rounded-radius-md">
          {modalState.type === 'success' ? (
            <div className="flex flex-col items-center justify-center p-8 text-center relative">
              <DialogTitle className="sr-only">Success</DialogTitle>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xs border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Check className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <h2 className="mb-1.5 text-[16px] font-medium tracking-tight text-foreground">
                {'balance' in modalState.token && modalState.actionType === 'withdraw' ? 'Withdrawal submitted' : 'Deposit submitted'}
              </h2>
              <div className="font-data text-[20px] font-medium tabular-nums text-foreground mb-1.5">
                {modalState.amount} {modalState.token.symbol}
              </div>
              <p className="text-[12px] text-muted-foreground mb-5 max-w-[320px]">
                {'balance' in modalState.token && modalState.actionType === 'withdraw' 
                  ? 'Funds will be returned to your wallet once the transaction confirms.' 
                  : 'Your position will begin earning supply APY starting next block.'}
              </p>
              <Button className="w-full" onClick={closeModal}>Done</Button>
            </div>
          ) : (
            <>
              <DialogHeader className="px-5 py-4 border-b border-border relative">
                <DialogTitle className="sr-only">
                  {modalState.type === 'deposit' ? 'Deposit' : 'Withdraw'} {modalState.token.symbol}
                </DialogTitle>
                <div className="flex gap-5 relative">
                  <button 
                    onClick={() => setModalState(prev => ({ ...prev, type: 'deposit' }))}
                    className={`text-[13px] font-medium pb-4 -mb-4 transition-colors border-b-[1.5px] ${modalState.type === 'deposit' ? 'text-foreground border-accent-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                  >
                    Deposit
                  </button>
                  {'balance' in modalState.token && (
                    <button 
                      onClick={() => setModalState(prev => ({ ...prev, type: 'withdraw' }))}
                      className={`text-[13px] font-medium pb-4 -mb-4 transition-colors border-b-[1.5px] ${modalState.type === 'withdraw' ? 'text-foreground border-accent-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </DialogHeader>
              
              <div className="px-5 py-5">
                <div className="mb-5 flex items-center gap-3">
                  <TokenIcon symbol={modalState.token.symbol} size="lg" />
                  <div>
                    <div className="text-[14px] font-medium text-foreground">{modalState.token.symbol}</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {modalState.type === 'withdraw' ? 'Withdraw from LP Hub' : 'LP Hub · Supply-only spoke'}
                    </div>
                  </div>
                </div>

                <div className="group relative mb-4 rounded-radius-sm border border-border bg-surface-inset p-3.5 focus-within:border-accent-primary/40 focus-within:bg-surface-raised transition-colors">
                  <div className="flex items-center justify-between">
                    <input 
                      type="number" 
                      placeholder="0"
                      value={modalState.amount}
                      onChange={(e) => setModalState(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-transparent text-[26px] font-medium outline-none placeholder:text-muted-foreground/30 font-data tabular-nums tracking-tight"
                    />
                    <div className="rounded-xs border border-border bg-surface-raised px-2.5 py-1 text-[12px] font-medium">
                      {modalState.token.symbol}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>≈ ${(parseFloat(modalState.amount || '0') * ('price' in modalState.token ? modalState.token.price : 1)).toFixed(2)}</span>
                    {'balance' in modalState.token && (
                      <button 
                        className="font-medium text-accent-primary hover:underline"
                        onClick={() => setModalState(prev => ({ ...prev, amount: tokenBalance.toString() }))}
                      >
                        Max: {isWithdraw ? tokenBalance : 12400}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-5 space-y-2 rounded-radius-sm border border-border bg-surface-inset px-3.5 py-3 text-[12px]">
                  {modalState.type === 'deposit' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Supply APY</span>
                        <span className="font-data font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{modalState.token.apy.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base rate + LP premium</span>
                        <span className="font-data font-medium tabular-nums text-foreground">3.85% + {(modalState.token.apy || 5.20) - 3.85}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. daily yield</span>
                        <span className="font-data font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                          ${estDailyYield} / day
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposited balance</span>
                        <span className="font-data font-medium tabular-nums text-foreground">${'balance' in modalState.token ? modalState.token.balance.toLocaleString() : '0'}.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interest earned</span>
                        <span className="font-data font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                          +${'earned' in modalState.token ? modalState.token.earned.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">You&apos;ll stop earning</span>
                        <span className="font-data font-medium tabular-nums text-foreground">
                          -${estDailyYield} / day
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-muted-foreground">Network fee</span>
                    <span className="font-data font-medium tabular-nums text-foreground">~$0.80</span>
                  </div>
                </div>

                <Button 
                  className="w-full h-10 text-[13px]"
                  disabled={isInvalidAmount || Boolean(isExceedsBalance)}
                  onClick={handleAction}
                >
                  {isInvalidAmount ? 'Enter an amount' : isExceedsBalance ? 'Exceeds balance' : `${modalState.type === 'deposit' ? 'Deposit' : 'Withdraw'} ${modalState.token.symbol}`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
