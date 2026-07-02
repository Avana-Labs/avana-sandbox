# Sticky CTA on /actions/* configure + review pages (mobile)

**Priority:** MEDIUM · **Area:** ui

**Problem:** On the borrow action at 390px the primary Review button sits at absolute Y≈1252 in a 1315px page (~1.5 screens down) and is `position: static`. Each metric is a full-width card, so the CTA is buried. The detail pages now use a sticky bar, but the action pages themselves don't.

**Fix:** Pin the primary CTA to a sticky bottom bar on mobile action flows; compress the metric rows.
