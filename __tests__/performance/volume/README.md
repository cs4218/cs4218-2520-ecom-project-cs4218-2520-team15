# Performance Testing Guide

K6-based load testing suite for the e-commerce application. Tests measure endpoint response times (p50, p95, p99) and detect performance degradation under increasing load.

## Quick Start

### Setup

1. **Install k6:**
   ```bash
   # macOS
   brew install k6
   
   # Linux (Ubuntu/Debian)
   sudo apt-get update && sudo apt-get install -y k6
   ```

2. **Verify installation:**
   ```bash
   k6 version
   ```

3. **Configure database:**
   - Add `MONGO_TEST_URL` to `.env` (points to test MongoDB)
   - Ensure `NODE_ENV` is NOT set to 'test' or 'ui-test'

### Run Tests

Start the server (required for all tests):
```bash
USE_TEST_DB=true node server.js
```

In another terminal, run tests:

```bash
# Smoke test (10s sanity check)
npm run test:perf:smoke

# Baseline test (establish reference point)
npm run test:perf:baseline

# Volume test (load test with 1000 orders)
npm run test:perf:volume

# All tests + analysis report
npm run test:perf:all
```

### Generate Analysis Report

```bash
npm run analyze:perf
```

Optional: Use Gemini AI for enhanced analysis:
```bash
GEMINI_API_KEY=your_key npm run analyze:perf
```

Falls back to local analysis if API key is missing.

## Volume Testing Implementation

### How Volume Seeding Works

The volume test automatically seeds data via `/api/v1/test/volume-seed` endpoint:

1. **Creates test users** - `volumeSeeded: true` flag
2. **Creates test products** - with random categories
3. **Creates test orders** - distributed across users and products

**Manual seed request:**
```bash
curl -X POST "http://localhost:6060/api/v1/test/volume-seed?orders=1000&users=100&products=100"
```

**Response:**
```json
{
  "success": true,
  "created": {
    "users": 100,
    "products": 100,
    "orders": 1000
  }
}
```

### Automatic Teardown

Tests automatically clean up via `/api/v1/test/volume-teardown` in the teardown phase.

**Manual teardown:**
```bash
curl -X POST http://localhost:6060/api/v1/test/volume-teardown
```

The teardown only deletes records with `volumeSeeded: true`, preserving E2E test fixtures.

## Understanding Results

### Response Time Metrics

- **p50:** 50th percentile - typical user experience
- **p95:** 95th percentile - most users, excluding outliers
- **p99:** 99th percentile - worst-case performance for SLA
- **avg:** Mean response time
- **min/max:** Minimum and maximum observed latencies

### Performance Thresholds

Tests fail if p95 exceeds configured limits. Examples (from `scripts/volume.js`):

```javascript
thresholds: {
  "http_req_duration{endpoint:all-orders}": ["p95<800"],    // Full scan
  "http_req_duration{endpoint:orders}": ["p95<400"],        // Indexed query
  "http_req_duration{endpoint:users}": ["p95<600"],         // Full user table
}
```

### Expected Scaling Patterns

| Endpoint | Load Pattern | Reason |
|----------|--------------|--------|
| GET all-orders | Super-linear | Full collection scan (index missing on `createdAt`) |
| GET orders | Linear | Indexed by buyer ID |
| GET users | Linear | Full user table scan |
| PUT order-status | Linear | Indexed by `_id` (write contention) |

## File Structure

```
performance/
├── scripts/
│   ├── baseline.js     # Small-scale test (~2 orders)
│   ├── smoke.js        # Sanity check (10s)
│   └── volume.js       # Load test (1000 orders)
├── helpers/
│   ├── auth.js         # Admin token generation
│   ├── seed.js         # Volume seed/teardown calls
│   └── data.js         # Data validation
├── results/
│   ├── baseline-results.json
│   ├── smoke-results.json
│   └── volume-results.json
├── analyzeResults.js   # Performance analysis engine
├── config.js           # Shared constants
└── README.md           # This file
```

## Configuration

### Adjust Volume Levels

Edit `scripts/volume.js`:

```javascript
const VOLUME_SEED = {
  ordersCount: 1000,   // Change number of orders
  usersCount: 100,     // Change number of users
  productsCount: 100   // Change number of products
};
```

### Adjust Response Thresholds

Edit `scripts/volume.js` thresholds:

```javascript
thresholds: {
  "http_req_duration{endpoint:all-orders}": ["p95<800"],
  "http_req_duration{endpoint:orders}": ["p95<400"],
  // Add more endpoints as needed
}
```

### Adjust Test Duration

Edit `scripts/volume.js` stages:

```javascript
stages: [
  { duration: "30s", target: 0 },  // Ramp down
  { duration: "60s", target: 1 },  // Ramp up
  { duration: "30s", target: 1 }   // Hold
]
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on `/api/v1/test/volume-seed` | Start server with `USE_TEST_DB=true node server.js` |
| 401 Unauthorized | Check admin credentials in `helpers/auth.js` match test fixtures |
| Database keeps growing | Run teardown: `curl -X POST http://localhost:6060/api/v1/test/volume-teardown` |
| Memory errors | Reduce volume levels in `scripts/volume.js` |
| Timeout errors | Increase duration in `scripts/volume.js` stages |
| Tests hang | Check that server is running and responding to requests |

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Start server
  run: USE_TEST_DB=true node server.js &
  
- name: Wait for server readiness
  run: sleep 5

- name: Run performance tests
  run: npm run test:perf:all

- name: Stop server
  run: pkill -f "node server.js"
```

## Analysis Reports

After running `npm run analyze:perf`, a markdown report is generated:

```
performance-analysis-{stage}-YYYY-MM-DDTHH-mm-ss-sssZ.md
```

Report includes:
- Performance summary (p50/p95/p99 for each endpoint)
- Slow endpoints identified (>500ms p95)
- Degradation analysis (baseline vs volume)
- Scalability assessment
- System limitations
- Optimization recommendations

With `GEMINI_API_KEY` set, includes AI-powered insights. Otherwise uses local analysis.

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 HTTP API](https://k6.io/docs/javascript-api/k6-http/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [k6 Best Practices](https://k6.io/docs/misc/best-practices/)
