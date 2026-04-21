import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { TOKENS, MARKETS } from "./data"

// Custom hook for confetti
function useConfetti() {
  const triggerConfetti = () => {
    import('canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FC2672', '#18C964', '#F5A623', '#006FEE', '#7928CA', '#F31260', '#FFD700']
      })
    }).catch(() => {
      // Ignore if canvas-confetti is not installed, it's just a visual effect
    })
  }
  return triggerConfetti
}

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
  const triggerConfetti = useConfetti()

  const handleAction = () => {
    const amountNum = parseFloat(modalState.amount)
    if (isNaN(amountNum) || amountNum <= 0) return
    
    // Simulate transaction
    setTimeout(() => {
      setModalState(prev => ({ ...prev, type: 'success' }))
      triggerConfetti()
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
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-border/40 bg-background shadow-xl">
          {modalState.type === 'success' ? (
            <div className="flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
              <DialogTitle className="sr-only">Success</DialogTitle>
              <div className="mb-4 flex h-[84px] w-[84px] items-center justify-center rounded-full bg-emerald-500/10 text-5xl z-10 animate-in zoom-in duration-500">
                {'balance' in modalState.token ? (modalState.actionType === 'withdraw' ? '↑' : '💰') : '💰'}
              </div>
              <h2 className="mb-2 text-2xl font-medium tracking-tight text-foreground z-10">Done!</h2>
              <div className="font-data text-xl font-medium text-emerald-500 z-10 mb-2">
                {modalState.amount} {modalState.token.symbol}
              </div>
              <p className="text-sm text-muted-foreground z-10 mb-6">
                {'balance' in modalState.token && modalState.actionType === 'withdraw' 
                  ? 'Funds returned to your wallet.' 
                  : 'Earning risk premium APY starting next block.'}
              </p>
              <div className="w-full space-y-2 z-10">
                <Button className="w-full rounded-xl py-6 font-medium text-base" onClick={closeModal}>Done</Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader className="px-6 py-5 border-b border-border/40 relative">
                <DialogTitle className="sr-only">
                  {modalState.type === 'deposit' ? 'Deposit' : 'Withdraw'} {modalState.token.symbol}
                </DialogTitle>
                <div className="flex gap-6 relative">
                  <button 
                    onClick={() => setModalState(prev => ({ ...prev, type: 'deposit' }))}
                    className={`text-lg font-medium pb-5 -mb-5 transition-colors ${modalState.type === 'deposit' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Deposit
                  </button>
                  {'balance' in modalState.token && (
                    <button 
                      onClick={() => setModalState(prev => ({ ...prev, type: 'withdraw' }))}
                      className={`text-lg font-medium pb-5 -mb-5 transition-colors ${modalState.type === 'withdraw' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </DialogHeader>
              
              <div className="px-6 py-6">
                <div className="mb-6 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium ${modalState.token.bg} ${modalState.token.color}`}>
                    {modalState.token.symbol[0]}
                  </div>
                  <div>
                    <div className="text-lg font-medium">{modalState.token.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {modalState.type === 'withdraw' ? 'Withdraw from LP Hub' : 'LP Hub · Supply-Only Spoke'}
                    </div>
                  </div>
                </div>

                <div className="group relative mb-4 rounded-2xl border border-border/60 bg-muted/30 p-4 focus-within:border-primary/50 focus-within:bg-background transition-colors">
                  <div className="flex items-center justify-between">
                    <input 
                      type="number" 
                      placeholder="0"
                      value={modalState.amount}
                      onChange={(e) => setModalState(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-transparent text-3xl font-medium outline-none placeholder:text-muted-foreground/30 font-data"
                    />
                    <div className="rounded-full bg-background border border-border/40 px-3 py-1.5 text-sm font-medium">
                      {modalState.token.symbol}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>≈ ${(parseFloat(modalState.amount || '0') * ('price' in modalState.token ? modalState.token.price : 1)).toFixed(2)}</span>
                    {'balance' in modalState.token && (
                      <button 
                        className="font-medium text-primary hover:underline"
                        onClick={() => setModalState(prev => ({ ...prev, amount: tokenBalance.toString() }))}
                      >
                        Max: {isWithdraw ? tokenBalance : 12400}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-6 space-y-3 px-1 text-sm">
                  {modalState.type === 'deposit' ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Supply APY</span>
                        <span className="font-data font-medium text-emerald-500">{modalState.token.apy.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base Rate + LP Premium</span>
                        <span className="font-data font-medium">3.85% + {(modalState.token.apy || 5.20) - 3.85}%</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Est. Daily Yield</span>
                        <span className="font-data font-medium text-emerald-500">
                          ${(parseFloat(modalState.amount || '0') * (modalState.token.apy || 5.20) / 100 / 365).toFixed(3)} / day
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Deposited Balance</span>
                        <span className="font-data font-medium text-foreground">${'balance' in modalState.token ? modalState.token.balance.toLocaleString() : '0'}.00</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Interest Earned</span>
                        <span className="font-data font-medium text-emerald-500">
                          +${'earned' in modalState.token ? modalState.token.earned.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>You'll stop earning</span>
                        <span className="font-data font-medium text-foreground">
                          -${(parseFloat(modalState.amount || '0') * (modalState.token.apy || 5.20) / 100 / 365).toFixed(3)} / day
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-muted-foreground pt-3 border-t border-border/40">
                    <span>Network fee</span>
                    <span className="font-data font-medium text-foreground">~$0.80</span>
                  </div>
                </div>

                <Button 
                  className="w-full rounded-xl py-6 font-medium text-base transition-all hover:bg-primary/90"
                  disabled={!parseFloat(modalState.amount) || parseFloat(modalState.amount) <= 0 || Boolean(modalState.type === 'withdraw' && 'balance' in modalState.token && parseFloat(modalState.amount) > modalState.token.balance)}
                  onClick={handleAction}
                >
                  {!parseFloat(modalState.amount) || parseFloat(modalState.amount) <= 0 ? 'Enter an amount' : (modalState.type === 'withdraw' && 'balance' in modalState.token && parseFloat(modalState.amount) > modalState.token.balance) ? 'Exceeds balance' : `${modalState.type === 'deposit' ? 'Deposit' : 'Withdraw'} ${modalState.token.symbol}`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
