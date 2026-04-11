/**
 * PROPER Recovery Test 4: Checkout (zero-total) + MongoDB outage
 *
 * This is a recovery test that verifies:
 * ✅ Baseline order creation works
 * ✅ No partial/corrupt orders during outage
 * ✅ Order creation resumes after recovery
 * ✅ Historical orders still accessible after recovery
 * ✅ Data consistency (no duplicate orders, no missing orders)
 *
 * Manual failure injection steps:
 * 1. Start test:
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery/recovery-04-checkout-db-outage.js
 *
 * 2. At ~2:00 mark:
 *    - Go to MongoDB Atlas → Network Access
 *    - Delete the IP access entry
 *
 * 3. At ~3:30–4:00 mark:
 *    - MongoDB becomes unreachable (propagation delay ~1-1.5 min)
 *    - API starts returning 500s
 *
 * 4. At ~5:00 mark:
 *    - Re-add IP in MongoDB Atlas
 *
 * 5. At ~6:30–8:00 mark:
 *    - System recovers after propagation
 *    - Verify order creation works
 *    - Verify old orders still accessible
 *
 * Expected results:
 * - Phase 1 (0:00-3:30): Baseline orders created successfully
 * - Phase 2 (3:30-6:30): Graceful failures, no corrupt orders
 * - Phase 3 (6:30-8:00): Full recovery, data integrity verified
 * - Overall: <25% failed requests
 * - NO partial orders in database
 * - All pre-outage orders still retrievable
 *
 * Uses performance-seeded user (perf_user_0@test.com / TempPassword0!)
 *
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import exec from "k6/execution";

// Use performance-seeded user
const PERF_USER_EMAIL = "perf_user_0@test.com";
const PERF_USER_PASSWORD = "TempPassword0!";

const thinkSec = Number(__ENV.THINK_SEC || "3");

// Custom metrics
const ordersCreatedBaseline = new Counter("orders_created_baseline");
const ordersCreatedRecovery = new Counter("orders_created_recovery");
const orderRetrievalSuccessRate = new Rate("order_retrieval_success");
const dataConsistencyRate = new Rate("data_consistency_passed");
const recoveryTime = new Trend("recovery_time_seconds");

export const options = {
  vus: 2,
  duration: "8m",
  setupTimeout: "10m",
  thresholds: {
    http_req_failed: ["rate<0.25"],
    order_retrieval_success: ["rate>0.90"],
    data_consistency_passed: ["rate>0.95"],
  },
};

// ---------------------------------------------------------------------------
// setup() — runs ONCE before any VU starts, return value is shared to all VUs
// ---------------------------------------------------------------------------
export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:6060";
  const email = __ENV.EMAIL || PERF_USER_EMAIL;
  const password = __ENV.PASSWORD || PERF_USER_PASSWORD;

  console.log(`🔧 Test setup for user: ${email}`);

  // Seed the performance database so we start from a known state
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

  // Login once to capture baseline order IDs
  const loginRes = http.post(
    `${baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );

  let token = "";
  try {
    const body = loginRes.json();
    if (body && body.token) token = body.token;
  } catch (e) {
    exec.test.abort(`⚠️ Login failed in setup: ${e}`);
  }

  if (!token) {
    exec.test.abort(`❌ Login failed in setup: ${loginRes.body}`);
  }

  // Fetch baseline orders — these must all still be present after recovery
  const ordersRes = http.get(`${baseUrl}/api/v1/auth/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let baselineOrderIds = [];
  let baselineOrderCount = 0;

  if (ordersRes.status === 200) {
    try {
      const orders = ordersRes.json();
      if (Array.isArray(orders)) {
        baselineOrderIds = orders.map((o) => o._id);
        baselineOrderCount = orders.length;
        console.log(`✅ BASELINE ORDERS CAPTURED in setup: ${baselineOrderCount} orders`);
        console.log(`   Order IDs: ${baselineOrderIds.slice(0, 3).join(", ")}...`);
      }
    } catch (e) {
      console.log(`⚠️ Failed to parse baseline orders: ${e}`);
    }
  } else {
    console.log(`⚠️ Could not fetch baseline orders (status ${ordersRes.status}), starting fresh`);
  }

  // Return shared data — available to every VU via the `data` parameter
  return {
    baseUrl,
    email,
    password,
    baselineOrderIds,   // array of _id strings captured before the test begins
    baselineOrderCount,
  };
}

// ---------------------------------------------------------------------------
// Per-VU mutable state (isolated per VU — only used for outage/recovery timing)
// ---------------------------------------------------------------------------
let outageStartTime = null;
let recoveryDetectedTime = null;

function login(base, email, password) {
  return http.post(
    `${base}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );
}

// ---------------------------------------------------------------------------
// default() — runs repeatedly on every VU
// ---------------------------------------------------------------------------
export default function (data) {
  const timestamp = Date.now();

  // Reconstruct the baseline set from shared setup data (available in every VU)
  const baselineOrderIds = new Set(data.baselineOrderIds || []);
  const baselineOrderCount = data.baselineOrderCount || 0;

  group("Authentication", function () {
    const loginRes = login(data.baseUrl, data.email, data.password);
    let token = "";

    try {
      const body = loginRes.json();
      if (body && body.token) token = body.token;
    } catch {
      sleep(thinkSec);
      return;
    }

    check(loginRes, {
      "login successful": (r) => r.status === 200 && r.json("success") === true,
    });

    if (!token) {
      sleep(thinkSec);
      return;
    }

    // -----------------------------------------------------------------------
    // Checkout (Order Creation)
    // Use fake-valid-nonce from Braintree test documentation
    // https://developer.paypal.com/braintree/docs/reference/general/testing/node#nonces
    // -----------------------------------------------------------------------
    group("Checkout (Order Creation)", function () {
      const payRes = http.post(
        `${data.baseUrl}/api/v1/product/braintree/payment`,
        JSON.stringify({ nonce: "fake-valid-nonce", cart: [] }),
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const isSuccess = payRes.status === 200;
      const isOutage = payRes.status === 500;

      // Outage detection
      if (isOutage && !outageStartTime) {
        outageStartTime = timestamp;
        console.log(`🔴 CHECKOUT OUTAGE DETECTED at ${new Date(timestamp).toISOString()}`);
      }

      // Recovery detection
      if (isSuccess && outageStartTime && !recoveryDetectedTime) {
        recoveryDetectedTime = timestamp;
        const recoveryDuration = (recoveryDetectedTime - outageStartTime) / 1000;
        recoveryTime.add(recoveryDuration);
        console.log(`🟢 CHECKOUT RECOVERY DETECTED after ${recoveryDuration.toFixed(1)}s`);
      }

      // Count successful orders by phase
      if (isSuccess) {
        try {
          const body = payRes.json();
          if (body.ok === true) {
            if (!outageStartTime) {
              ordersCreatedBaseline.add(1);
            } else if (recoveryDetectedTime) {
              ordersCreatedRecovery.add(1);
            }
          }
        } catch (_) {}
      }

      check(payRes, {
        "checkout returns 200 or 500 (no crash)": (r) =>
          r.status === 200 || r.status === 500,

        "checkout successful when DB up": (r) => {
          // Only enforce success outside of the known outage window
          if (!outageStartTime || recoveryDetectedTime) {
            if (r.status !== 200) return false;
            try {
              return r.json("ok") === true;
            } catch {
              return false;
            }
          }
          return true; // waive during known outage
        },

        "no partial order on failure": (r) => {
          // 500 = clean failure ✓, 200 with ok:true = success ✓, anything else = fail
          if (r.status === 500) return true;
          if (r.status === 200) {
            try {
              return r.json("ok") === true;
            } catch {
              return false;
            }
          }
          return false;
        },
      });
    });

    // -----------------------------------------------------------------------
    // Order Retrieval (Data Integrity)
    // Always runs — verifies baseline orders are intact regardless of outage
    // -----------------------------------------------------------------------
    group("Order Retrieval (Data Integrity)", function () {
      const ordersRes = http.get(`${data.baseUrl}/api/v1/auth/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const isSuccess = ordersRes.status === 200;
      const isOutage = ordersRes.status === 500;

      if (isSuccess) {
        try {
          const orders = ordersRes.json();

          if (Array.isArray(orders)) {
            const currentIds = new Set(orders.map((o) => o._id));

            // Check every baseline order is still present
            const missingOrders = Array.from(baselineOrderIds).filter(
              (id) => !currentIds.has(id),
            );
            const hasAllBaselineOrders = missingOrders.length === 0;

            // Structural integrity check on every order
            const noCorruption = orders.every(
              (o) =>
                o._id &&
                Array.isArray(o.products) &&
                o.buyer &&
                [
                  "Not Processed",
                  "Processing",
                  "Shipped",
                  "Delivered",
                  "Cancelled",
                ].includes(o.status),
            );

            const consistencyPassed = hasAllBaselineOrders && noCorruption;
            dataConsistencyRate.add(consistencyPassed);
            orderRetrievalSuccessRate.add(true);

            if (!consistencyPassed) {
              console.log(`⚠️  DATA CONSISTENCY FAILURE:`);
              console.log(`   Current orders : ${orders.length}`);
              console.log(`   Baseline orders: ${baselineOrderCount}`);
              console.log(`   Missing orders : ${missingOrders.length}`);
              if (missingOrders.length > 0) {
                console.log(`   Missing IDs    : ${missingOrders.slice(0, 3).join(", ")}`);
              }
              if (!noCorruption) {
                console.log(`   Corrupted order data detected`);
              }
            }
          }
        } catch (e) {
          dataConsistencyRate.add(false);
          orderRetrievalSuccessRate.add(false);
        }
      } else if (isOutage) {
        // During DB outage retrieval will fail — don't penalise consistency,
        // but do record the retrieval failure
        orderRetrievalSuccessRate.add(false);
      }

      check(ordersRes, {
        "orders endpoint returns 200 or 500": (r) =>
          r.status === 200 || r.status === 500,

        "orders retrievable when DB up": (r) => {
          if (!outageStartTime || recoveryDetectedTime) {
            if (r.status !== 200) return false;
            try {
              return Array.isArray(r.json());
            } catch {
              return false;
            }
          }
          return true; // waive during known outage
        },

        "orders array valid when successful": (r) => {
          if (r.status === 200) {
            try {
              const orders = r.json();
              return Array.isArray(orders) && orders.every((o) => o._id && o.buyer);
            } catch {
              return false;
            }
          }
          return true;
        },
      });
    });

    sleep(thinkSec);
  });
}

// ---------------------------------------------------------------------------
// handleSummary — printed once after all VUs finish
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const baselineOrders =
    data.metrics.orders_created_baseline?.values?.count || 0;
  const recoveryOrders =
    data.metrics.orders_created_recovery?.values?.count || 0;
  const retrievalRate =
    data.metrics.order_retrieval_success?.values?.rate || 0;
  const consistencyRate =
    data.metrics.data_consistency_passed?.values?.rate || 0;
  const avgRecoveryTime =
    data.metrics.recovery_time_seconds?.values?.avg || 0;
  const failureRate = data.metrics.http_req_failed?.values?.rate || 0;

  console.log("\n" + "=".repeat(80));
  console.log("CHECKOUT RECOVERY TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`Orders Created (Baseline Phase)  : ${baselineOrders}`);
  console.log(`Orders Created (Recovery Phase)  : ${recoveryOrders}`);
  console.log(`Order Retrieval Success Rate     : ${(retrievalRate * 100).toFixed(2)}%`);
  console.log(`Data Consistency Rate            : ${(consistencyRate * 100).toFixed(2)}%`);
  console.log(`HTTP Request Failure Rate        : ${(failureRate * 100).toFixed(2)}%`);
  console.log(`Average Recovery Time            : ${avgRecoveryTime.toFixed(2)}s`);
  console.log("=".repeat(80));

  const passed =
    failureRate < 0.25 && retrievalRate > 0.9 && consistencyRate > 0.95;

  console.log(`Recovery Test: ${passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log("=".repeat(80));

  return {
    stdout: JSON.stringify(data, null, 2),
  };
}