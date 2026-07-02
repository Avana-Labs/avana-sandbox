# Lend Avg Utilization is non-deterministic across loads

**Priority:** LOW · **Area:** data

The /lend hero "Avg Utilization" changes between page loads (37.10% → 48.32% → 48.32%) — mock data regenerates differently each load. Seed it deterministically.
