"use client"

import { useState } from "react"
import { TOKENS, MARKETS } from "./components/data"
import { LendHero } from "./components/lend-hero"
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
        <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
          <LendHero />

          <div className="mt-12 space-y-8">
            <HotMarkets />
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
