/**
 * Recovery scenario 5: Post-recovery "thundering herd"
 *
 * Manual failure injection steps:
 * 1. Start test:
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s SPIKE_VUS=50 BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-05-thundering-herd.js
 *
 * 2. At 1:00 mark:
 *    - Go to MongoDB Atlas → Network Access
 *    - Delete the IP access entry (e.g., your current IP or 0.0.0.0/0)
 *    - Wait 10 seconds
 *    - Ctrl+C the Node.js server, then restart with: npm run server
 *
 * 3. At 3:00 mark:
 *    - Re-add IP in MongoDB Atlas (+ ADD CURRENT IP ADDRESS)
 *    - Wait 10 seconds
 *    - Restart the Node.js server again (Ctrl+C, npm run server)
 *    - Server will take ~1.5-2 minutes to fully reconnect to MongoDB
 *
 * 4. At 5:00–5:30 (spike stage):
 *    - Server is now healthy and reconnected
 *    - 50 VUs spike (thundering herd hits recovered system)
 *    - Watch dashboard for latency under sudden load
 *
 * 5. After 5:30:
 *    - System stabilizes back to 2 VUs
 *    - Recovery complete
 *
 * Expected:
 * - Failures during outage window (~1:00–3:00)
 * - Gradual recovery during reconnection (~3:00–5:00)
 * - Latency spike during thundering herd (~5:00–5:30)
 * - System remains responsive (no collapse under spike)
 * - <30% failed requests overall, p95 latency <5s
 *
 * Notes:
 * - Simulates "thundering herd" effect: many users hitting system after recovery
 * - Tests system stability under sudden traffic spike on recovered system
 * - Server restart + MongoDB reconnection takes ~1.5-2 minutes
 *
 * Defaults: EMAIL/PASSWORD from seedData.js (normal user)
 * Override with env: BASE_URL, EMAIL, PASSWORD, SPIKE_VUS
 *
 * Run:
 *   SPIKE_VUS=50 BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-05-thundering-herd.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { TEST_USERS } from "../e2e/fixtures/seedData.js";

const SEEDED_NORMAL = TEST_USERS.find((u) => u.role === 0) || TEST_USERS[1];
const spikeVus = Number(__ENV.SPIKE_VUS || "50");

export const options = {
  stages: [
    { duration: "1m", target: 2 },       // Baseline (healthy)
    { duration: "2m", target: 2 },       // ← DELETE IP at 1:00, outage window
    { duration: "2m", target: 2 },       // ← RE-ADD IP at 3:00, server reconnecting
    { duration: "30s", target: spikeVus }, // ← Spike at 5:00 (thundering herd)
    { duration: "2m", target: 2 },       // Cool down, stability check
  ],
  thresholds: {
    http_req_failed: ["rate<0.30"],      // Max 30% failures
    http_req_duration: ["p(95)<5000"],   // Max 5s p95 latency
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
    /* ignore */
  }

  check(loginRes, {
    "login 200 and success when up": (r) => {
      if (r.status !== 200) return false;
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

  const res = http.get(`${data.baseUrl}/api/v1/product/get-product`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, {
    "get-product 200 when up": (r) => r.status === 200,
  });

  sleep(1);
}