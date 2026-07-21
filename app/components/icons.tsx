import type { ComponentType, SVGProps } from "react"
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react"
import {
  AlertTriangle as _AlertTriangle,
  ArrowDown as _ArrowDown,
  ArrowRight as _ArrowRight,
  ArrowShrinkIcon as _ArrowShrink,
  ArrowUpRight as _ArrowUpRight,
  ArrowUpRightStackIcon as _ArrowUpRightStack,
  BadgeCheck as _BadgeCheck,
  BookOpen as _BookOpen,
  Check as _Check,
  CheckCircle as _CheckCircle,
  ChevronDown as _ChevronDown,
  ChevronLeft as _ChevronLeft,
  ChevronRight as _ChevronRight,
  ChevronUp as _ChevronUp,
  Circle as _Circle,
  CircleArrowDown as _CircleArrowDown,
  CircleArrowOutDownRightIcon as _CircleArrowOutDownRight,
  CircleArrowOutUpLeftIcon as _CircleArrowOutUpLeft,
  CircleArrowUp as _CircleArrowUp,
  CircleUserRound as _CircleUserRound,
  Code as _Code,
  Coins as _Coins,
  Compass as _Compass,
  Copy as _Copy,
  DollarCircleIcon as _DollarCircleIcon,
  Droplets as _Droplets,
  EnteringGeoFenceIcon as _EnteringGeoFence,
  ExternalLink as _ExternalLink,
  Eye as _Eye,
  EyeOff as _EyeOff,
  FileText as _FileText,
  Flame as _Flame,
  GiftIcon as _Gift,
  Globe as _Globe,
  GraduationCap as _GraduationCap,
  HandCoins as _HandCoins,
  Heart as _Heart,
  HelpCircleIcon as _HelpCircleIcon,
  Info as _Info,
  LayerSendBackwardIcon as _LayerSendBackward,
  Layers as _Layers,
  LeavingGeoFenceIcon as _LeavingGeoFence,
  LifeBuoy as _LifeBuoy,
  Link2 as _Link2,
  LoaderCircle as _LoaderCircle,
  LockKeyhole as _LockKeyhole,
  LogIn as _LogIn,
  LogOut as _LogOut,
  Mail as _Mail,
  Menu as _Menu,
  MessageSquare as _MessageSquare,
  Moon as _Moon,
  MoonStar as _MoonStar,
  MoreHorizontal as _MoreHorizontal,
  MoveUpRight as _MoveUpRight,
  Orbit as _Orbit,
  PieChart as _PieChart,
  Repeat as _Repeat,
  Repeat2 as _Repeat2,
  Rocket as _Rocket,
  Search as _Search,
  Shield as _Shield,
  ShieldCheck as _ShieldCheck,
  Sparkles as _Sparkles,
  SquareLock02Icon as _SquareLock02,
  Sun as _Sun,
  SunMedium as _SunMedium,
  Target as _Target,
  TrendingDown as _TrendingDown,
  TrendingUp as _TrendingUp,
  Trophy as _Trophy,
  Umbrella as _Umbrella,
  Unlock as _Unlock,
  Wallet as _Wallet,
  X as _X,
} from "@hugeicons/core-free-icons"

/**
 * Central icon module. Every app icon renders via Hugeicons; this re-exports them
 * under Lucide-compatible component names so call sites keep the <Icon className=…/>
 * API. Generated to drop the lucide-react dependency.
 */
export type IconProps = SVGProps<SVGSVGElement> & { size?: string | number }
export type IconComponent = ComponentType<IconProps>
// Back-compat alias for the old lucide type name.
export type LucideIcon = IconComponent

function makeIcon(icon: HugeiconsIconProps["icon"]): IconComponent {
  function Icon({ size, strokeWidth, ...rest }: IconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        strokeWidth={strokeWidth == null ? undefined : Number(strokeWidth)}
        {...rest}
      />
    )
  }
  return Icon
}

