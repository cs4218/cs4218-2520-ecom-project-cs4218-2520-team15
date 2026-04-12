/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

/**
 * PROPER Recovery Test 3: API process crash under load
 *
 * This is a recovery test that verifies:
 * ✅ System establishes baseline (captures known-good product state)
 * ✅ Complete outage detection during process crash
 * ✅ Fast recovery after process restart
 * ✅ Data integrity after recovery (same products, no corruption)
 * ✅ Recovery metrics (time to recovery, immediate availability)
 *
 * Manual failure injection steps:
 * 1. Start backend and then test:
 *    NODE_ENV=performance-test npm start
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery/recovery-03-api-process-crash.js
 *
 * 2. Anytime during test (suggested: 1:30-2:00 mark) after products are logged:
 *    - Kill the Node.js process:
 *      * Terminal: Press Ctrl+C
 *      * Or: kill -9 <pid>
 *
 * 3. Wait ~30 seconds (simulates restart delay)
 *
 * 4. Restart the server:
 *    - npm run server
 *
 * Expected results:
 * - Phase 1 (before crash): Baseline established, 0% errors
 * - Phase 2 (during crash ~30s): Complete outage, connection refused
 * - Phase 3 (after restart): Immediate recovery, data integrity verified
 * - Overall: <40% failed requests
 * - Recovery time: <10 seconds after process start
 * - All baseline products present after recovery
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
const productApiSuccessRate = new Rate("product_api_success");
const homepageSuccessRate = new Rate("homepage_success");
const baselineProductCount = new Counter("baseline_product_count");
const recoveryProductCount = new Counter("recovery_product_count");
const missingProductsCount = new Counter("missing_products_after_recovery");
const outageDetectedCounter = new Counter("outage_detected");
const recoveryDetectedCounter = new Counter("recovery_detected");

export const options = {
  vus: 5,
  duration: "5m",
  setupTimeout: "10m",
  thresholds: {
    http_req_failed: ["rate<0.40"], // Max 40% failures (accounts for ~30s crash in 5min test)
    data_integrity_passed: ["rate>0.95"], // 95%+ data integrity
    product_api_success: ["rate>0.55"], // 55%+ success (accounts for crash window)
  },
};

export function setup() {
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

  console.log("🔧 Starting baseline capture...");
  
  // Capture baseline product state - use product-list endpoint
  const productsRes = http.get(`${baseUrl}/api/v1/product/product-list/1`);
  
  if (productsRes.status === 200) {
    try {
      const body = productsRes.json();
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
  
  // Abort test if baseline capture fails - cannot proceed without known-good state
  exec.test.abort(`❌ Failed to capture baseline (status ${productsRes.status}). Cannot proceed with recovery test.`);
}

// Global state for tracking
let outageStartTime = null;
let recoveryDetectedTime = null;
let hasVerifiedRecovery = false;
let outageLogged = false;
let recoveryLogged = false;

export default function (data) {
  const iteration = __ITER;
  const vu = __VU;
  const timestamp = Date.now();
  
  // Get baseline from setup
  const baselineProductIds = new Set(data.baselineProductIds || []);
  const baselineCount = data.baselineCount || 0;
  
  // Track baseline count once per VU
  if (iteration === 0 && baselineCount > 0) {
    baselineProductCount.add(baselineCount);
  }

  group("Product API Health", function () {
    const products = http.get(`${baseUrl}/api/v1/product/product-list/1`);
    
    const isSuccess = products.status === 200;
    const isOutage = products.status === 0 || products.status >= 500; // 0 = connection refused

    // Phase 2: OUTAGE DETECTION (Process crash)
    if (isOutage && !outageStartTime) {
      outageStartTime = timestamp;
      if (!outageLogged) {
        outageLogged = true;
        outageDetectedCounter.add(1);
        console.log(`🔴 API PROCESS CRASH DETECTED at ${new Date(timestamp).toISOString()}`);
        console.log(`   Status: ${products.status} (${products.status === 0 ? "Connection Refused" : "Server Error"})`);
      }
    }

    // Phase 3: RECOVERY DETECTION & VERIFICATION (only verify once per VU)
    if (isSuccess && outageStartTime && !hasVerifiedRecovery) {
      hasVerifiedRecovery = true;
      recoveryDetectedTime = timestamp;
      const recoveryDuration = (recoveryDetectedTime - outageStartTime) / 1000;
      recoveryTime.add(recoveryDuration);
      
      if (!recoveryLogged) {
        recoveryLogged = true;
        recoveryDetectedCounter.add(1);
        console.log(`🟢 API RECOVERY DETECTED (VU ${vu}) after ${recoveryDuration}s outage`);
      }
      
      // Verify data integrity after recovery
      try {
        const body = products.json();
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

    // Continuous verification after recovery detected (periodic checks, VU 1 only)
    if (isSuccess && hasVerifiedRecovery && iteration % 15 === 0 && baselineCount > 0 && vu === 1) {
      try {
        const body = products.json();
        if (body.success && Array.isArray(body.products)) {
          const integrityPassed = 
            body.products.length === baselineCount &&
            body.products.every(p => p._id && p.name && typeof p.price === 'number');
          
          dataIntegrityRate.add(integrityPassed);
          productApiSuccessRate.add(true);
          
          if (iteration % 30 === 0) {
            console.log(`   ✓ Periodic integrity check (iter ${iteration}): ${integrityPassed ? "PASSED" : "FAILED"}`);
          }
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

    check(products, {
      "product-list 200 when API up": (r) => {
        if (!outageStartTime || recoveryDetectedTime) {
          return r.status === 200;
        }
        return true; // Don't fail during known outage
      },
      "valid product response structure": (r) => {
        if (r.status === 200) {
          try {
            const body = r.json();
            return body.success === true && Array.isArray(body.products);
          } catch {
            return false;
          }
        }
        return true; // Skip check for non-200
      },
      "products have required fields": (r) => {
        if (r.status === 200) {
          try {
            const body = r.json();
            return body.products.every(p => p._id && p.name && p.slug);
          } catch {
            return false;
          }
        }
        return true;
      },
    });
  });

  group("Homepage Health", function () {
    const home = http.get(`${baseUrl}/`);
    
    const isSuccess = home.status === 200;
    
    if (isSuccess) {
      homepageSuccessRate.add(true);
    } else {
      homepageSuccessRate.add(false);
    }

    check(home, {
      "home responds when API up": (r) => {
        if (!outageStartTime || recoveryDetectedTime) {
          return r.status === 200;
        }
        return true; // Don't fail during known outage
      },
      "home returns HTML": (r) => {
        if (r.status === 200) {
          return r.body.includes("<!DOCTYPE html>") || r.body.includes("<html");
        }
        return true;
      },
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  const baselineCount = data.metrics.baseline_product_count?.values?.count || 0;
  const recoveryCount = data.metrics.recovery_product_count?.values?.count || 0;
  const missingCount = data.metrics.missing_products_after_recovery?.values?.count || 0;
  const integrityRate = data.metrics.data_integrity_passed?.values?.rate || 0;
  const productApiRate = data.metrics.product_api_success?.values?.rate || 0;
  const homepageRate = data.metrics.homepage_success?.values?.rate || 0;
  const avgRecoveryTime = data.metrics.recovery_time_seconds?.values?.avg || 0;
  const failureRate = data.metrics.http_req_failed?.values?.rate || 0;
  const outageDetected = data.metrics.outage_detected?.values?.count || 0;
  const recoveryDetected = data.metrics.recovery_detected?.values?.count || 0;
  
  console.log("\n" + "=".repeat(80));
  console.log("RECOVERY TEST 3 SUMMARY: API Process Crash");
  console.log("=".repeat(80));
  console.log(`Baseline Products: ${baselineCount}`);
  console.log(`Recovery Products: ${recoveryCount}`);
  console.log(`Missing After Recovery: ${missingCount}`);
  console.log(`Data Integrity Rate: ${(integrityRate * 100).toFixed(2)}%`);
  console.log(`Product API Success: ${(productApiRate * 100).toFixed(2)}%`);
  console.log(`Homepage Success: ${(homepageRate * 100).toFixed(2)}%`);
  console.log(`HTTP Request Failure Rate: ${(failureRate * 100).toFixed(2)}%`);
  console.log(`Average Recovery Time: ${avgRecoveryTime.toFixed(2)}s`);
  console.log(`Outage Detected: ${outageDetected > 0 ? "YES" : "NO"}`);
  console.log(`Recovery Detected: ${recoveryDetected > 0 ? "YES" : "NO"}`);
  console.log("=".repeat(80));
  
  const passed = 
    failureRate < 0.40 && 
    integrityRate > 0.95 && 
    productApiRate > 0.55;
  
  console.log(`Recovery Test: ${passed ? "✅ PASSED" : "❌ FAILED"}`);
  
  if (outageDetected === 0) {
    console.log(`⚠️  WARNING: No outage detected - did you kill the process?`);
  }
  
  if (outageDetected > 0 && recoveryDetected === 0) {
    console.log(`⚠️  WARNING: Outage detected but no recovery - did you restart the server?`);
  }
  
  console.log("=".repeat(80));
  
  return {
    stdout: JSON.stringify(data, null, 2),
  };
}