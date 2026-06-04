"use client"

import { useState } from "react"
import { TOKENS, MARKETS } from "./components/data"
import { LendHero } from "./components/lend-hero"
import { MyInvestments } from "./components/my-investments"
import { LendAssetSpokes } from "./components/lend-asset-spokes"
import { HotMarkets } from "./components/hot-markets"
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

  const openDeposit = (token: typeof TOKENS[number] | typeof MARKETS[number]) => {
    setModalState({ isOpen: true, type: 'deposit', actionType: 'deposit', token, amount: '' })
  }

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <div className="bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-[1152px]">
          
          <LendHero />

          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start mt-12">
            
            {/* LEFT: TOKENS TABLE & EXPLORE */}
            <div>
              <MyInvestments openDeposit={openDeposit} />
            </div>

            {/* RIGHT: HOT MARKETS */}
            <div className="space-y-8">
              <HotMarkets onSelect={(market) => openDeposit(market)} />
            </div>

          </div>

          <div className="mt-8">
            <LendAssetSpokes />
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
