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

  const res = http.post(url);

  if (res.status !== 200) {
    fail(`volumeSeed failed with status ${res.status}. Response: ${res.body}`);
  }

  let responseBody;
  try {
    responseBody = JSON.parse(res.body);
  } catch (error) {
    fail(`Failed to parse volumeSeed response as JSON. Response: ${res.body}`);
  }

  if (!responseBody.created) {
    fail(`volumeSeed response does not contain created field. Response: ${JSON.stringify(responseBody)}`);
  }

  return responseBody.created;
}

/**
 * Tear down volume seed data (delete only volumeSeeded: true documents)
 * Calls POST /api/v1/test/volume-teardown
 * @returns {object} - { users: N, products: N, orders: N }
 */
export function volumeTeardown() {
  const url = `${BASE_URL}/api/v1/test/volume-teardown`;

  const res = http.post(url);

  if (res.status !== 200) {
    fail(`volumeTeardown failed with status ${res.status}. Response: ${res.body}`);
  }

  let responseBody;
  try {
    responseBody = JSON.parse(res.body);
  } catch (error) {
    fail(`Failed to parse volumeTeardown response as JSON. Response: ${res.body}`);
  }

  if (!responseBody.deleted) {
    fail(`volumeTeardown response does not contain deleted field. Response: ${JSON.stringify(responseBody)}`);
  }

  return responseBody.deleted;
}
