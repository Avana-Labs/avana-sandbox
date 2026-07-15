"use client";

import Image from "next/image";
import { ActionIcon } from "@/app/components/action-icon";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { actionPagePath } from "@/app/lib/action-system/contracts";
import { Button } from "@/components/ui/button";
import {
  DesktopTableSurface,
  HoverActionGroup,
  SilentActionHeader,
} from "@/app/components/market-table-primitives";
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives";
import { TokenIcon } from "@/app/components/token-icon";
import { LEND_ASSET_GROUPS } from "@/app/lib/data/catalog/lend";
import type { LendPageData } from "@/app/lib/data/providers/lend";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_LEFT,
  TABLE_ROW_HOVER_RIGHT,
} from "@/app/lib/ui/table-row-hover";
import { usePriceFor } from "@/app/lib/prices/token-prices-context";
import { formatTokenPrice } from "@/app/lib/prices/format";
import { useTranslation } from "@/app/lib/i18n/use-translation";
import { MarketFilterBar } from "@/app/lib/ui/market-filter-bar";
import {
  CATEGORY_CHIPS,
  matchesCategory,
  type CategoryChip,
} from "@/app/lib/markets/category";
import { useMediaQuery } from "@/app/lib/use-media-query";

/** Real DefiLlama price under the asset name; falls back to the symbol when unpriced. */
function AssetSubLabel({ symbol }: { symbol: string }) {
  const priceFor = usePriceFor();
  const price = priceFor(symbol);
  return <>{price !== undefined ? formatTokenPrice(price) : symbol}</>;
}

type AssetRow = LendPageData["assetGroups"][number]["rows"][number] & {
  marketId?: string;
  href?: string;
  supplyApyLabel?: string;
  rewardsApyLabel?: string;
  totalApyLabel?: string;
  supplyApyValue?: number;
  rewardsApyValue?: number;
  totalDepositsLabel?: string;
  totalDepositsSecondaryLabel?: string;
  totalDepositsSortValue?: number;
  utilizationLabel?: string;
  utilizationValue?: number;
  availableLiquidityLabel?: string;
  availableLiquiditySecondaryLabel?: string;
  availableLiquiditySortValue?: number;
};
type AssetGroup = LendPageData["assetGroups"][number];
const DEFAULT_ASSET_GROUPS: AssetGroup[] = LEND_ASSET_GROUPS;

function SortIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 16"
      fill="none"
      className="size-[14px] text-muted-foreground/70 dark:text-white/60"
    >
      <path
        d="M4 5 6 3l2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 11 6 13l2-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssetIcon({ row }: { row: AssetRow }) {
  if (row.logoSrc) {
    return (
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent">
        <Image
          alt={row.logoAlt ?? `${row.symbol} logo`}
          src={row.logoSrc}
          width={40}
          height={40}
          sizes="40px"
          className="h-full w-full object-contain"
          unoptimized
        />
      </span>
    );
  }

  return (
    <TokenIcon
      symbol={row.symbol}
      size="table"
      ring
      className="bg-card dark:bg-card"
    />
  );
}

