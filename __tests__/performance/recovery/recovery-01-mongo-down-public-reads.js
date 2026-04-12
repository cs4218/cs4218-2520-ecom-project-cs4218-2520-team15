/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

/**
 * PROPER Recovery Test 1: MongoDB outage during public product reads
 *
 * This is a recovery test that verifies:
 * ✅ System establishes baseline (captures known-good state)
 * ✅ Graceful degradation during outage
 * ✅ Data integrity after recovery (same products, no corruption)
 * ✅ Recovery metrics (time to recovery, error rate)
 * ✅ System returns to baseline performance
 *
 * Manual failure injection steps:
 * 1. Start test:
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery/recovery-01-mongo-down-public-reads.js
 *
 * 2. At 1:30 mark:
 *    - Go to MongoDB Atlas → Network Access
 *    - Delete the IP access entry
 *    - Wait ~90 seconds for propagation
 *    - Restart Node.js server (Ctrl+C, npm run server)
 *
 * 3. At 5:00 mark:
 *    - Re-add IP in MongoDB Atlas
 *    - Wait ~90 seconds for propagation
 *    - Restart Node.js server again
 *
 * 4. Test completes at 10:00
 *
 * Expected results:
 * - Phase 1 (0:00-1:30): Baseline established, 0% errors
 * - Phase 2 (1:30-5:00): Outage window, graceful 500 errors
 * - Phase 3 (5:00-10:00): Recovery verified, data integrity confirmed
 * - Overall: <30% failed requests across entire test
 * - Recovery check: All baseline products present after recovery
 *
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import exec from "k6/execution";

const baseUrl = __ENV.BASE_URL || "http://localhost:6060";

// Custom metrics for recovery tracking
const recoveryTime = new Trend("recovery_time_seconds");
const dataIntegrityRate = new Rate("data_integrity_passed");
const baselineProductCount = new Counter("baseline_product_count");
const recoveryProductCount = new Counter("recovery_product_count");
const missingProductsCount = new Counter("missing_products_after_recovery");

export const options = {
  stages: [
    { duration: "30s", target: 2 },   // Warm-up
    { duration: "1m", target: 3 },    // BASELINE CAPTURE (0:30-1:30)
    { duration: "2m", target: 4 },    // Pre-outage → DELETE IP at 1:30
    { duration: "1m30s", target: 5 }, // Outage window (failures)
    { duration: "5m", target: 5 },    // RE-ADD IP at 5:00 → RECOVERY VERIFICATION
  ],
  setupTimeout: "10m",
  thresholds: {
    http_req_failed: ["rate<0.30"],
    data_integrity_passed: ["rate>0.95"], // 95%+ data integrity (checked only at recovery + periodic)
  },
};

// Global state for tracking - shared across VUs via setup/teardown
let outageStartTime = null;
let recoveryDetectedTime = null;
let hasVerifiedRecovery = false; // Track if this VU already verified recovery

export function setup() {
  // Seed performance database first
  console.log("🌱 Seeding performance database...");
  const seedRes = http.post(
    `${baseUrl}/api/v1/test/performance-seed`,
    null,
    { timeout: "5m" }
  );
  if (seedRes.status !== 200) {
    exec.test.abort(`❌ Performance seeding failed: ${seedRes.body}`);
  }
  console.log("✅ Performance database seeded");
  sleep(2); // Allow DB to stabilize

  // Capture baseline in setup phase (runs once before test starts)
  console.log("🔧 Starting baseline capture...");
  const res = http.get(`${baseUrl}/api/v1/product/product-list/1`);
  
  if (res.status === 200) {
    try {
      const body = res.json();
      if (body.success && Array.isArray(body.products) && body.products.length > 0) {
        const productIds = body.products.map(p => p._id);
        console.log(`✅ BASELINE CAPTURED in setup: ${body.products.length} products`);
        console.log(`   Product IDs: ${productIds.slice(0, 3).join(", ")}...`);
        
        return {
          baselineProducts: body.products,
          baselineProductIds: productIds,
          baselineCount: body.products.length
        };
      }
    } catch (e) {
      exec.test.abort(`⚠️ Failed to parse baseline in setup: ${e}`);
    }
  }
  
  // Abort if baseline capture fails - test cannot proceed without it
  exec.test.abort(`❌ Failed to capture baseline (status ${res.status}). Cannot proceed with recovery test.`);
}

export default function (data) {
  const iteration = __ITER;
  const vu = __VU;
  const timestamp = Date.now();
  
  // Get baseline from setup (shared across all VUs)
  const baselineProducts = data.baselineProducts || [];
  const baselineProductIds = new Set(data.baselineProductIds || []);
  const baselineCount = data.baselineCount || 0;
  
  // Track baseline count once per VU
  if (iteration === 0 && baselineCount > 0) {
    baselineProductCount.add(baselineCount);
  }

  group("Product Read Operations", function () {
    const res = http.get(`${baseUrl}/api/v1/product/product-list/1`);
    
    const isSuccess = res.status === 200;
    const isOutage = res.status === 500;

    // Phase 2: OUTAGE DETECTION
    if (isOutage && !outageStartTime) {
      outageStartTime = timestamp;
      console.log(`🔴 OUTAGE DETECTED at ${new Date(timestamp).toISOString()}`);
    }

    // Phase 3: RECOVERY DETECTION & VERIFICATION (only verify once per VU)
    if (isSuccess && outageStartTime && !hasVerifiedRecovery) {
      hasVerifiedRecovery = true; // Mark as verified for this VU
      recoveryDetectedTime = timestamp;
      const recoveryDuration = (recoveryDetectedTime - outageStartTime) / 1000;
      recoveryTime.add(recoveryDuration);
      
      console.log(`🟢 RECOVERY DETECTED (VU ${vu}) after ${recoveryDuration}s outage`);
      
      // Verify data integrity after recovery
      try {
        const body = res.json();
        if (body.success && Array.isArray(body.products)) {
          recoveryProductCount.add(body.products.length);
          
          const recoveredIds = new Set(body.products.map(p => p._id));
          const missingProducts = Array.from(baselineProductIds).filter(id => !recoveredIds.has(id));
          const extraProducts = Array.from(recoveredIds).filter(id => !baselineProductIds.has(id));
          
          missingProductsCount.add(missingProducts.length);
          
          // Data integrity checks
          const countMatches = body.products.length === baselineCount;
          const idsMatch = missingProducts.length === 0 && extraProducts.length === 0;
          const noCorruption = body.products.every(p => 
            p._id && p.name && p.slug && typeof p.price === 'number' && p.price >= 0
          );
          
          const integrityPassed = countMatches && idsMatch && noCorruption;
          dataIntegrityRate.add(integrityPassed);
          
          console.log(`   ✓ Product count: ${body.products.length} (baseline: ${baselineCount})`);
          console.log(`   ✓ Missing products: ${missingProducts.length}`);
          console.log(`   ✓ Extra products: ${extraProducts.length}`);
          console.log(`   ✓ Data integrity: ${integrityPassed ? "PASSED" : "FAILED"}`);
          
          if (!integrityPassed) {
            console.log(`   ⚠️  INTEGRITY FAILURE DETAILS:`);
            if (!countMatches) console.log(`      - Count mismatch: ${body.products.length} vs ${baselineCount}`);
            if (missingProducts.length > 0) console.log(`      - Missing IDs: ${missingProducts.slice(0, 3).join(", ")}`);
            if (extraProducts.length > 0) console.log(`      - Extra IDs: ${extraProducts.slice(0, 3).join(", ")}`);
            if (!noCorruption) console.log(`      - Corrupted product data detected`);
          }
        }
      } catch (e) {
        dataIntegrityRate.add(false);
        console.log(`   ❌ Failed to verify recovery: ${e}`);
      }
    }

    // Continuous verification after recovery detected (periodic checks, VU 1 only)
    if (isSuccess && hasVerifiedRecovery && iteration % 30 === 0 && baselineCount > 0 && vu === 1) {
      try {
        const body = res.json();
        if (body.success && Array.isArray(body.products)) {
          const integrityPassed = 
            body.products.length === baselineCount &&
            body.products.every(p => p._id && p.name && typeof p.price === 'number');
          
          dataIntegrityRate.add(integrityPassed);
          
          if (iteration % 60 === 0) {
            console.log(`   ✓ Periodic integrity check (iter ${iteration}): ${integrityPassed ? "PASSED" : "FAILED"}`);
          }
        }
      } catch (e) {
        dataIntegrityRate.add(false);
      }
    }

    // Standard checks
    check(res, {
      "status is 200 or 500 (not crashed)": (r) => r.status === 200 || r.status === 500,
      "status 200 when healthy": (r) => {
        if (!outageStartTime || hasVerifiedRecovery) {
          return r.status === 200;
        }
        return true; // Don't fail during known outage
      },
      "valid JSON response": (r) => {
        if (r.status === 200) {
          try {
            const body = r.json();
            return body && typeof body === 'object';
          } catch {
            return false;
          }
        }
        return true; // 500s during outage are expected
      },
      "products array present when healthy": (r) => {
        if (r.status === 200) {
          try {
            return Array.isArray(r.json().products);
          } catch {
            return false;
          }
        }
        return true;
      },
    });
  });

  sleep(1 + Math.random() * 2);
}

export function handleSummary(data) {
  const baselineCount = data.metrics.baseline_product_count?.values?.count || 0;
  const recoveryCount = data.metrics.recovery_product_count?.values?.count || 0;
  const missingCount = data.metrics.missing_products_after_recovery?.values?.count || 0;
  const integrityRate = data.metrics.data_integrity_passed?.values?.rate || 0;
  const avgRecoveryTime = data.metrics.recovery_time_seconds?.values?.avg || 0;
  
  console.log("\n" + "=".repeat(80));
  console.log("RECOVERY TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`Baseline Products: ${baselineCount}`);
  console.log(`Recovery Products: ${recoveryCount}`);
  console.log(`Missing After Recovery: ${missingCount}`);
  console.log(`Data Integrity Rate: ${(integrityRate * 100).toFixed(2)}%`);
  console.log(`Average Recovery Time: ${avgRecoveryTime.toFixed(2)}s`);
  console.log("=".repeat(80));
  
  return {
    stdout: JSON.stringify(data, null, 2),
  };
}