/**
 * PROPER Recovery Test 5: Post-recovery "thundering herd"
 *
 * This is a recovery test that verifies:
 * ✅ System establishes baseline (captures known-good product state)
 * ✅ Cascading failure detection (both DB and process down)
 * ✅ Staged recovery tracking (DB restore → process restart → reconnection)
 * ✅ Load spike resilience (thundering herd after recovery)
 * ✅ Performance under spike (p95 latency, no collapse)
 * ✅ Data integrity throughout (baseline products intact)
 * ✅ Stabilization after spike (returns to normal)
 *
 * Manual failure injection steps:
 * 1. Start test:
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s SPIKE_VUS=50 BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery/recovery-05-thundering-herd.js
 *
 * 2. At 1:00 mark (CASCADING FAILURE):
 *    a) Go to MongoDB Atlas → Network Access → Delete IP access entry
 *    b) Wait 10 seconds
 *    c) Press Ctrl+C on Node.js server, then: npm run server
 *
 * 3. At 3:00 mark (CASCADING RECOVERY):
 *    a) MongoDB Atlas → Network Access → + ADD CURRENT IP ADDRESS
 *    b) Wait 10 seconds
 *    c) Press Ctrl+C on Node.js server, then: npm run server
 *    d) Server reconnects to MongoDB (~1.5-2 min)
 *
 * 4. At 5:00–5:30 (THUNDERING HERD):
 *    - 50 VUs spike on recovered system
 *    - Monitor p95 latency (must stay < 5s)
 *
 * 5. After 5:30 (STABILIZATION):
 *    - Load returns to 2 VUs
 *    - Verify system remains stable
 *
 * Expected results:
 * - Phase 1 (0:00-1:00): Baseline established, 0% errors
 * - Phase 2 (1:00-3:00): Complete outage, 90-100% errors
 * - Phase 3 (3:00-5:00): Reconnecting, errors declining 70% → 5%
 * - Phase 4 (5:00-5:30): Thundering herd, <10% errors, p95 < 5s
 * - Phase 5 (5:30-7:30): Stabilized, <1% errors
 * - Overall: <30% failed requests, p95 < 5s
 * - All baseline products present after recovery
 *
 * Uses performance-seeded user (perf_user_0@test.com / TempPassword0!)
 * Override with env: BASE_URL, EMAIL, PASSWORD, SPIKE_VUS
 * 
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import exec from "k6/execution";

// Use performance-seeded user
const PERF_USER_EMAIL = "perf_user_0@test.com";
const PERF_USER_PASSWORD = "TempPassword0!";

const spikeVus = Number(__ENV.SPIKE_VUS || "50");

// Custom metrics for recovery tracking
const recoveryTime = new Trend("recovery_time_seconds");
const dataIntegrityRate = new Rate("data_integrity_passed");
const loginSuccessRate = new Rate("login_success_rate");
const productApiSuccessRate = new Rate("product_api_success");
const baselineProductCount = new Counter("baseline_product_count");
const recoveryProductCount = new Counter("recovery_product_count");
const missingProductsCount = new Counter("missing_products_after_recovery");
const spikeRequestCount = new Counter("spike_requests_total");
const spikeSuccessCount = new Counter("spike_requests_success");
const spikeLatencyP95 = new Trend("spike_latency_p95");

export const options = {
  stages: [
    { duration: "1m", target: 2 },       // BASELINE (healthy)
    { duration: "2m", target: 2 },       // ← DELETE IP at 1:00, outage window
    { duration: "2m", target: 2 },       // ← RE-ADD IP at 3:00, server reconnecting
    { duration: "30s", target: spikeVus }, // ← Spike at 5:00 (thundering herd)
    { duration: "2m", target: 2 },       // Cool down, stability check
  ],
  setupTimeout: "10m",
  thresholds: {
    http_req_failed: ["rate<0.30"],      // Max 30% failures
    http_req_duration: ["p(95)<5000"],   // Max 5s p95 latency
    data_integrity_passed: ["rate>0.95"], // 95%+ data integrity
    product_api_success: ["rate>0.65"],  // 65%+ success (accounts for 2min outage + reconnection)
  },
};

export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:6060";
  const email = __ENV.EMAIL || PERF_USER_EMAIL;
  const password = __ENV.PASSWORD || PERF_USER_PASSWORD;
  
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
  sleep(2);
  
  console.log(`🔧 Starting baseline capture for user: ${email}`);
  
  // Capture baseline products
  const productsRes = http.get(`${baseUrl}/api/v1/product/product-list/1`);
  
  let baselineProducts = [];
  let baselineProductIds = [];
  let baselineCount = 0;
  
  if (productsRes.status === 200) {
    try {
      const body = productsRes.json();
      if (body.success && Array.isArray(body.products) && body.products.length > 0) {
        baselineProducts = body.products;
        baselineProductIds = body.products.map(p => p._id);
        baselineCount = body.products.length;
        console.log(`✅ BASELINE CAPTURED in setup: ${baselineCount} products`);
        console.log(`   Product IDs: ${baselineProductIds.slice(0, 3).join(", ")}...`);
      }
    } catch (e) {
      exec.test.abort(`⚠️ Failed to parse baseline products: ${e}`);
    }
  } else {
    exec.test.abort(`❌ Failed to capture baseline (status ${productsRes.status}). Cannot proceed with recovery test.`);
  }
  
  return {
    baseUrl,
    email,
    password,
    baselineProducts,
    baselineProductIds,
    baselineCount
  };
}

// Global tracking state
let outageStartTime = null;
let recoveryDetectedTime = null;
let hasVerifiedRecovery = false;
let isInSpikePhase = false;
let spikeStartTime = null;

export default function (data) {
  const iteration = __ITER;
  const vu = __VU;
  const timestamp = Date.now();
  const currentVus = __VU; // Total VUs at this moment
  
  // Get baseline from setup
  const baselineProductIds = new Set(data.baselineProductIds || []);
  const baselineCount = data.baselineCount || 0;
  
  // Track baseline count once per VU
  if (iteration === 0 && baselineCount > 0) {
    baselineProductCount.add(baselineCount);
  }
  
  // Detect spike phase (when VUs suddenly increase)
  if (currentVus >= spikeVus * 0.8 && !isInSpikePhase) {
    isInSpikePhase = true;
    spikeStartTime = timestamp;
    if (vu === 1) {
      console.log(`⚡ THUNDERING HERD SPIKE DETECTED: ${currentVus} VUs active`);
    }
  }

  group("Authentication", function () {
    const loginRes = http.post(
      `${data.baseUrl}/api/v1/auth/login`,
      JSON.stringify({ email: data.email, password: data.password }),
      { headers: { "Content-Type": "application/json" } },
    );

    let token = "";
    const loginSuccess = loginRes.status === 200;
    
    try {
      const body = loginRes.json();
      if (body && body.token) token = body.token;
    } catch {
      /* ignore */
    }

    loginSuccessRate.add(loginSuccess);

    check(loginRes, {
      "login 200 and success when up": (r) => {
        if (!outageStartTime || recoveryDetectedTime) {
          if (r.status !== 200) return false;
          try {
            return r.json("success") === true;
          } catch {
            return false;
          }
        }
        return true; // Don't fail during known outage
      },
    });

    if (!token) {
      sleep(1);
      return;
    }

    group("Product API", function () {
      const startTime = Date.now();
      // Product list endpoint does not require authentication
      const res = http.get(`${data.baseUrl}/api/v1/product/product-list/1`);
      const duration = Date.now() - startTime;

      const isSuccess = res.status === 200;
      const isOutage = res.status === 0 || res.status === 500;

      // Track spike phase requests
      if (isInSpikePhase) {
        spikeRequestCount.add(1);
        if (isSuccess) {
          spikeSuccessCount.add(1);
        }
        spikeLatencyP95.add(duration);
      }

      // Phase 2: OUTAGE DETECTION
      if (isOutage && !outageStartTime) {
        outageStartTime = timestamp;
        console.log(`🔴 CASCADING OUTAGE DETECTED at ${new Date(timestamp).toISOString()}`);
      }

      // Phase 3: RECOVERY DETECTION & VERIFICATION (only verify once per VU)
      if (isSuccess && outageStartTime && !hasVerifiedRecovery) {
        hasVerifiedRecovery = true;
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
            productApiSuccessRate.add(true);
            
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
          productApiSuccessRate.add(false);
          console.log(`   ❌ Failed to verify recovery: ${e}`);
        }
      }

      // Continuous verification after recovery detected (periodic checks during normal load)
      if (isSuccess && hasVerifiedRecovery && !isInSpikePhase && iteration % 20 === 0 && baselineCount > 0 && vu === 1) {
        try {
          const body = res.json();
          if (body.success && Array.isArray(body.products)) {
            const integrityPassed = 
              body.products.length === baselineCount &&
              body.products.every(p => p._id && p.name && typeof p.price === 'number');
            
            dataIntegrityRate.add(integrityPassed);
            productApiSuccessRate.add(true);
            
            console.log(`   ✓ Periodic integrity check (iter ${iteration}): ${integrityPassed ? "PASSED" : "FAILED"}`);
          }
        } catch (e) {
          dataIntegrityRate.add(false);
          productApiSuccessRate.add(false);
        }
      } else if (isSuccess) {
        productApiSuccessRate.add(true);
      } else if (isOutage) {
        productApiSuccessRate.add(false);
      }

      // Spike phase monitoring (VU 1 only, every 5 iterations)
      if (isInSpikePhase && vu === 1 && iteration % 5 === 0) {
        const spikeElapsed = (timestamp - spikeStartTime) / 1000;
        console.log(`   ⚡ Spike metrics: ${spikeElapsed}s elapsed, status=${res.status}, latency=${duration}ms`);
      }

      check(res, {
        "product-list 200 when up": (r) => {
          if (!outageStartTime || recoveryDetectedTime) {
            return r.status === 200;
          }
          return true; // Don't fail during known outage
        },
        "valid product response": (r) => {
          if (r.status === 200) {
            try {
              const body = r.json();
              return body.success === true && Array.isArray(body.products);
            } catch {
              return false;
            }
          }
          return true;
        },
        "acceptable latency during spike": (r) => {
          if (isInSpikePhase) {
            return duration < 5000; // Must be under 5s during spike
          }
          return true;
        },
      });
    });

    sleep(1);
  });
}

