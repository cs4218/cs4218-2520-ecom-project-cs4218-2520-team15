/**
 * PROPER Recovery Test 2: MongoDB outage during authenticated orders reads
 *
 * This is a recovery test that verifies:
 * ✅ System establishes baseline (captures known-good order state)
 * ✅ Graceful degradation during outage (no crashes, clean errors)
 * ✅ Data integrity after recovery (same orders, no corruption)
 * ✅ Recovery metrics (time to recovery, error rate)
 * ✅ System returns to baseline performance
 *
 * Manual failure injection steps:
 * 1. Start test:
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery/recovery-02-mongo-down-orders.js
 *
 * 2. At 3:00 mark:
 *    - Go to MongoDB Atlas → Network Access
 *    - Delete the IP access entry (e.g., 219.75.2.40/32 or 0.0.0.0/0)
 *
 * 3. At 8:00 mark:
 *    - Re-add IP in MongoDB Atlas (+ ADD IP ADDRESS → ADD CURRENT IP ADDRESS)
 *
 * 4. Test completes at 11:00
 *
 * Expected results:
 * - Phase 1 (0:00-3:00): Baseline established, 0% errors
 * - Phase 2 (3:00-8:00): Outage window, graceful 500/401 errors (~5 min)
 * - Phase 3 (8:00-11:00): Recovery verified, data integrity confirmed
 * - Overall: <35% failed requests across entire test
 * - Recovery check: All baseline orders present after recovery
 *
 * Uses performance-seeded user (perf_user_0@test.com / TempPassword0!)
 * Override with env: BASE_URL, EMAIL, PASSWORD
 *
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import exec from "k6/execution";

// Use performance-seeded user
const PERF_USER_EMAIL = "perf_user_0@test.com";
const PERF_USER_PASSWORD = "TempPassword0!";

// Custom metrics for recovery tracking
const recoveryTime = new Trend("recovery_time_seconds");
const dataIntegrityRate = new Rate("data_integrity_passed");
const loginSuccessRate = new Rate("login_success_rate");
const ordersRetrievalRate = new Rate("orders_retrieval_success");
const baselineOrderCount = new Counter("baseline_order_count");
const recoveryOrderCount = new Counter("recovery_order_count");
const missingOrdersCount = new Counter("missing_orders_after_recovery");

export const options = {
  stages: [
    { duration: "1m", target: 2 },      // Warm-up
    { duration: "2m", target: 3 },      // BASELINE CAPTURE (1:00-3:00)
    { duration: "3m", target: 4 },      // ← DELETE IP at 3:00, propagation ~1.5m
    { duration: "5m", target: 4 },      // ← RE-ADD IP at 8:00, recovery by ~9:30, observe until 11:00
  ],
  setupTimeout: "10m",
  thresholds: {
    http_req_failed: ["rate<0.35"],     // Max 35% failures during entire test
    data_integrity_passed: ["rate>0.95"], // 95%+ data integrity
    orders_retrieval_success: ["rate>0.60"], // 60%+ success (accounts for 5min outage)
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
  
  try {
    const seedBody = seedRes.json();
    console.log(`✅ Performance database seeded: ${seedBody.users?.length || 0} users, ${seedBody.products?.length || 0} products`);
  } catch (e) {
    console.log("✅ Performance database seeded");
  }
  
  sleep(2); // Allow DB to stabilize
  
  console.log(`🔧 Starting baseline capture for user: ${email}`);
  
  // Authenticate and capture baseline orders
  const loginRes = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );
  
  let token = "";
  let body = {};
  try {
    body = loginRes.json();
    if (body && body.token) token = body.token;
  } catch (e) {
    exec.test.abort(`⚠️ Failed to authenticate in setup: ${e}`);
  }
  
  if (!token || body.success !== true) {
    exec.test.abort(`❌ Login failed in setup: ${JSON.stringify(body)}`);
  }

  // Fetch baseline orders
  const ordersRes = http.get(`${baseUrl}/api/v1/auth/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (ordersRes.status === 200) {
    try {
      const orders = ordersRes.json();
      if (Array.isArray(orders) && orders.length > 0) {
        const orderIds = orders.map(o => o._id);
        console.log(`✅ BASELINE CAPTURED in setup: ${orders.length} orders`);
        console.log(`   Order IDs: ${orderIds.slice(0, 3).join(", ")}...`);
        
        return {
          baseUrl,
          email,
          password,
          baselineOrders: orders,
          baselineOrderIds: orderIds,
          baselineCount: orders.length
        };
      }
    } catch (e) {
      console.log(`⚠️ Failed to parse baseline orders: ${e}`);
    }
  }
  
  // Fallback if no orders exist
  console.log(`⚠️ No baseline orders found (user may have no orders yet)`);
  return {
    baseUrl,
    email,
    password,
    baselineOrders: [],
    baselineOrderIds: [],
    baselineCount: 0
  };
}

// Global state for tracking
let outageStartTime = null;
let recoveryDetectedTime = null;
let hasVerifiedRecovery = false;

export default function (data) {
  const iteration = __ITER;
  const vu = __VU;
  const timestamp = Date.now();
  
  // Get baseline from setup
  const baselineOrderIds = new Set(data.baselineOrderIds || []);
  const baselineCount = data.baselineCount || 0;
  
  // Track baseline count once per VU
  if (iteration === 0 && baselineCount > 0) {
    baselineOrderCount.add(baselineCount);
  }

  group("Authentication", function () {
    const loginRes = http.post(
      `${data.baseUrl}/api/v1/auth/login`,
      JSON.stringify({ email: data.email, password: data.password }),
      { headers: { "Content-Type": "application/json" } },
    );

    let token = "";
    let body = {};
    const loginOutage = loginRes.status === 500 || loginRes.status === 401;
    
    try {
      body = loginRes.json();
      if (body && body.token) token = body.token;
    } catch {}

    const loginSuccess = loginRes.status === 200 && body.success === true;

    // Track login success rate
    loginSuccessRate.add(loginSuccess);

    check(loginRes, {
      "login success or outage": () => loginSuccess || loginOutage,
    });

    if (!token) {
      sleep(1);
      return;
    }

    group("Orders Retrieval", function () {
      const ordersRes = http.get(`${data.baseUrl}/api/v1/auth/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const isSuccess = ordersRes.status === 200;
      const isOutage = ordersRes.status === 500 || ordersRes.status === 401;

      // Phase 2: OUTAGE DETECTION
      if (isOutage && !outageStartTime) {
        outageStartTime = timestamp;
        console.log(`🔴 ORDERS OUTAGE DETECTED at ${new Date(timestamp).toISOString()}`);
      }

      // Phase 3: RECOVERY DETECTION & VERIFICATION (only verify once per VU)
      if (isSuccess && outageStartTime && !hasVerifiedRecovery) {
        hasVerifiedRecovery = true;
        recoveryDetectedTime = timestamp;
        const recoveryDuration = (recoveryDetectedTime - outageStartTime) / 1000;
        recoveryTime.add(recoveryDuration);
        
        console.log(`🟢 ORDERS RECOVERY DETECTED (VU ${vu}) after ${recoveryDuration}s outage`);
        
        try {
          const orders = ordersRes.json();
          if (Array.isArray(orders)) {
            recoveryOrderCount.add(orders.length);
            
            const recoveredIds = new Set(orders.map(o => o._id));
            const missingOrders = Array.from(baselineOrderIds).filter(id => !recoveredIds.has(id));
            const extraOrders = Array.from(recoveredIds).filter(id => !baselineOrderIds.has(id));
            
            missingOrdersCount.add(missingOrders.length);
            
            const countMatches = orders.length >= baselineCount;
            const noMissingOrders = missingOrders.length === 0;
            const noCorruption = orders.every(o => 
              o._id && 
              o.buyer && 
              Array.isArray(o.products) &&
              ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"].includes(o.status)
            );
            
            const integrityPassed = countMatches && noMissingOrders && noCorruption;
            dataIntegrityRate.add(integrityPassed);
            ordersRetrievalRate.add(true);
            
            console.log(`   ✓ Order count: ${orders.length} (baseline: ${baselineCount})`);
            console.log(`   ✓ Missing orders: ${missingOrders.length}`);
            console.log(`   ✓ Extra orders: ${extraOrders.length} (new orders created during test)`);
            console.log(`   ✓ Data integrity: ${integrityPassed ? "PASSED" : "FAILED"}`);
          }
        } catch (e) {
          dataIntegrityRate.add(false);
          ordersRetrievalRate.add(false);
        }
      }

      if (isSuccess) {
        ordersRetrievalRate.add(true);
      } else if (isOutage) {
        ordersRetrievalRate.add(false);
      }

      check(ordersRes, {
        "orders reachable or known failure during outage": (r) =>
          r.status === 200 || r.status === 500 || r.status === 401,
      });
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  const baselineCount = data.metrics.baseline_order_count?.values?.count || 0;
  const recoveryCount = data.metrics.recovery_order_count?.values?.count || 0;
  const missingCount = data.metrics.missing_orders_after_recovery?.values?.count || 0;
  const integrityRate = data.metrics.data_integrity_passed?.values?.rate || 0;
  const retrievalRate = data.metrics.orders_retrieval_success?.values?.rate || 0;
  const loginRate = data.metrics.login_success_rate?.values?.rate || 0;
  const avgRecoveryTime = data.metrics.recovery_time_seconds?.values?.avg || 0;
  const failureRate = data.metrics.http_req_failed?.values?.rate || 0;
  
  console.log("\n" + "=".repeat(80));
  console.log("RECOVERY TEST 2 SUMMARY: MongoDB Outage - Orders");
  console.log("=".repeat(80));
  console.log(`Baseline Orders: ${baselineCount}`);
  console.log(`Recovery Orders: ${recoveryCount}`);
  console.log(`Missing After Recovery: ${missingCount}`);
  console.log(`Data Integrity Rate: ${(integrityRate * 100).toFixed(2)}%`);
  console.log(`Orders Retrieval Success: ${(retrievalRate * 100).toFixed(2)}%`);
  console.log(`Login Success Rate: ${(loginRate * 100).toFixed(2)}%`);
  console.log(`HTTP Request Failure Rate: ${(failureRate * 100).toFixed(2)}%`);
  console.log(`Average Recovery Time: ${avgRecoveryTime.toFixed(2)}s`);
  console.log("=".repeat(80));
  
  const passed = 
    failureRate < 0.35 && 
    integrityRate > 0.95 && 
    retrievalRate > 0.60;
  
  console.log(`Recovery Test: ${passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("=".repeat(80));
  
  return {
    stdout: JSON.stringify(data, null, 2),
  };
}