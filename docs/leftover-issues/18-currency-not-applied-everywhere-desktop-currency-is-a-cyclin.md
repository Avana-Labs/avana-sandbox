# Currency not applied everywhere; desktop currency is a cycling icon

**Priority:** MEDIUM · **Area:** ui

**Problem:** With currency = CNY the borrow + dashboard heros convert (¥) but the portfolio chart Y-axis stays in `$`; the portfolio hero uses a private `formatUsd` that hardcodes `$`/2dp (`app/lib/data/providers/portfolio/map-portfolio-page.ts:~15`). Also the desktop currency control is a cycling icon (each click advances USD→…→CNY, no menu) while mobile has a proper picker.

**Fix:** Route all money through the currency-aware formatter (incl. chart axes); give desktop the same picker as mobile.
