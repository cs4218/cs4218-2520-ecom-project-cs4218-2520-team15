import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = 'http://localhost:6060';

export const registerErrorRate = new Rate('register_error_rate');
export const loginErrorRate = new Rate('login_error_rate');

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(90)<500'],
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
    password: 'Test1234!'
  };
}

function requestParams(endpoint) {
  return {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { endpoint },
  };
}

export default function () {
  const user = buildUniqueUser();

  group('Registration flow', function () {
    const registerPayload = JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
    });

    const registerRes = http.post(`${BASE_URL}/api/v1/auth/register`, registerPayload, requestParams('register'));

    const registerSuccess = check(registerRes, {
      'register returned 200': (r) => r.status === 200,
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
