/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = 'http://localhost:6060';

export const registerErrorRate = new Rate('register_error_rate');
export const loginErrorRate = new Rate('login_error_rate');

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_failed{api:register}': ['rate < 0.01'],
    'http_req_duration{api:register}': ['p(90) < 700'],
    'http_req_failed{api:login}': ['rate < 0.01'],
    'http_req_duration{api:login}': ['p(90) < 700'],
  },
};

function randomHex(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function buildUniqueUser() {
  const suffix = randomHex(8);
  return {
    name: `load-test-${suffix}`,
    email: `loadtest+${suffix}@example.com`,
    password: 'Test1234!',
    phone: '1234567890',
    address: 'Test Address',
    answer: 'Test answer'
  };
}

function requestParams(endpoint) {
  return {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { api: endpoint },
  };
}

export function teardown() {
  http.post("http://localhost:6060/api/v1/test/teardown");
}

export default function () {
  const user = buildUniqueUser();

  group('Registration flow', function () {
    const registerPayload = JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
      address: user.address,
      answer: user.answer,
    });

    const registerRes = http.post(`${BASE_URL}/api/v1/auth/register`, registerPayload, requestParams('register'));

    const registerSuccess = check(registerRes, {
      'register returned 201': (r) => r.status === 201,
    });

    registerErrorRate.add(!registerSuccess);
    sleep(Math.random() * 0.5 + 0.5);
  });

  group('Login flow', function () {
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, requestParams('login'));

    const loginSuccess = check(loginRes, {
      'login returned 200': (r) => r.status === 200,
    });

    loginErrorRate.add(!loginSuccess);
  });

  sleep(Math.random() * 1.5 + 1);
}
