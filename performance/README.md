# Performance Testing

This directory contains k6 load testing scripts for the e-commerce application. Tests measure response times under various load levels to detect performance regressions and identify optimization opportunities.

## Prerequisites

- **k6 version:** 0.50.0 or later
- **Node.js:** 18 or later (for helper scripts)
- **Running server:** The Express application must be running on http://localhost:6060 before tests start
- **Database:** Seeded with test data via POST /api/v1/test/volume-seed before volume tests

## Installation

### macOS (Homebrew)

```bash
brew install k6
```

### Ubuntu/Debian (apt)

```bash
sudo apt-get update
sudo apt-get install -y apt-transport-https
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6-archive.list
sudo apt-get update
sudo apt-get install k6
```

### Verify Installation

```bash
k6 version
```

## Running the Tests

All test scripts are located in the `./scripts/` directory. Each test is designed for a specific purpose.

**IMPORTANT:** The server must be running before starting tests. In one terminal, run:

```bash
NODE_ENV=development npm start
```

This sets `NODE_ENV=development` to enable the test endpoints (`/api/v1/test/seed`, `/api/v1/test/teardown`, etc.). The npm scripts automatically set this environment variable, but the server must also be started with it.

### Smoke Test (Quick Sanity Check)

Runs a single VU for 10 seconds. Use this to verify endpoints are responding and basic auth works.

```bash
npm run test:perf:smoke
```

### Baseline Test (Small Dataset)

Runs a single VU for 30 seconds against the baseline dataset (2 orders). Establishes a baseline for comparison.

```bash
npm run test:perf:baseline
```

### Volume Test (Scaled Datasets)

Runs a single VU for 30s, scales to 1 VU for 60s, then scales down to 0 VU for 30s. Tests against the "small" volume level (1,000 orders, 100 users, 100 products). Seeds volume data before the test starts.

```bash
npm run test:perf:volume
```

## Understanding Results

### Metrics Explained

- **p50 (median):** 50% of requests completed in this time or less. Represents typical user experience.
- **p95 (95th percentile):** 95% of requests completed in this time or less. Indicates the experience for most users, excluding outliers.
- **p99 (99th percentile):** 99% of requests completed in this time or less. Shows worst-case performance, important for SLA compliance.

### Thresholds

Each test compares measured response times (p95) against configured thresholds. If p95 exceeds the threshold, k6 will fail the test.

Current thresholds (from `performance/config.js`):
- GET /api/v1/auth/all-orders: **800ms** (full collection scan; super-linear degradation expected)
- GET /api/v1/auth/orders: **400ms** (per-user query; linear degradation)
- PUT /api/v1/auth/order-status/:id: **300ms** (single document update)
- GET /api/v1/auth/users: **600ms** (full user table scan; linear degradation)

### Expected Degradation Patterns

- **GET /api/v1/auth/all-orders:** Super-linear (p95 increases >2x when volume 50x). Root cause: missing index on `createdAt`. Solution: add `orderSchema.index({ createdAt: -1 })`.
- **GET /api/v1/auth/orders:** Linear. Queries by buyer ID (indexed in Mongoose); scales proportionally with total orders but not user count.
- **PUT /api/v1/auth/order-status/:id:** Linear. Single document by _id (always indexed); scales slightly with total orders due to write contention.
- **GET /api/v1/auth/users:** Linear. Full table scan; scales proportionally with user count.

### Reading k6 Output

k6 produces an HTML report in `./performance-report.html` after each run. Open it in a browser to visualize:
- Request rate (requests/sec over time)
- Response time distribution (p50/p95/p99)
- Error count and rate
- Pass/fail status for each threshold

## Adding New Tests

### File Naming Convention

- **Smoke tests:** `scripts/smoke.js` (single VU, short duration, sanity check)
- **Baseline tests:** `scripts/baseline.js` (single VU, small data, reference point)
- **Load tests:** `scripts/load-{level}.js` where level is "small", "medium", "large"
- **Spike tests:** `scripts/spike.js` (rapid ramp-up to peak load)
- **Soak tests:** `scripts/soak.js` (constant load for extended duration, e.g., 30+ minutes)

### Test Structure Template

```javascript
import http from "k6/http";
import { check, group } from "k6";
import { getAdminToken, getAuthHeaders } from "../helpers/auth.js";
import { volumeSeed, volumeTeardown } from "../helpers/seed.js";

const BASE_URL = "http://localhost:6060";

// Setup runs once at test start on the first VU iteration
export function setup() {
  // Seed database or fetch prerequisites
  return { adminToken: getAdminToken() };
}

// Default options: can be overridden by CLI --stage
export const options = {
  stages: [
    { duration: "30s", target: 1 }
  ],
  thresholds: {
    "http_req_duration{endpoint:all-orders}": ["p95<800"],
  }
};

// Main test function runs for each VU iteration
export default function (data) {
  const adminToken = data.adminToken;
  const headers = getAuthHeaders(adminToken);

  group("GET /api/v1/auth/all-orders", () => {
    const res = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
      headers,
      tags: { endpoint: "all-orders" }
    });
    check(res, {
      "status is 200": (r) => r.status === 200,
      "response has data": (r) => r.body && r.body.length > 0
    });
  });
}

// Teardown runs once at test end on the last VU iteration
export function teardown() {
  volumeTeardown();
}
```

### Custom Thresholds per Endpoint

Use k6's tagging feature to apply different thresholds to different endpoints:

```javascript
const res = http.get(url, {
  headers,
  tags: { endpoint: "all-orders" }
});
```

Then set thresholds in `options`:

```javascript
thresholds: {
  "http_req_duration{endpoint:all-orders}": ["p95<800"],
  "http_req_duration{endpoint:orders}": ["p95<400"],
}
```

## Troubleshooting

### Test fails with 404 on POST /api/v1/test/volume-seed

- The Express server must be running (`npm start` or `npm run dev`)
- Ensure NODE_ENV is NOT set to 'test' or 'ui-test' (these disable test routes)
- Check that testRoutes are mounted in server.js under the /api/v1/test path

### Test fails with invalid JWT or 401 Unauthorized

- Verify admin credentials in `performance/helpers/auth.js` match TEST_USERS[0] in `__tests__/e2e/fixtures/seedData.js`
- Ensure the login endpoint POST /api/v1/auth/login is returning a valid JWT token
- Check that getAuthHeaders() passes the token without a "Bearer " prefix (raw token only)

### Database grows unboundedly after tests

- Ensure volumeTeardown() is called in the test's teardown() function
- Manually clean up with: `curl -X POST http://localhost:6060/api/v1/test/volume-teardown`
- Run the standard teardown to preserve E2E data: `curl -X POST http://localhost:6060/api/v1/test/teardown`

### Memory errors or timeouts with large volumes

- Reduce volume levels in config.js VOLUME_LEVELS
- Increase k6 memory (if using Docker): `docker run -m 4g ...`
- Run tests sequentially instead of parallel: reduce workers or use `--discard-response-bodies`

## CI Integration

To run performance tests in CI:

1. Start the server in the background: `npm start &`
2. Wait for readiness: `sleep 5`
3. Run the test: `npm run test:perf:baseline`
4. Check exit code: If non-zero, tests failed or thresholds exceeded
5. Stop the server: `pkill -f "node server.js"`

Example GitHub Actions snippet:

```yaml
- name: Start server
  run: npm start &
  
- name: Wait for server
  run: sleep 5

- name: Run performance test
  run: npm run test:perf:baseline

- name: Stop server
  run: pkill -f "node server.js"
```
