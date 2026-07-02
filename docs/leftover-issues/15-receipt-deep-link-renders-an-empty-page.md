# Receipt deep-link renders an empty page

**Priority:** MEDIUM · **Area:** ui

**Problem:** Every success modal shows "Receipt: sim_…" linking to `/sandbox/transactions/[hash]`; visiting it renders only a title + an empty card — no transaction details.

**Where:** `app/sandbox/transactions/[hash]/page.tsx`.

**Fix:** Load and render the receipt by hash (persist the receipt), or don't render the value as a link if it isn't deep-linkable.
