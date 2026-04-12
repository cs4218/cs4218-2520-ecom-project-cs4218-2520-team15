import http from "k6/http";
import { check, fail } from "k6";

const BASE_URL = "http://localhost:6060";

/**
 * Fetch and validate seeded data for performance testing
 * Called in setup() after seedDatabase() to retrieve actual IDs for load testing
 * @returns {object} - { productIds, categoryIds, orderIds, adminToken }
 */
export function getSeededData(adminToken) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": adminToken
  };

  // Fetch all products
  const productsRes = http.get(`${BASE_URL}/api/v1/product/get-product`, {
    headers,
    tags: { name: "setup-fetch-products" }
  });

  if (productsRes.status !== 200) {
    fail(`Failed to fetch products in setup. Status: ${productsRes.status}`);
  }

  let productsData;
  try {
    productsData = JSON.parse(productsRes.body);
  } catch (e) {
    fail(`Failed to parse products response: ${productsRes.body}`);
  }

  if (!productsData.products || productsData.products.length === 0) {
    fail(`No products found. Setup failed. Is test database seeded?`);
  }

  const productIds = productsData.products.map((p) => p._id);
  const productSlugs = productsData.products.map((p) => p.slug);

  // Fetch all categories
  const categoriesRes = http.get(`${BASE_URL}/api/v1/category/get-category`, {
    headers,
    tags: { name: "setup-fetch-categories" }
  });

  if (categoriesRes.status !== 200) {
    fail(`Failed to fetch categories in setup. Status: ${categoriesRes.status}`);
  }

  let categoriesData;
  try {
    categoriesData = JSON.parse(categoriesRes.body);
  } catch (e) {
    fail(`Failed to parse categories response: ${categoriesRes.body}`);
  }

  if (!categoriesData.category || categoriesData.category.length === 0) {
    fail(`No categories found. Setup failed. Is test database seeded?`);
  }

  const categoryIds = categoriesData.category.map((c) => c._id);
  const categorySlugs = categoriesData.category.map((c) => c.slug);

  // Fetch all orders (admin view - GET /api/v1/auth/all-orders)
  const ordersRes = http.get(`${BASE_URL}/api/v1/auth/all-orders`, {
    headers,
    tags: { name: "setup-fetch-orders" }
  });

  let orderIds = [];
  if (ordersRes.status === 200) {
    try {
      const ordersData = JSON.parse(ordersRes.body);
      if (Array.isArray(ordersData)) {
        // Response is an array of orders
        orderIds = ordersData.map((o) => o._id).filter(Boolean);
      } else if (ordersData.orders && Array.isArray(ordersData.orders)) {
        // Response is { orders: [...] }
        orderIds = ordersData.orders.map((o) => o._id).filter(Boolean);
      }
    } catch (e) {
      console.warn(`Warning: Could not fetch orders in setup: ${e.message}`);
    }
  } else {
    console.warn(`Warning: Failed to fetch orders. Status: ${ordersRes.status}`);
  }

  // Validate we have what we need
  if (productIds.length === 0) {
    fail(`Setup validation failed: no productIds found`);
  }

  if (categoryIds.length === 0) {
    fail(`Setup validation failed: no categoryIds found`);
  }

  console.log(`Setup complete: ${productIds.length} products, ${categoryIds.length} categories, ${orderIds.length} orders`);

  return {
    productIds,
    productSlugs,
    categoryIds,
    categorySlugs,
    orderIds,
    adminToken
  };
}

/**
 * Helper to pick a random element from an array
 * @param {array} arr
 * @returns {*} - random element, or null if array empty
 */
export function pickRandom(arr) {
  if (!arr || arr.length === 0) {
    return null;
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper to check seeded data presence (validate correct DB)
 * @param {object} data - { productIds, categoryIds, orderIds, adminToken }
 * @returns {boolean} - true if all required data present
 */
export function validateSeededData(data) {
  if (!data.productIds || data.productIds.length === 0) {
    return false;
  }
  if (!data.categoryIds || data.categoryIds.length === 0) {
    return false;
  }
  if (!data.adminToken) {
    return false;
  }
  return true;
}