export function handleSummary(data) {
  const baselineCount = data.metrics.baseline_product_count?.values?.count || 0;
  const recoveryCount = data.metrics.recovery_product_count?.values?.count || 0;
  const missingCount = data.metrics.missing_products_after_recovery?.values?.count || 0;
  const integrityRate = data.metrics.data_integrity_passed?.values?.rate || 0;
  const productApiRate = data.metrics.product_api_success?.values?.rate || 0;
  const loginRate = data.metrics.login_success_rate?.values?.rate || 0;
  const avgRecoveryTime = data.metrics.recovery_time_seconds?.values?.avg || 0;
  const failureRate = data.metrics.http_req_failed?.values?.rate || 0;
  const p95Latency = data.metrics.http_req_duration?.values?.["p(95)"] || 0;
  
  const spikeTotal = data.metrics.spike_requests_total?.values?.count || 0;
  const spikeSuccess = data.metrics.spike_requests_success?.values?.count || 0;
  const spikeSuccessRate = spikeTotal > 0 ? (spikeSuccess / spikeTotal) : 0;
  const spikeP95 = data.metrics.spike_latency_p95?.values?.["p(95)"] || 0;
  
  console.log("\n" + "=".repeat(80));
  console.log("RECOVERY TEST 5 SUMMARY: Thundering Herd");
  console.log("=".repeat(80));
  console.log("BASELINE & RECOVERY:");
  console.log(`  Baseline Products: ${baselineCount}`);
  console.log(`  Recovery Products: ${recoveryCount}`);
  console.log(`  Missing After Recovery: ${missingCount}`);
  console.log(`  Data Integrity Rate: ${(integrityRate * 100).toFixed(2)}%`);
  console.log(`  Average Recovery Time: ${avgRecoveryTime.toFixed(2)}s`);
  console.log("");
  console.log("OVERALL METRICS:");
  console.log(`  Product API Success: ${(productApiRate * 100).toFixed(2)}%`);
  console.log(`  Login Success Rate: ${(loginRate * 100).toFixed(2)}%`);
  console.log(`  HTTP Request Failure Rate: ${(failureRate * 100).toFixed(2)}%`);
  console.log(`  Overall p95 Latency: ${p95Latency.toFixed(2)}ms`);
  console.log("");
  console.log("THUNDERING HERD METRICS:");
  console.log(`  Spike Requests Total: ${spikeTotal}`);
  console.log(`  Spike Requests Success: ${spikeSuccess}`);
  console.log(`  Spike Success Rate: ${(spikeSuccessRate * 100).toFixed(2)}%`);
  console.log(`  Spike p95 Latency: ${spikeP95.toFixed(2)}ms`);
  console.log("=".repeat(80));
  
  const passed = 
    failureRate < 0.30 && 
    p95Latency < 5000 &&
    integrityRate > 0.95 && 
    productApiRate > 0.65;
  
  const spikeHealthy = spikeSuccessRate > 0.85 && spikeP95 < 5000;
  
  console.log(`Recovery Test: ${passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Thundering Herd Test: ${spikeHealthy ? "✅ PASSED (system handled spike)" : "❌ FAILED (spike caused degradation)"}`);
  
  if (spikeTotal === 0) {
    console.log(`⚠️  WARNING: No spike requests detected - did the spike phase execute?`);
  }
  
  console.log("=".repeat(80));
  
  return {
    stdout: JSON.stringify(data, null, 2),
  };
}