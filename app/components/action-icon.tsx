import type { LucideIcon } from "@/app/components/icons"
import {
  ArrowShrink,
  ArrowUpRightStack,
  CircleArrowOutDownRight,
  CircleArrowOutUpLeft,
  DollarReceive02,
  DownloadCircle02,
  LayerSendBackward,
  SafeBox,
  UploadCircle02,
} from "@/app/components/icons"

const ACTION_ICONS: Record<string, LucideIcon> = {
  deposit: DownloadCircle02,
  supply: DownloadCircle02,
  pledge: SafeBox,
  borrow: CircleArrowOutDownRight,
  repay: CircleArrowOutUpLeft,
  withdraw: UploadCircle02,
  multiply: ArrowUpRightStack,
  deleverage: ArrowShrink,
  claim: DollarReceive02,
  remove: LayerSendBackward,
}

/** Renders the directional icon for an action label, or nothing if unmapped.
 * Sizing/color come from the parent Button (`[&_svg]:size-3.5`, text color). */
export function ActionIcon({ label, className }: { label: string; className?: string }) {
  const Icon = ACTION_ICONS[label.trim().toLowerCase()]
  return Icon ? <Icon className={className} aria-hidden="true" /> : null
}
