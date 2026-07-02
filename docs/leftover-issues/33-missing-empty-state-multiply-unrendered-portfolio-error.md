# Missing empty state (multiply) + unrendered portfolio error

**Priority:** LOW · **Area:** ui

The multiply client has no zero-state for a filtered-to-zero markets table; `app/portfolio/use-portfolio-page.ts:~50` stores `error: "Unable to load portfolio."` but no component renders `state.error`. Add the empty state and surface the captured error.
