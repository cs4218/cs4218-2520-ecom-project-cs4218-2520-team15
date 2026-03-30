/**
 * Recovery scenario 4: Checkout (zero-total order) + Mongo outage
 *
 * Manual failure injection steps:
 * 1. Start test:
 *    K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_PERIOD=1s BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-04-checkout-db-outage.js
 *
 * 2. At ~1:00 mark:
 *    - Go to MongoDB Atlas → Network Access
 *    - Delete the IP access entry (e.g., your current IP or 0.0.0.0/0)
 *
 * 3. At ~2:00–2:30 mark:
 *    - MongoDB becomes unreachable (due to ~1–1.5 min propagation delay)
 *    - API starts returning 500s for checkout + orders endpoints
 *
 * 4. At ~2:30 mark:
 *    - Re-add IP in MongoDB Atlas (+ ADD CURRENT IP ADDRESS)
 *
 * 5. At ~3:30–5:00 mark:
 *    - System recovers after propagation delay
 *    - Checkout resumes returning 200 (ok: true)
 *    - Orders endpoint returns valid JSON again
 *
 * Expected:
 * - Delayed failure onset (not immediate after IP removal)
 * - Temporary spike in failed requests during ~3:00–4:30 window
 * - Checkout fails gracefully (no partial/corrupt orders)
 * - Automatic recovery without restarting server
 * - Overall <25% failed requests across test duration
 *
 * Notes:
 * - Uses zero-total cart (cart: []) so Braintree is skipped
 * - Focus is purely on DB dependency failure (order creation path)
 * - Reflects real MongoDB Atlas network rule propagation latency (~1–1.5 min)
 *
 * Defaults: EMAIL/PASSWORD from seedData.js (normal user)
 * Override with env: BASE_URL, EMAIL, PASSWORD, THINK_SEC
 *
 * Run:
 *   BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-04-checkout-db-outage.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { TEST_USERS } from "../e2e/fixtures/seedData.js";

const SEEDED_NORMAL =
  TEST_USERS.find((u) => u.role === 0) || TEST_USERS[1];
const thinkSec = Number(__ENV.THINK_SEC || "3");

export const options = {
  vus: 2,
  duration: "8m",
  thresholds: {
    http_req_failed: ["rate<0.25"],
  },
};

export function setup() {
  const baseUrl = __ENV.BASE_URL || "http://localhost:6060";
  const email = __ENV.EMAIL || SEEDED_NORMAL.email;
  const password = __ENV.PASSWORD || SEEDED_NORMAL.password;
  return { baseUrl, email, password };
}

function login(base, email, password) {
  return http.post(
    `${base}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );
}

export default function (data) {
  const loginRes = login(data.baseUrl, data.email, data.password);
  let token = "";
  try {
    const b = loginRes.json();
    if (b && b.token) token = b.token;
  } catch {
    /* ignore */
  }

  check(loginRes, {
    "login 200": (r) => r.status === 200,
    "login success when up": (r) => {
      try {
        return r.json("success") === true;
      } catch {
        return false;
      }
    },
  });

  if (!token) {
    sleep(thinkSec);
    return;
  }

  const payRes = http.post(
    `${data.baseUrl}/api/v1/product/braintree/payment`,
    JSON.stringify({ nonce: "fake-not-used-for-total-zero", cart: [] }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  check(payRes, {
    "payment 200 and ok when DB up": (r) => {
      if (r.status !== 200) return false;
      try {
        return r.json("ok") === true;
      } catch {
        return false;
      }
    },
  });

  const ordersRes = http.get(`${data.baseUrl}/api/v1/auth/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(ordersRes, {
    "orders 200 with JSON array when DB up": (r) => {
      if (r.status !== 200) return false;
      try {
        return Array.isArray(r.json());
      } catch {
        return false;
      }
    },
  });

  sleep(thinkSec);
}
