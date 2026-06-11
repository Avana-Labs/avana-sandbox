export function WalletMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="walletMarkFill" x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF74C4" />
          <stop offset="100%" stopColor="#FF0F9D" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="20" rx="6.4" ry="13.5" transform="rotate(45 20 20)" fill="url(#walletMarkFill)" />
      <ellipse cx="20" cy="20" rx="6.4" ry="13.5" transform="rotate(-45 20 20)" fill="url(#walletMarkFill)" />
    </svg>
  )
}
