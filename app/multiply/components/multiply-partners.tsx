type Partner = {
  label: string
  logoSrc: string
  noActiveRewards?: boolean
}

const PARTNERS: Partner[] = [
  { label: "All", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/loopscale-icon-light.svg" },
  { label: "Bulk", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/logo/bulk.png" },
  { label: "Collector Crypt", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/collector-crypto-logo-two.png" },
  { label: "Fragmetric", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/organizations/fragmetric-logo.png" },
  { label: "Hylo", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png" },
  { label: "OnRe", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg" },
  { label: "Oro", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/oro-logo.jpg" },
  { label: "Solstice", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png" },
  { label: "Etherfuse", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/etherfuse-logo.jpg", noActiveRewards: true },
  { label: "Exponent", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/exponent-logo-v1.png", noActiveRewards: true },
  { label: "Flash", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/organizations/flash-trade-logo.jpeg", noActiveRewards: true },
  { label: "RateX", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/organizations/rate-x-logo.jpeg", noActiveRewards: true },
  { label: "xStocks", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/xstocks-logo.jpg", noActiveRewards: true },
  { label: "Zenrock", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/zenrock-logo.png", noActiveRewards: true },
  { label: "Zeus", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/zeus-logo.jpg", noActiveRewards: true },
]

export function MultiplyPartnersSection() {
  return (
    <section className="mt-6 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">Explore</h2>
        </div>
      </div>

      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
          {PARTNERS.map((partner) => (
            <PartnerCard key={partner.label} partner={partner} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div className="shrink-0">
      <div className="flex h-full w-[108px] flex-col items-center justify-center gap-1.5 px-2 py-1.5">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={partner.logoSrc} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        </div>
        <p className="max-w-full truncate text-center text-[12px] font-medium text-foreground">{partner.label}</p>
      </div>
    </div>
  )
}
