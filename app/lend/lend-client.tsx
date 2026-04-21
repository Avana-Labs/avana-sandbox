"use client"

import { useMemo, useState } from "react"
import { TOKENS, MARKETS } from "./components/data"
import { LendHero } from "./components/lend-hero"
import { MyInvestments } from "./components/my-investments"
import { ExploreOpportunities } from "./components/explore-opportunities"
import { RecentActivity } from "./components/recent-activity"
import { LendModals } from "./components/lend-modals"

export function LendClient() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'deposit' | 'withdraw' | 'success';
    actionType: 'deposit' | 'withdraw';
    token: typeof TOKENS[number] | typeof MARKETS[number] | null;
    amount: string;
  }>({
    isOpen: false,
    type: 'deposit',
    actionType: 'deposit',
    token: null,
    amount: ''
  })

  const totalValue = useMemo(() => TOKENS.reduce((sum, t) => sum + (t.balance * t.price), 0), [])
  const totalEarned = useMemo(() => TOKENS.reduce((sum, t) => sum + t.earned, 0), [])

  const openDeposit = (token: typeof TOKENS[number] | typeof MARKETS[number]) => {
    setModalState({ isOpen: true, type: 'deposit', actionType: 'deposit', token, amount: '' })
  }

  const openWithdraw = (token: typeof TOKENS[number]) => {
    setModalState({ isOpen: true, type: 'withdraw', actionType: 'withdraw', token, amount: '' })
  }

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          
          <LendHero 
            totalValue={totalValue} 
            totalEarned={totalEarned} 
            openDeposit={openDeposit as any} 
            openWithdraw={openWithdraw as any} 
          />

          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start mt-12">
            
            {/* LEFT: TOKENS TABLE & EXPLORE */}
            <div>
              <MyInvestments openDeposit={openDeposit} />
              <ExploreOpportunities openDeposit={openDeposit} />
            </div>

            {/* RIGHT: RECENT ACTIVITY */}
            <div>
              <RecentActivity />
            </div>

          </div>

        </div>

        <LendModals 
          modalState={modalState} 
          setModalState={setModalState} 
          closeModal={closeModal} 
        />

      </main>
    </div>
  )
}