export const AlertTriangle: IconComponent = makeIcon(_AlertTriangle)
export const ArrowDown: IconComponent = makeIcon(_ArrowDown)
export const ArrowRight: IconComponent = makeIcon(_ArrowRight)
export const ArrowShrink: IconComponent = makeIcon(_ArrowShrink)
export const ArrowUpRight: IconComponent = makeIcon(_ArrowUpRight)
export const ArrowUpRightStack: IconComponent = makeIcon(_ArrowUpRightStack)
export const BadgeCheck: IconComponent = makeIcon(_BadgeCheck)
export const BadgeDollarSign: IconComponent = makeIcon(_DollarCircleIcon)
export const BookOpen: IconComponent = makeIcon(_BookOpen)
export const Check: IconComponent = makeIcon(_Check)
export const CheckCircle2: IconComponent = makeIcon(_CheckCircle)
export const ChevronDown: IconComponent = makeIcon(_ChevronDown)
export const ChevronLeft: IconComponent = makeIcon(_ChevronLeft)
export const ChevronRight: IconComponent = makeIcon(_ChevronRight)
export const ChevronUp: IconComponent = makeIcon(_ChevronUp)
export const Circle: IconComponent = makeIcon(_Circle)
export const CircleArrowDown: IconComponent = makeIcon(_CircleArrowDown)
export const CircleArrowOutDownRight: IconComponent = makeIcon(_CircleArrowOutDownRight)
export const CircleArrowOutUpLeft: IconComponent = makeIcon(_CircleArrowOutUpLeft)
export const CircleArrowUp: IconComponent = makeIcon(_CircleArrowUp)
export const CircleDollarSign: IconComponent = makeIcon(_DollarCircleIcon)
export const CircleHelp: IconComponent = makeIcon(_HelpCircleIcon)
export const CircleUserRound: IconComponent = makeIcon(_CircleUserRound)
export const Code2: IconComponent = makeIcon(_Code)
export const Coins: IconComponent = makeIcon(_Coins)
export const Compass: IconComponent = makeIcon(_Compass)
export const Copy: IconComponent = makeIcon(_Copy)
export const Droplets: IconComponent = makeIcon(_Droplets)
export const EnteringGeoFence: IconComponent = makeIcon(_EnteringGeoFence)
export const ExternalLink: IconComponent = makeIcon(_ExternalLink)
export const Eye: IconComponent = makeIcon(_Eye)
export const EyeOff: IconComponent = makeIcon(_EyeOff)
export const FileText: IconComponent = makeIcon(_FileText)
export const Flame: IconComponent = makeIcon(_Flame)
export const Gift: IconComponent = makeIcon(_Gift)
export const Globe: IconComponent = makeIcon(_Globe)
export const Globe2: IconComponent = makeIcon(_Globe)
export const GraduationCap: IconComponent = makeIcon(_GraduationCap)
export const HandCoins: IconComponent = makeIcon(_HandCoins)
export const Heart: IconComponent = makeIcon(_Heart)
export const Info: IconComponent = makeIcon(_Info)
export const LayerSendBackward: IconComponent = makeIcon(_LayerSendBackward)
export const Layers3: IconComponent = makeIcon(_Layers)
export const LeavingGeoFence: IconComponent = makeIcon(_LeavingGeoFence)
export const LifeBuoy: IconComponent = makeIcon(_LifeBuoy)
export const Link2: IconComponent = makeIcon(_Link2)
export const LoaderCircle: IconComponent = makeIcon(_LoaderCircle)
export const LockKeyhole: IconComponent = makeIcon(_LockKeyhole)
export const LogIn: IconComponent = makeIcon(_LogIn)
export const LogOut: IconComponent = makeIcon(_LogOut)
export const Mail: IconComponent = makeIcon(_Mail)
export const Menu: IconComponent = makeIcon(_Menu)
export const MessageSquare: IconComponent = makeIcon(_MessageSquare)
export const Moon: IconComponent = makeIcon(_Moon)
export const MoonStar: IconComponent = makeIcon(_MoonStar)
export const MoreHorizontal: IconComponent = makeIcon(_MoreHorizontal)
export const MoveUpRight: IconComponent = makeIcon(_MoveUpRight)
export const Orbit: IconComponent = makeIcon(_Orbit)
export const PieChart: IconComponent = makeIcon(_PieChart)
export const Repeat: IconComponent = makeIcon(_Repeat)
export const Repeat2: IconComponent = makeIcon(_Repeat2)
export const Rocket: IconComponent = makeIcon(_Rocket)
export const Search: IconComponent = makeIcon(_Search)
export const Shield: IconComponent = makeIcon(_Shield)
export const ShieldCheck: IconComponent = makeIcon(_ShieldCheck)
export const Sparkles: IconComponent = makeIcon(_Sparkles)
export const SquareLock02: IconComponent = makeIcon(_SquareLock02)
export const Sun: IconComponent = makeIcon(_Sun)
export const SunMedium: IconComponent = makeIcon(_SunMedium)
export const Target: IconComponent = makeIcon(_Target)
export const TrendingDown: IconComponent = makeIcon(_TrendingDown)
export const TrendingUp: IconComponent = makeIcon(_TrendingUp)
export const Trophy: IconComponent = makeIcon(_Trophy)
export const Umbrella: IconComponent = makeIcon(_Umbrella)
export const Unlock: IconComponent = makeIcon(_Unlock)
export const Wallet: IconComponent = makeIcon(_Wallet)
export const X: IconComponent = makeIcon(_X)
