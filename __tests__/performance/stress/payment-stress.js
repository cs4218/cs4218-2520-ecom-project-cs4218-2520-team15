/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";

/* Note:
 * See README.md in `__tests__/performance/stress` directory
 * before running this test script.
 */

export const options = {
  scenarios: {
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "5m", target: 50 }, // (Expected) Average Load
        { duration: "1m", target: 100 },
        { duration: "5m", target: 100 }, // Breaking Point
        { duration: "1m", target: 150 },
        { duration: "5m", target: 150 }, // Beyond Breaking Point
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate < 0.01"],
    http_req_duration: ["p(90) < 1000"],
  },
  setupTimeout: "120s",
};

export function setup() {
  const response = http.post(
    "http://localhost:6060/api/v1/test/performance-seed",
    {},
    { timeout: "90s" },
  );
  const result = check(response, {
    "POST /performance-seed OK": (r) => r.status == 200,
  });
  if (!result) {
    exec.test.abort("Aborting test: Seed operation failed.");
  }
  const { products, authToken } = response.json();
  return {
    products,
    authToken,
    nonces: [
      "fake-valid-nonce",
      "fake-valid-visa-nonce",
      "fake-valid-amex-nonce",
      "fake-valid-mastercard-nonce",
      "fake-valid-discover-nonce",
      "fake-valid-debit-nonce",
    ],
  };
}

export default function (data) {
  const getRandomItem = (collection) => {
    const index = Math.floor(Math.random() * collection.length);
    return collection[index];
  };
  const { products, authToken, nonces } = data;
  // Add variability to prevent duplicate transaction error
  const cart = new Array(4).fill(null).map(() => getRandomItem(products));
  const nonce = getRandomItem(nonces);

  const paymentResponse = http.post(
    "http://localhost:6060/api/v1/product/braintree/payment",
    JSON.stringify({ nonce, cart }),
    {
      headers: { Authorization: authToken, "Content-Type": "application/json" },
    },
  );
  check(paymentResponse, {
    "POST /braintree/payment response OK": (r) => r.status === 200,
  });

  sleep(15);
}

export function teardown(data) {
  http.post("http://localhost:6060/api/v1/test/teardown");
}
