import "server-only"
import { cookies } from "next/headers"
import { verifySiweSessionJwt } from "@/app/lib/siwe/jwt"
import { IS_DEV_SHORTCUT_MODE } from "@/app/lib/test-mode"

/**
 * True when this request has no verified SIWE session, i.e. the root SandboxGate will show a
 * guest the onboarding flow instead of the page. Server components still execute for
 * `children` the gate never renders, so gated pages check this and skip their Convex reads.
 * Same verification as the root layout (signature + expiry, no network). The dev open gate
 * renders pages without a session, so it never counts as a guest.
 */
export async function isGuestRequest(): Promise<boolean> {
  if (IS_DEV_SHORTCUT_MODE) return false
  const session = (await cookies()).get("avana_siwe")?.value
  return !session || !verifySiweSessionJwt(session)
}
