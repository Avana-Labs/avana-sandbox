import { TokenIcon } from "@/app/components/token-icon"

type LendAsset = {
  symbol: string
  name: string
  protocol: string
  category: string
  apy: number
  tvl: string
  rank: number
  glowSrc?: string
}

const ASSET_GROUPS: Array<{
  title: string
  assets: LendAsset[]
}> = [
  {
    title: "Stable Assets",
    assets: [
      { rank: 1, symbol: "USDC", name: "USD Coin", protocol: "Circle", category: "Stable", apy: 5.2, tvl: "$24.8M", glowSrc: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png" },
      { rank: 2, symbol: "USDT", name: "Tether USD", protocol: "Tether", category: "Stable", apy: 4.8, tvl: "$18.2M", glowSrc: "https://assets.coingecko.com/coins/images/325/large/Tether.png" },
      { rank: 3, symbol: "USDe", name: "Ethena USDe", protocol: "Ethena", category: "Stable", apy: 12.5, tvl: "$15.2M", glowSrc: "https://assets.coingecko.com/coins/images/33613/large/USDe.png" },
      { rank: 4, symbol: "DAI", name: "Dai Stablecoin", protocol: "MakerDAO", category: "Stable", apy: 4.01, tvl: "$12.4M", glowSrc: "https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png" },
      { rank: 5, symbol: "GHO", name: "Aave GHO", protocol: "Aave", category: "Stable", apy: 0.0, tvl: "$9.1M", glowSrc: "https://assets.coingecko.com/coins/images/31824/large/GHO.png" },
      { rank: 6, symbol: "PYUSD", name: "PayPal USD", protocol: "PayPal", category: "Stable", apy: 3.9, tvl: "$6.7M", glowSrc: "https://assets.coingecko.com/coins/images/39786/large/pyusd-logo.png" },
      { rank: 7, symbol: "FDUSD", name: "First Digital USD", protocol: "First Digital", category: "Stable", apy: 4.3, tvl: "$5.4M", glowSrc: "https://assets.coingecko.com/coins/images/35199/large/fdusd.png" },
      { rank: 8, symbol: "FRAX", name: "Frax", protocol: "Frax", category: "Stable", apy: 5.6, tvl: "$4.2M", glowSrc: "https://assets.coingecko.com/coins/images/13422/large/frax.png" },
    ],
  },
  {
    title: "Blueship Assets",
    assets: [
      { rank: 1, symbol: "ETH", name: "Ethereum", protocol: "Ethereum", category: "Bluechip", apy: 3.82, tvl: "$31.5M", glowSrc: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
      { rank: 2, symbol: "WBTC", name: "Wrapped Bitcoin", protocol: "WBTC", category: "Bluechip", apy: 3.48, tvl: "$0.9M", glowSrc: "https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png" },
      { rank: 3, symbol: "SOL", name: "Solana", protocol: "Solana", category: "Bluechip", apy: 6.12, tvl: "$9.6M", glowSrc: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
      { rank: 4, symbol: "cbBTC", name: "Coinbase Wrapped BTC", protocol: "Coinbase", category: "Bluechip", apy: 4.25, tvl: "$2.1M", glowSrc: "https://assets.coingecko.com/coins/images/40143/large/cbbtc.png" },
      { rank: 5, symbol: "wstETH", name: "Wrapped stETH", protocol: "Lido", category: "Bluechip", apy: 5.14, tvl: "$8.4M", glowSrc: "https://assets.coingecko.com/coins/images/13442/large/steth_logo.png" },
      { rank: 6, symbol: "mETH", name: "Mantle Staked Ether", protocol: "Mantle", category: "Bluechip", apy: 4.87, tvl: "$3.6M", glowSrc: "https://assets.coingecko.com/coins/images/30980/large/meth.png" },
      { rank: 7, symbol: "rsETH", name: "Kelp rsETH", protocol: "Kelp DAO", category: "Bluechip", apy: 5.31, tvl: "$2.8M", glowSrc: "https://assets.coingecko.com/coins/images/37459/large/rsETH.png" },
      { rank: 8, symbol: "cbETH", name: "Coinbase Wrapped Staked ETH", protocol: "Coinbase", category: "Bluechip", apy: 4.62, tvl: "$1.9M", glowSrc: "https://assets.coingecko.com/coins/images/27008/large/cbeth.png" },
    ],
  },
  {
    title: "DeFi Assets",
    assets: [
      { rank: 1, symbol: "AAVE", name: "Aave", protocol: "Aave", category: "DeFi", apy: 7.6, tvl: "$4.7M", glowSrc: "https://assets.coingecko.com/coins/images/12645/large/AAVE.png" },
      { rank: 2, symbol: "UNI", name: "Uniswap", protocol: "Uniswap", category: "DeFi", apy: 6.4, tvl: "$3.2M", glowSrc: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png" },
      { rank: 3, symbol: "MKR", name: "Maker", protocol: "MakerDAO", category: "DeFi", apy: 5.9, tvl: "$2.8M", glowSrc: "https://assets.coingecko.com/coins/images/1364/large/Mark_Maker.png" },
      { rank: 4, symbol: "LDO", name: "Lido DAO", protocol: "Lido", category: "DeFi", apy: 6.8, tvl: "$5.1M", glowSrc: "https://assets.coingecko.com/coins/images/13573/large/Lido_DAO.png" },
      { rank: 5, symbol: "JUP", name: "Jupiter", protocol: "Jupiter", category: "DeFi", apy: 8.2, tvl: "$6.3M", glowSrc: "https://assets.coingecko.com/coins/images/34184/large/jup.png" },
      { rank: 6, symbol: "PENDLE", name: "Pendle", protocol: "Pendle", category: "DeFi", apy: 9.15, tvl: "$2.4M", glowSrc: "https://assets.coingecko.com/coins/images/15069/large/Pendle.png" },
      { rank: 7, symbol: "CRV", name: "Curve DAO", protocol: "Curve", category: "DeFi", apy: 5.45, tvl: "$1.8M", glowSrc: "https://assets.coingecko.com/coins/images/12124/large/Curve.png" },
      { rank: 8, symbol: "COMP", name: "Compound", protocol: "Compound", category: "DeFi", apy: 4.95, tvl: "$1.6M", glowSrc: "https://assets.coingecko.com/coins/images/10775/large/COMP.png" },
    ],
  },
]

function AssetCard({ asset }: { asset: LendAsset }) {
  return (
    <button
      type="button"
      className="group relative flex h-[120px] w-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border-light bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.03)] transition-all hover:border-border-medium hover:shadow-[0_12px_48px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-medium md:w-auto md:min-w-0"
    >
      <div className="pointer-events-none absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border border-border-light bg-white/80 shadow-sm backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-text-extra-low transition-colors group-hover:text-text-low" aria-hidden="true">
          <path d="M7 7h10v10" />
          <path d="M7 17 17 7" />
        </svg>
      </div>

      {asset.glowSrc ? (
        <img
          alt=""
          aria-hidden="true"
          width="96"
          height="96"
          className="pointer-events-none absolute -left-5 -top-5 size-[274px] rounded-full object-cover opacity-10 blur-2xl saturate-150"
          loading="lazy"
          decoding="async"
          src={asset.glowSrc}
        />
      ) : null}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <TokenIcon symbol={asset.symbol} size="lg" ring className="bg-gray-50" />
            <div className="absolute bottom-0 right-0 translate-x-1.5 translate-y-1.5">
              <div className="flex size-5 items-center justify-center rounded-md border-2 border-white bg-[#CD7F32]" aria-hidden="true">
                <span className="text-[8px] font-bold text-white">{asset.rank}</span>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <div className="flex min-w-0 items-baseline gap-1">
              <span className="truncate text-[13px] font-semibold text-text-extra-high">{asset.name}</span>
              <span className="shrink-0 text-[11px] text-text-low tabular-nums">{asset.symbol}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="rounded-full border border-border-light bg-gray-50 px-2 py-0.5 text-[10px] text-text-medium">
                {asset.category}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <div>
            <div className="text-[9px] text-text-extra-low">APY</div>
            <div className="mt-0.5 text-[12px] tabular-nums text-text-extra-high">{asset.apy.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-[9px] text-text-extra-low">TVL</div>
            <div className="mt-0.5 text-[12px] tabular-nums text-text-extra-high">{asset.tvl}</div>
          </div>
        </div>
      </div>
    </button>
  )
}

export function LendAssetSpokes() {
  return (
    <section>
      <div className="space-y-8">
        {ASSET_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-3">
              <h3 className="text-[18px] font-medium tracking-tight text-text-extra-high md:text-[20px]">
                {group.title}
              </h3>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:overflow-visible md:pb-0 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.assets.map((asset) => (
                <AssetCard key={`${group.title}-${asset.symbol}`} asset={asset} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
