/**
 * Recovery scenario 3: API process crash under load
 *
 * Manual failure: While this test runs, kill the Node server for ~30s (Ctrl+C or kill pid), then start again.
 *
 * Run:
 *   BASE_URL=http://localhost:6060 k6 run __tests__/performance/recovery-03-api-process-crash.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://localhost:6060";

export const options = {
  vus: 5,
  duration: "5m",
  thresholds: {
    // Expect connection errors during the killed window; do not fail the run on spike.
    http_req_failed: ["rate<0.40"],
  },
};

export default function () {
  const products = http.get(`${baseUrl}/api/v1/product/get-product`);
  check(products, {
    "get-product 200 when API up": (r) => r.status === 200,
  });

  const home = http.get(`${baseUrl}/`);
  check(home, {
    "home responds when API up": (r) => r.status === 200,
  });

  sleep(1);
}
