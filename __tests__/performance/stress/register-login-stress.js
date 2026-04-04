/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { check, sleep } from "k6";
import http from "k6/http";
import { Faker } from "k6/x/faker";

/* Note:
 * See README.md in `__tests__/peformance/stress` directory
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
    "http_req_failed{api:register}": ["rate < 0.01"],
    "http_req_duration{api:register}": ["p(90) < 500"],
    "http_req_failed{api:login}": ["rate < 0.01"],
    "http_req_duration{api:login}": ["p(90) < 500"],
  },
};

export default function () {
  const BASE_URL = "http://localhost:6060/api/v1/auth/";
  const { person, internet, address } = new Faker();
  const data = {
    name: person.name(),
    email: person.email(),
    password: internet.password(true, true, true, true, false, 8),
    phone: person.phone(),
    address: address.street(),
    answer: person.hobby(),
  };

  const registerResponse = http.post(
    `${BASE_URL}/register`,
    JSON.stringify(data),
    {
      headers: { "Content-Type": "application/json" },
      tags: { api: "register" },
    },
  );
  check(registerResponse, {
    "POST /register response OK": (r) => r.status === 201,
  });

  sleep(10); // Simulate user navigating to login page, and filling in form

  const loginResponse = http.post(
    `${BASE_URL}/login`,
    JSON.stringify({ email: data.email, password: data.password }),
    { headers: { "Content-Type": "application/json" }, tags: { api: "login" } },
  );
  check(loginResponse, { "POST /login response OK": (r) => r.status === 200 });

  sleep(2);
}

export async function teardown(data) {
  http.post("http://localhost:6060/api/v1/test/teardown");
}
