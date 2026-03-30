/**
 * Recovery scenario 2: Mongo down during authenticated orders reads
 *
 * Manual failure injection steps:
 * 1. Start test: 
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-02-mongo-down-orders.js
 * 2. At 3:00 mark: 
 *    - Go to MongoDB Atlas → Network Access
 *    - Delete the IP access entry (e.g., 219.75.2.40/32 or 0.0.0.0/0)
 * 3. At 8:00 mark:
 *    - Re-add IP in MongoDB Atlas (+ ADD IP ADDRESS → ADD CURRENT IP ADDRESS)
 * 4. Test completes at 11:00
 *
 * Expected: <35% failed requests, graceful auth degradation during outage (~3:00-8:00),
 *           clean recovery after MongoDB restored (~9:30+)
 *
 * Defaults: EMAIL/PASSWORD from __tests__/e2e/fixtures/seedData.js (TEST_USERS normal user).
 * Override with env: BASE_URL, EMAIL, PASSWORD.
 *
 * Run:
 *   BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-02-mongo-down-orders.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { TEST_USERS } from "../e2e/fixtures/seedData.js";

const SEEDED_NORMAL = TEST_USERS.find((u) => u.role === 0) || TEST_USERS[1];

export const options = {
  stages: [
    { duration: "1m", target: 2 },      // Warm-up
    { duration: "2m", target: 3 },      // Baseline (all healthy)
    { duration: "3m", target: 4 },      // ← DELETE IP at 3:00, propagation ~1.5m
    { duration: "5m", target: 4 },      // ← RE-ADD IP at 8:00, recovery by ~9:30, observe until 11:00
  ],
  thresholds: {
    http_req_failed: ["rate<0.35"],     // Max 35% failures during entire test
  },
};

export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:6060";
  const email = __ENV.EMAIL || SEEDED_NORMAL.email;
  const password = __ENV.PASSWORD || SEEDED_NORMAL.password;
  return { baseUrl, email, password };
}

export default function (data) {
  const loginRes = http.post(
    `${data.baseUrl}/api/v1/auth/login`,
    JSON.stringify({ email: data.email, password: data.password }),
    { headers: { "Content-Type": "application/json" } },
  );

  let token = "";
  try {
    const body = loginRes.json();
    if (body && body.token) token = body.token;
  } catch {
    /* ignore parse errors during outage */
  }

  check(loginRes, {
    "login 200": (r) => r.status === 200,
    "login success when DB up": (r) => {
      try {
        return r.json("success") === true;
      } catch {
        return false;
      }
    },
  });

  if (!token) {
    sleep(1);
    return;
  }

  const ordersRes = http.get(`${data.baseUrl}/api/v1/auth/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(ordersRes, {
    "orders reachable or known failure during outage": (r) =>
      r.status === 200 || r.status === 500 || r.status === 401,
  });

  sleep(1);
}