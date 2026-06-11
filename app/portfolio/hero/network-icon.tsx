import { NETWORK_VISUAL } from "./portfolio-network-data"
import type { NetworkId } from "./types"

function NetworkClusterIcon({ size = 24 }: { size?: number }) {
  const chip = Math.round(size * 0.72)
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full border-2 border-background"
        style={{ width: chip, height: chip, background: "#F50DB4" }}
      />
      <span
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border-2 border-background"
        style={{ width: chip, height: chip, background: "#0A0A0A" }}
      />
    </span>
  )
}

export function NetworkIcon({ id, size = 24 }: { id: NetworkId; size?: number }) {
  if (id === "all") {
    return <NetworkClusterIcon size={size} />
  }
  const visual = NETWORK_VISUAL[id]
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white"
      style={{ width: size, height: size, background: visual.background, fontSize: Math.round(size * 0.46) }}
    >
      {visual.letter}
    </span>
  )
}
