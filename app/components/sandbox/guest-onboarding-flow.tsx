"use client"

import { useState } from "react"
import { Check } from "@/app/components/icons"
import { WalletControl } from "@/app/components/wallet-control"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const PRIMARY =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-7 text-[15px] font-semibold text-brand-foreground shadow-elev-1 transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"

export function GuestOnboardingFlow() {
  const [hasStarted, setHasStarted] = useState(false)
  const { t } = useTranslation()

  return (
    <div
      className="mx-auto w-full max-w-[938px] py-4 sm:py-8"
      data-onboarding-step="connect"
      data-testid="onboarding-canvas"
    >
      <div className="mb-9 sm:mb-11">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
            style={{ width: hasStarted ? "25%" : "10%" }}
          />
        </div>
      </div>
      <div data-onboarding-phase={hasStarted ? "connect" : "intro"}>
        {!hasStarted ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/avana-wordmark-220.png"
              alt="Avana"
              width="160"
              height="63"
              loading="eager"
              fetchPriority="high"
              className="h-auto w-[132px] sm:w-[160px]"
            />
            <h1 className="mt-5 max-w-[280px] text-balance text-[15px] font-medium leading-[1.2] tracking-normal sm:text-[18px]">
              {t("Welcome to the Avana Sandbox")}
            </h1>
            <p className="sr-only">
              {t("Practice borrowing, lending, and looping with sandbox funds. No real assets. No wallet signatures.")}
            </p>
            <ul className="mt-5 space-y-2">
              {["Unlimited practice funds", "No transactions to sign", "No real assets involved"].map((perk) => (
                <li className="flex items-center gap-2 text-[13px] font-medium" key={perk}>
                  <Check className="size-3.5 shrink-0 text-emerald-500" strokeWidth={2.75} />
                  {t(perk)}
                </li>
              ))}
            </ul>
            <button className={`${PRIMARY} mt-7`} onClick={() => setHasStarted(true)} type="button">
              {t("Get started")}
            </button>
          </>
        ) : (
          <>
            <h1 className="max-w-[560px] text-balance text-[clamp(1.4rem,2.3vw,1.75rem)] font-medium leading-[1.16] tracking-[-0.03em]">
              <span className="text-muted-foreground">{t("Connect an EVM wallet.")}</span>
              <br />
              <span className="text-foreground">{t("We'll set up your sandbox and scope it to your address.")}</span>
            </h1>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <WalletControl size="desktop" />
            </div>
            <p className="mt-8 max-w-[430px] text-[13px] leading-5 text-muted-foreground">
              {t("By connecting your wallet, you agree to the")}{" "}
              <a
                className="text-foreground underline underline-offset-2 hover:text-brand"
                href={AVANA_EXTERNAL_LINKS.terms}
                target="_blank"
                rel="noreferrer"
              >
                {t("Terms & Conditions")}
              </a>{" "}
              {t("and")}{" "}
              <a
                className="text-foreground underline underline-offset-2 hover:text-brand"
                href={AVANA_EXTERNAL_LINKS.privacy}
                target="_blank"
                rel="noreferrer"
              >
                {t("Privacy Policy")}
              </a>
              .
            </p>
          </>
        )}
      </div>
    </div>
  )
}
