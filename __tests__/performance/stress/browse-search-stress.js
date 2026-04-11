/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import { Faker } from "k6/x/faker";

/* Note:
 * See README.md in `__tests__/peformance/stress` directory
 * before running this test script.
 */

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 25 },
        { duration: "5m", target: 25 },
        { duration: "1m", target: 50 },
        { duration: "5m", target: 50 },
        { duration: "1m", target: 75 },
        { duration: "5m", target: 75 },
        { duration: "1m", target: 0 },
      ],
      exec: "browse",
      tags: { scenario: "browse" },
    },
    search: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 25 },
        { duration: "5m", target: 25 },
        { duration: "1m", target: 50 },
        { duration: "5m", target: 50 },
        { duration: "1m", target: 75 },
        { duration: "5m", target: 75 },
        { duration: "1m", target: 0 },
      ],
      exec: "search",
      tags: { scenario: "search" },
    },
  },
  thresholds: {
    "http_req_failed{scenario:browse}": ["rate < 0.01"],
    "http_req_duration{scenario:browse}": ["p(90) < 500"],
    "http_req_failed{scenario:search}": ["rate < 0.01"],
    "http_req_duration{scenario:search}": ["p(90) < 500"],
  },
  setupTimeout: "120s",
};

const BASE_URL = "http://localhost:6060/api/v1/product";

export function setup() {
  const response = http.post(
    "http://localhost:6060/api/v1/test/performance-seed",
    {},
    { timeout: "90s" },
  );
  const result = check(response, {
    "POST /performance-seed response OK": (r) => r.status == 200,
  });
  if (!result) {
    exec.test.abort("Aborting test: Seed operation failed.");
  }
}

export function browse() {
  const page = Math.floor(Math.random() * Math.ceil(300 / 6)) + 1; // 300 products seeded, 6 products per page

  const pageResponse = http.get(`${BASE_URL}/product-list/${page}`);
  check(pageResponse, {
    "GET /product-list/:page response OK": (r) =>
      r.status === 200 && r.json().products.length <= 6,
  });

  sleep(15); // Simulate user browsing products on a page
}

export function search() {
  const { product } = new Faker();
  const searchKeyword = encodeURI(product.productName());

  const pageResponse = http.get(`${BASE_URL}/search/${searchKeyword}`);
  check(pageResponse, {
    "GET /search/:keyword response OK": (r) => r.status === 200,
  });

  sleep(15); // Simulate user browsing products on a page
}

export default function () {
  /* Note:
   * - No default action, each scenario calls its own function
   * - Scenarios should run in parallel; simulate mixture of browsing
   *   and searching
   * - Combined Load:
   *   - (Expected) Average: 25 + 25 = 50
   *   - Breaking Point: 50 + 50 = 100
   *   - Beyond Breaking Point: 75 + 75 = 150
   */
}

export function teardown(data) {
  http.post("http://localhost:6060/api/v1/test/teardown");
}
