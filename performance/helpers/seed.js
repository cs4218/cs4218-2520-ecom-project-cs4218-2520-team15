import http from "k6/http";
import { fail } from "k6";

const BASE_URL = "http://localhost:6060";

/**
 * Seed volume data at the specified level
 * Calls POST /api/v1/test/volume-seed with query params from config
 * @param {string} level - "small", "medium", or "large"
 * @returns {object} - { users: N, products: N, orders: N, categories: N }
 */
export function volumeSeed(level, volumeLevels) {
  const volumeConfig = volumeLevels[level];
  if (!volumeConfig) {
    fail(`Invalid volume level: ${level}. Must be one of: ${Object.keys(volumeLevels).join(", ")}`);
  }

  const url = `${BASE_URL}/api/v1/test/volume-seed?orders=${volumeConfig.orders}&users=${volumeConfig.users}&products=${volumeConfig.products}`;

  console.log(`Starting volume seed: ${volumeConfig.products} products, ${volumeConfig.users} users, ${volumeConfig.orders} orders...`);

  const res = http.post(url, null, {
    timeout: "600s" // Small: ~10-30s, Medium: ~2-3min, Large: ~10+ minutes
  });

  if (res.status !== 200) {
    console.error(`volumeSeed failed: status=${res.status}, body=${res.body}`);
    fail(`volumeSeed failed with status ${res.status}. Response: ${res.body}`);
  }

  let responseBody;
  try {
    responseBody = JSON.parse(res.body);
  } catch (error) {
    console.error(`volumeSeed response parsing failed: ${res.body}`);
    fail(`Failed to parse volumeSeed response as JSON. Response: ${res.body}`);
  }

  if (!responseBody.created) {
    console.error(`volumeSeed response missing created field: ${JSON.stringify(responseBody)}`);
    fail(`volumeSeed response does not contain created field. Response: ${JSON.stringify(responseBody)}`);
  }

  console.log(`✓ Volume seed complete: ${responseBody.created.products} products, ${responseBody.created.users} users, ${responseBody.created.orders} orders`);
  return responseBody.created;
}

/**
 * Tear down volume seed data (delete only volumeSeeded: true documents)
 * Calls POST /api/v1/test/volume-teardown
 * @returns {object} - { users: N, products: N, orders: N }
 */
export function volumeTeardown() {
  const url = `${BASE_URL}/api/v1/test/volume-teardown`;

  console.log(`volumeTeardown: Starting cleanup at ${url}`);

  const res = http.post(url, null, {
    timeout: "600s"
  });

  console.log(`volumeTeardown: Response status=${res.status}, body=${res.body}`);

  if (res.status !== 200) {
    fail(`volumeTeardown failed with status ${res.status}. Response: ${res.body}`);
  }

  let responseBody;
  try {
    responseBody = JSON.parse(res.body);
  } catch (error) {
    console.error(`volumeTeardown: Failed to parse response: ${res.body}`);
    fail(`Failed to parse volumeTeardown response as JSON. Response: ${res.body}`);
  }

  console.log(`volumeTeardown: Parsed response: ${JSON.stringify(responseBody)}`);

  if (!responseBody.deleted) {
    console.error(`volumeTeardown: Missing deleted field. Response: ${JSON.stringify(responseBody)}`);
    fail(`volumeTeardown response does not contain deleted field. Response: ${JSON.stringify(responseBody)}`);
  }

  console.log(`volumeTeardown: Successfully deleted ${responseBody.deleted.users} users, ${responseBody.deleted.products} products, ${responseBody.deleted.orders} orders`);
  return responseBody.deleted;
}
