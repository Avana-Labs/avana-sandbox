import { Circle, CircleArrowUp, Coins, ShieldCheck, Umbrella, Unlock } from "@/app/components/icons"

const learnCards = [
  {
    title: "Isolated slashing",
    body: "Each Umbrella stake token covers deficits for its matching borrowed asset on the same network.",
    icon: ShieldCheck,
  },
  {
    title: "Dynamic rewards",
    body: "Emissions adjust against target liquidity, and each staked asset can earn multiple reward tokens.",
    icon: Coins,
  },
  {
    title: "Cooldown",
    body: "Start cooldown before withdrawing. During cooldown, the position keeps earning incentives and remains slashable.",
    icon: Circle,
  },
  {
    title: "Withdrawal window",
    body: "After cooldown completes, there is a short window to unstake. If it expires, cooldown must be started again.",
    icon: Unlock,
  },
  {
    title: "Unstake window",
    body: "Once cooldown finishes, users can unstake during the withdrawal window before cooldown has to be restarted.",
    icon: CircleArrowUp,
  },
  {
    title: "Module assets",
    body: "Umbrella positions are split by asset and network, so each stake token has its own risk and reward profile.",
    icon: Umbrella,
  },
]

export function UmbrellaLearn() {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          Learn Umbrella
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {learnCards.map((card) => (
          <article key={card.title} className="rounded-radius-md bg-card px-4 py-4">
            <card.icon className="h-6 w-6 text-brand" />
            <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.03em]">{card.title}</h3>
            <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
