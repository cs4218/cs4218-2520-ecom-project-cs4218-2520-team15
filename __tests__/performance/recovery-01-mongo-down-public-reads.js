/**
 * Recovery scenario 1: Mongo down during public reads
 *
 * Manual failure injection steps:
 * 1. Start test: 
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-01-mongo-down-public-reads.js
 * 2. At 1:30 mark: 
 *    - Go to MongoDB Atlas → Network Access
 *    - Delete the IP access entry (e.g., 219.75.2.40/32 or 0.0.0.0/0)
 *    - Wait 10 seconds
 *    - Ctrl+C the Node.js server, then restart with: npm run server
 * 3. At 5:00 mark:
 *    - Re-add IP in MongoDB Atlas (+ ADD IP ADDRESS → ADD CURRENT IP ADDRESS)
 *    - Wait 10 seconds
 *    - Restart the Node.js server again (Ctrl+C, npm run server)
 * 4. Test completes at 10:00
 *
 * Expected: <30% failed requests, graceful degradation during outage (~1:30-5:00), 
 *           clean recovery after MongoDB restored (~6:30+)
 *
 * Run:
 *   BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-01-mongo-down-public-reads.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://localhost:6060";

const statusCounter = new Counter("get_product_status");

export const options = {
  stages: [
    { duration: "30s", target: 2 },   // Warm-up
    { duration: "1m", target: 3 },    // Pre-failure baseline (all healthy)
    { duration: "2m", target: 4 },    // ← DELETE IP at 1:30, propagation ~1.5m
    { duration: "1m30s", target: 5 }, // Outage window (failures happening)
    { duration: "5m", target: 5 },    // ← RE-ADD IP at 5:00, recovery by ~6:30, observe until 10:00
  ],
  thresholds: {
    http_req_failed: ["rate<0.30"],   // Max 30% failures during entire test
  },
};

export default function () {
  const res = http.get(`${baseUrl}/api/v1/product/get-product`);
  statusCounter.add(1, { status: String(res.status) });

  console.log(
    `VU ${__VU} iter ${__ITER} GET /api/v1/product/get-product -> ${res.status}`,
  );

  check(res, {
    "status 200 when service and DB healthy": (r) => r.status === 200,
  });

  sleep(1 + Math.random() * 2);
}