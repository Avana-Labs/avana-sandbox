import type { LucideIcon } from "@/app/components/icons"
import {
  ArrowShrink,
  ArrowUpRightStack,
  CircleArrowOutDownRight,
  CircleArrowOutUpLeft,
  EnteringGeoFence,
  Gift,
  LayerSendBackward,
  LeavingGeoFence,
  SquareLock02,
} from "@/app/components/icons"

const ACTION_ICONS: Record<string, LucideIcon> = {
  deposit: EnteringGeoFence,
  supply: EnteringGeoFence,
  pledge: SquareLock02,
  borrow: CircleArrowOutDownRight,
  repay: CircleArrowOutUpLeft,
  withdraw: LeavingGeoFence,
  multiply: ArrowUpRightStack,
  deleverage: ArrowShrink,
  claim: Gift,
  remove: LayerSendBackward,
}

/** Renders the directional icon for an action label, or nothing if unmapped.
 * Sizing/color come from the parent Button (`[&_svg]:size-3.5`, text color). */
export function ActionIcon({ label, className }: { label: string; className?: string }) {
  const Icon = ACTION_ICONS[label.trim().toLowerCase()]
  return Icon ? <Icon className={className} aria-hidden="true" /> : null
}