function AssetRowView({
  row,
  index,
  delay,
  onDeposit,
}: {
  row: AssetRow;
  index: number;
  delay: number;
  onDeposit?: (marketId: string) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const marketId =
    "marketId" in row && typeof row.marketId === "string"
      ? row.marketId
      : row.symbol.toLowerCase();
  const detailHref = row.href ?? `/lend/markets/${marketId}`;
  const detailReturn = detailHref;
  return (
    <tr
      className="asset-swap group cursor-pointer transition-colors"
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => router.push(detailHref)}
    >
      <td
        className={`py-3 pl-6 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
      >
        {index + 1}
      </td>
      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="flex min-w-0 items-center gap-3">
          <AssetIcon row={row} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
              {row.name}
            </div>
            <div className="mt-0.5 text-[13px] font-normal tracking-[-0.03em] text-muted-foreground md:text-[13px]">
              <AssetSubLabel symbol={row.symbol} />
            </div>
          </div>
        </div>
      </td>

      <td
        className={`py-3 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px] ${TABLE_ROW_HOVER_BG}`}
      >
        <span className="tabular-nums">{row.supplyApyLabel ?? row.apy}</span>
      </td>

      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
          <span className="tabular-nums">
            {row.totalDepositsLabel ?? row.totalDepositsPrimary}
          </span>
        </div>
        <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
          {row.totalDepositsSecondaryLabel ?? row.totalDepositsSecondary}
        </div>
      </td>

      <td
        className={`py-3 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px] ${TABLE_ROW_HOVER_BG}`}
      >
        <span className="tabular-nums">{row.utilizationLabel ?? "—"}</span>
      </td>

      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
          <span className="tabular-nums">
            {row.availableLiquidityLabel ?? row.availableLiquidityPrimary}
          </span>
        </div>
        <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
          {row.availableLiquiditySecondaryLabel ??
            row.availableLiquiditySecondary}
        </div>
      </td>

      <td className={`py-3 px-4 pr-4 ${TABLE_ROW_HOVER_RIGHT}`}>
        {onDeposit ? (
          <div className="flex justify-end">
            <HoverActionGroup className="gap-2">
              <Button
                type="button"
                size="table"
                variant="table-primary"
                className="w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeposit(marketId);
                }}
              >
                <ActionIcon label="Deposit" />
                {t("Deposit")}
              </Button>
              <Button
                type="button"
                size="table"
                variant="table-secondary"
                className="w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(
                    actionPagePath("lend", "withdraw", {
                      market: marketId,
                      return: detailReturn,
                    }),
                  );
                }}
              >
                <ActionIcon label="Withdraw" />
                {t("Withdraw")}
              </Button>
            </HoverActionGroup>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

function AssetCardView({ row, index }: { row: AssetRow; index: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const marketId =
    "marketId" in row && typeof row.marketId === "string"
      ? row.marketId
      : row.symbol.toLowerCase();
  const detailHref = row.href ?? `/lend/markets/${marketId}`;
  return (
    <MarketMobileCard
      clickable
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => router.push(detailHref)}
    >
      <MarketMobileCardHeader
        identity={
          <div className="flex min-w-0 items-center gap-3">
            <AssetIcon row={row} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                {row.name}
              </div>
              <div className="mt-0.5 text-[12px] tracking-[-0.03em] text-muted-foreground">
                <AssetSubLabel symbol={row.symbol} />
              </div>
            </div>
          </div>
        }
        metric={
          <MarketMobileMetric
            value={row.supplyApyLabel ?? row.apy}
            label={t("APY")}
          />
        }
      />
      <MarketMobileStatList className="mt-4">
        <MarketMobileStatRow
          label={t("Total Deposits")}
          value={
            <span>
              {row.totalDepositsLabel ?? row.totalDepositsPrimary}
              <span className="ml-2 text-[12px] tracking-[-0.03em] text-muted-foreground">
                {row.totalDepositsSecondaryLabel ?? row.totalDepositsSecondary}
              </span>
            </span>
          }
        />
        <MarketMobileStatRow
          label={t("Utilization")}
          value={row.utilizationLabel ?? "—"}
        />
        <MarketMobileStatRow
          label={t("Available Liquidity")}
          value={
            <span>
              {row.availableLiquidityLabel ?? row.availableLiquidityPrimary}
              <span className="ml-2 text-[12px] tracking-[-0.03em] text-muted-foreground">
                {row.availableLiquiditySecondaryLabel ??
                  row.availableLiquiditySecondary}
              </span>
            </span>
          }
        />
      </MarketMobileStatList>
    </MarketMobileCard>
  );
}

function AssetSection({
  title,
  subtitle,
  rows,
  onDeposit,
  initialIsDesktop,
  deferContent,
}: {
  title: string;
  subtitle?: string;
  rows: AssetRow[];
  onDeposit?: (marketId: string) => void;
  initialIsDesktop: boolean;
  deferContent: boolean;
}) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 768px)", initialIsDesktop, true);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [contentMounted, setContentMounted] = useState(
    !deferContent || process.env.NODE_ENV === "test",
  );
  const [sortKey, setSortKey] = useState<
    | "asset"
    | "supplyApy"
    | "totalDeposits"
    | "utilization"
    | "availableLiquidity"
  >("asset");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const toggleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "asset" ? "asc" : "desc");
  };

  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case "supplyApy":
          return (
            ((a.supplyApyValue ?? a.apyValue / 100) -
              (b.supplyApyValue ?? b.apyValue / 100)) *
            direction
          );
        case "totalDeposits":
          return (
            ((a.totalDepositsSortValue ?? a.totalDepositsValue ?? 0) -
              (b.totalDepositsSortValue ?? b.totalDepositsValue ?? 0)) *
            direction
          );
        case "utilization":
          return (
            ((a.utilizationValue ?? 0) - (b.utilizationValue ?? 0)) * direction
          );
        case "availableLiquidity":
          return (
            ((a.availableLiquiditySortValue ?? a.availableLiquidityValue ?? 0) -
              (b.availableLiquiditySortValue ??
                b.availableLiquidityValue ??
                0)) *
            direction
          );
        case "asset":
        default:
          return a.name.localeCompare(b.name) * direction;
      }
    });
  }, [rows, sortDirection, sortKey]);

  useEffect(() => {
    if (contentMounted) return;
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      setContentMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setContentMounted(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px", threshold: 0 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [contentMounted]);

  return (
    <section ref={sectionRef} className="space-y-5">
      {/* Sticky like the Borrow spoke headers: each asset-group title hangs under the
          site header while its own table scrolls, then the next group's title takes over. */}
      <div className="sticky top-16 z-20 flex flex-col gap-3 bg-background py-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={cn(
              "text-[22px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[24px]",
              title === "Ethereum-Based" ? "md:text-[23px]" : "",
            )}
          >
            {t(title)}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[13px] text-muted-foreground dark:text-white/44">
              {t(subtitle)}
            </p>
          ) : null}
        </div>
      </div>

      {!contentMounted ? (
        <div
          aria-hidden
          className="min-h-[640px] rounded-radius-md bg-table-row"
        />
      ) : (
        <DesktopTableSurface className="rounded-radius-md [contain-intrinsic-size:auto_640px] [content-visibility:auto]">
          {!isDesktop ? (
            <div className="space-y-4">
              {sortedRows.length > 0 ? (
                sortedRows.map((row, index) => (
                  <AssetCardView key={row.symbol} row={row} index={index} />
                ))
              ) : (
                <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
                  {t("No assets match these filters.")}
                </div>
              )}
            </div>
          ) : null}
          {isDesktop ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0 text-[12px]">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="w-[22%]" />
                  <col className="w-[12%]" />
                  <col className="w-[19%]" />
                  <col className="w-[12%]" />
                  <col className="w-[20%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                    <th className="rounded-l-radius-lg bg-table-header px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                      #
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => toggleSort("asset")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "asset"
                            ? "text-foreground dark:text-white"
                            : "text-foreground/70 dark:text-white/70",
                        )}
                      >
                        <span>{t("ASSET")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                      <button
                        type="button"
                        onClick={() => toggleSort("supplyApy")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "supplyApy"
                            ? "text-foreground dark:text-white"
                            : "text-foreground/70 dark:text-white/70",
                        )}
                      >
                        <span>{t("SUPPLY APY")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                      <button
                        type="button"
                        onClick={() => toggleSort("totalDeposits")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "totalDeposits"
                            ? "text-foreground dark:text-white"
                            : "text-foreground/70 dark:text-white/70",
                        )}
                      >
                        <span>{t("TOTAL DEPOSITS")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                      <button
                        type="button"
                        onClick={() => toggleSort("utilization")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "utilization"
                            ? "text-foreground dark:text-white"
                            : "text-foreground/70 dark:text-white/70",
                        )}
                      >
                        <span>{t("UTILIZATION")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                      <button
                        type="button"
                        onClick={() => toggleSort("availableLiquidity")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "availableLiquidity"
                            ? "text-foreground dark:text-white"
                            : "text-foreground/70 dark:text-white/70",
                        )}
                      >
                        <span>{t("AVAILABLE LIQUIDITY")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <SilentActionHeader />
                  </tr>
                </thead>
                <tbody
                  key={`${title}-${sortKey}-${sortDirection}`}
                  className="divide-y divide-border dark:divide-white/6"
                >
                  {sortedRows.length > 0 ? (
                    sortedRows.map((row, index) => (
                      <AssetRowView
                        key={row.symbol}
                        row={row}
                        index={index}
                        delay={index * 40}
                        onDeposit={onDeposit}
                      />
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-6 py-10 text-[12px] text-muted-foreground dark:text-white/60"
                        colSpan={7}
                      >
                        {t("No assets match these filters.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </DesktopTableSurface>
      )}
    </section>
  );
}

export function LendAssetSpokes({
  groups = DEFAULT_ASSET_GROUPS,
  onDeposit,
  initialIsDesktop = true,
}: {
  groups?: LendPageData["assetGroups"];
  onDeposit?: (marketId: string) => void;
  initialIsDesktop?: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [currentTab, setCurrentTab] = useState<CategoryChip["id"]>("all");

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return groups
      .map((group) => {
        const rows = group.rows.filter((row) => {
          const matchesSearch =
            query.length === 0 ||
            row.name.toLowerCase().includes(query) ||
            row.symbol.toLowerCase().includes(query);
          return matchesSearch && matchesCategory(row.symbol, currentTab);
        });

        return { ...group, rows };
      })
      .filter((group) => group.rows.length > 0);
  }, [groups, search, currentTab]);

  return (
    <section
      className="mt-[38px] space-y-[58px]"
      style={{ overflowAnchor: "none" }}
    >
      <div className="py-2.5">
        <MarketFilterBar
          chips={CATEGORY_CHIPS.lend}
          tab={currentTab}
          onTabChange={setCurrentTab}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("Search assets")}
        />
      </div>

      <div className="space-y-14">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group, index) => (
            <div key={group.title} className="space-y-8">
              <AssetSection
                title={group.title}
                subtitle={group.subtitle}
                rows={group.rows}
                onDeposit={onDeposit}
                initialIsDesktop={initialIsDesktop}
                deferContent={index > 0}
              />
              {group.title === "Ethereum-Based" ? (
                <div className="flex justify-center">
                  <div className="h-px w-full max-w-[980px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/10" />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-radius-md border-0 bg-card px-6 py-10 text-[13px] text-muted-foreground shadow-none">
            {t("No assets match these filters.")}
          </div>
        )}
      </div>
    </section>
  );
}
