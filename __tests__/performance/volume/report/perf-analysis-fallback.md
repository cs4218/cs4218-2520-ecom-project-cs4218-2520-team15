# K6 Performance Analysis Report

Generated: 2026-04-08T14:59:38.738Z

## Performance Summary
System tested across 3 stage(s): baseline, smoke, volume. 10 endpoints tested. Performance degradation detected between baseline and volume tests.

## Slow Endpoints Identified
- **all-orders**: p95=1077ms (baseline: 539ms, volume: 1077ms, +99.9%)
- **product-photo**: p95=877ms (baseline: 877ms, volume: 198ms, +-77.4%)
- **categories-paged**: p95=790ms (baseline: 730ms, volume: 790ms, +8.3%)
- **products**: p95=602ms (baseline: 361ms, volume: 602ms, +66.9%)
- **users**: p95=601ms (baseline: 356ms, volume: 601ms, +68.8%)

## Degradation Analysis
- **all-orders**: 99.9% degradation (baseline: 539ms → volume: 1077ms) [CRITICAL]
- **users**: 68.8% degradation (baseline: 356ms → volume: 601ms) [CRITICAL]
- **products**: 66.9% degradation (baseline: 361ms → volume: 602ms) [CRITICAL]
- **products-paged**: 11.7% degradation (baseline: 179ms → volume: 200ms) [MEDIUM]
- **orders**: 10.7% degradation (baseline: 180ms → volume: 200ms) [MEDIUM]
- **categories**: 10.6% degradation (baseline: 178ms → volume: 197ms) [MEDIUM]
- **product-detail**: 9.7% degradation (baseline: 360ms → volume: 395ms) [MEDIUM]
- **categories-paged**: 8.3% degradation (baseline: 730ms → volume: 790ms) [MEDIUM]

## Scalability Assessment
System has poor scalability. 3 endpoints show critical degradation under volume load. Immediate optimization needed.

## System Limitations
No major system limitations detected.

## Optimization Recommendations
1. **Optimize products**: Currently 602ms p95. Consider:
   - Add database indexes
   - Implement response caching
   - Profile queries for N+1 problems

2. **Optimize product-photo**: Currently 877ms p95. Consider:
   - Add database indexes
   - Implement response caching
   - Profile queries for N+1 problems

3. **Optimize all-orders**: Currently 1077ms p95. Consider:
   - Add database indexes
   - Implement response caching
   - Profile queries for N+1 problems

4. **Optimize users**: Currently 601ms p95. Consider:
   - Add database indexes
   - Implement response caching
   - Profile queries for N+1 problems

5. **Optimize categories-paged**: Currently 790ms p95. Consider:
   - Add database indexes
   - Implement response caching
   - Profile queries for N+1 problems

6. **Implement pagination**: Limit default page size for list endpoints to reduce payload.

7. **Add HTTP caching**: Implement ETag and Cache-Control headers for read endpoints.

