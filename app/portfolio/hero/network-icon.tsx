import type { CSSProperties, ReactNode } from "react"
import type { NetworkId } from "./types"

function Circle({
  size,
  background,
  children,
  style,
}: {
  size: number
  background: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background, ...style }}
    >
      {children}
    </span>
  )
}

function EthereumIcon({ size }: { size: number }) {
  return (
    <Circle size={size} background="linear-gradient(180deg, #EFF2FF 0%, #DDE4FF 100%)">
      <svg width={Math.round(size * 0.62)} height={Math.round(size * 0.8)} viewBox="0 0 18 28" fill="none" aria-hidden="true">
        <path d="M9 0L8.8 0.7V18.5L9 18.7L17.3 13.8L9 0Z" fill="#8A92B2" />
        <path d="M9 0L0.7 13.8L9 18.7V10.1V0Z" fill="#62688F" />
        <path d="M9 20.3L8.9 20.4V27.1L9 27.5L17.3 15.4L9 20.3Z" fill="#8A92B2" />
        <path d="M9 27.5V20.3L0.7 15.4L9 27.5Z" fill="#62688F" />
        <path d="M9 18.7L17.3 13.8L9 10.1V18.7Z" fill="#454A75" />
        <path d="M0.7 13.8L9 18.7V10.1L0.7 13.8Z" fill="#62688F" />
      </svg>
    </Circle>
  )
}

function BaseIcon({ size }: { size: number }) {
  return (
    <Circle size={size} background="#0052FF">
      <svg width={Math.round(size * 0.74)} height={Math.round(size * 0.74)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" fill="white" />
        <circle cx="12" cy="12" r="2.7" fill="#0052FF" />
      </svg>
    </Circle>
  )
}

function ArbitrumIcon({ size }: { size: number }) {
  return (
    <Circle size={size} background="linear-gradient(180deg, #213147 0%, #1B283A 100%)">
      <svg width={Math.round(size * 0.76)} height={Math.round(size * 0.86)} viewBox="0 0 26 30" fill="none" aria-hidden="true">
        <path d="M13 1.2L24 7.6V20.4L13 28.8L2 20.4V7.6L13 1.2Z" fill="#2D374B" stroke="#9FC7FF" strokeWidth="1.2" />
        <path d="M14.5 7.2L18.4 18.3H21.4L17.5 7.2H14.5Z" fill="#28A0F0" />
        <path d="M8.8 21.2L11.1 14.8L13.4 21.2H16.1L12.5 11.2H9.8L6.2 21.2H8.8Z" fill="white" />
        <path d="M6.8 9.1L3.9 17.2L5.8 18.6L9.5 8.6L6.8 9.1Z" fill="#9DCCED" />
      </svg>
    </Circle>
  )
}

function SolanaIcon({ size }: { size: number }) {
  return (
    <Circle size={size} background="#0B0F1A">
      <svg width={Math.round(size * 0.8)} height={Math.round(size * 0.62)} viewBox="0 0 32 22" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="solanaMark" x1="2" y1="2" x2="28" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14F195" />
            <stop offset="100%" stopColor="#9945FF" />
          </linearGradient>
        </defs>
        <path d="M6 1.5H28L24 5.8H2L6 1.5Z" fill="url(#solanaMark)" />
        <path d="M6 9H28L24 13.2H2L6 9Z" fill="url(#solanaMark)" opacity="0.92" />
        <path d="M6 16.5H28L24 20.8H2L6 16.5Z" fill="url(#solanaMark)" opacity="0.86" />
      </svg>
    </Circle>
  )
}

function UnichainIcon({ size }: { size: number }) {
  return (
    <Circle size={size} background="#FF3BBF">
      <svg width={Math.round(size * 0.72)} height={Math.round(size * 0.72)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 6.5v6.8c0 2.9 1.9 4.7 5 4.7 3.1 0 5-1.8 5-4.7V6.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </Circle>
  )
}

function MonadIcon({ size }: { size: number }) {
  return (
    <Circle size={size} background="#836EF9">
      <svg width={Math.round(size * 0.74)} height={Math.round(size * 0.6)} viewBox="0 0 24 18" fill="none" aria-hidden="true">
        <path d="M3 15V3.2l4.5 5 4.5-5 4.5 5 4.5-5V15" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Circle>
  )
}

function TempoIcon({ size }: { size: number }) {
  return (
    <Circle size={size} background="#111111">
      <svg width={Math.round(size * 0.7)} height={Math.round(size * 0.7)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 7h14M12 7v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </Circle>
  )
}

function AllNetworksIcon({ size = 24 }: { size?: number }) {
  const chip = Math.round(size * 0.74)
  return (
    <span className="relative inline-block shrink-0" style={{ width: size + Math.round(size * 0.4), height: size }}>
      <span className="absolute left-0 top-1/2 -translate-y-1/2">
        <EthereumIcon size={chip} />
      </span>
      <span className="absolute left-[34%] top-1/2 -translate-y-1/2">
        <BaseIcon size={chip} />
      </span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2">
        <SolanaIcon size={chip} />
      </span>
    </span>
  )
}

export function NetworkIcon({ id, size = 24 }: { id: NetworkId; size?: number }) {
  if (id === "all") {
    return <AllNetworksIcon size={size} />
  }
  if (id === "ethereum") return <EthereumIcon size={size} />
  if (id === "unichain") return <UnichainIcon size={size} />
  if (id === "base") return <BaseIcon size={size} />
  if (id === "arbitrum") return <ArbitrumIcon size={size} />
  if (id === "tempo") return <TempoIcon size={size} />
  if (id === "monad") return <MonadIcon size={size} />
  return <SolanaIcon size={size} />
}
