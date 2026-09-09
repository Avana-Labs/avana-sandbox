# Launch hardening implementation

This change series implements the 14 security, cost, and maintainability findings from the September 9 QA audit on PR #283. Each item is a separate commit. Service configuration changes and measured production savings require deployment follow-up; no production data is seeded by these changes.

| Item | Scope                                               | Validation                                                                                        |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| S1   | Update Next.js/Sharp/Browserslist security baseline | 36 focused tests; PNG → resize → WebP passed; zero critical/high production dependency advisories |

The remaining low/moderate dependency findings include the wallet connector chain. A wagmi major migration is deliberately separate from the patched Next.js image stack.

## S2 — Isolated E2E authentication

Production rejects E2E session minting even with a secret/test flag. Staging requires an explicit deployment marker, distinct production/staging URLs and issuers, and its own private JWK. JWT publication/minting/verification use that staging key consistently. Eight JWT/policy/endpoint tests passed, including cross-key session rejection. Set the documented staging variables only on staging; provision keys outside source control.

The first webpack production build reached Node's default heap limit; final integration must rerun with a bounded larger heap. No production build pass is claimed yet.
