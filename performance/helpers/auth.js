import http from "k6/http";
import { check, fail } from "k6";

const BASE_URL = "http://localhost:6060";

// Cache token per VU to avoid re-authentication within same iteration
let cachedToken = null;

export function seedDatabase() {
  // Seed the database with E2E test data before running tests
  const res = http.post(`${BASE_URL}/api/v1/test/seed`);

  if (res.status !== 200) {
    fail(`Seed failed with status ${res.status}. Response: ${res.body}`);
  }

  let responseBody;
  try {
    responseBody = JSON.parse(res.body);
  } catch (error) {
    fail(`Failed to parse seed response as JSON. Response: ${res.body}`);
  }

  if (!responseBody.success) {
    fail(`Seed was not successful. Response: ${JSON.stringify(responseBody)}`);
  }
}

export function getAdminToken() {
  // Return cached token if available
  if (cachedToken) {
    return cachedToken;
  }

  const payload = JSON.stringify({
    email: "e2etest_admin_user@example.com",
    password: "TestAdmin@12345"
  });

  const params = {
    headers: {
      "Content-Type": "application/json"
    }
  };

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);

  // Check response status
  if (res.status !== 200) {
    fail(`Login failed with status ${res.status}. Response: ${res.body}`);
  }

  // Parse response as JSON
  let responseBody;
  try {
    responseBody = JSON.parse(res.body);
  } catch (error) {
    fail(`Failed to parse login response as JSON. Response: ${res.body}`);
  }

  // Check for token field
  if (!responseBody.token) {
    fail(`Login response does not contain a token field. Response: ${JSON.stringify(responseBody)}`);
  }

  // Cache the token
  cachedToken = responseBody.token;

  return cachedToken;
}

export function getAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    "Authorization": token
  };
}

// Reset cache (for teardown/cleanup scenarios)
export function resetTokenCache() {
  cachedToken = null;
}
