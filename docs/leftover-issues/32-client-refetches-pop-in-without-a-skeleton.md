# Client refetches pop in without a skeleton

**Priority:** LOW · **Area:** ui

Skeletons appear only on route-boundary `loading.tsx`; live-data refetches in the borrow/lend/multiply clients pop values in with no shimmer, unlike Uniswap. Add a subtle loading treatment on refetch.
