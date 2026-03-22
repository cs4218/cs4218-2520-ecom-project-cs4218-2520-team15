/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_PRODUCTS, TEST_CATEGORIES } from './fixtures/seedData.js';

const USER = TEST_USERS[1]; // Normal user

const TAMAGOTCHI = TEST_PRODUCTS[8];
const BLACKBERRY = TEST_PRODUCTS[6];
const CODING_BOOK = TEST_PRODUCTS[7];

const CLOTHING = TEST_CATEGORIES[1];
const BOOKS = TEST_CATEGORIES[2];

test.describe("Product Browsing (Search + Filter Feature)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    await test.step("login as normal user", async () => {
      await page.getByRole("link", { name: "Login" }).click();
      const emailInput = page.getByRole("textbox", { name: "Enter Your Email" });
      await emailInput.click();
      await emailInput.fill(USER.email);
      const passwordInput = page.getByRole("textbox", { name: "Enter Your Password" });
      await passwordInput.click();
      await passwordInput.fill(USER.password);
      await page.getByRole("button", { name: "LOGIN" }).click();
    });

    // should already be in home page
  });

  test.afterEach(async ({ page }) => {
    await test.step("logout as normal user", async () => {
      await page.getByRole('button', { name: 'E2E Test Normal User' }).click();
      await page.getByRole('link', { name: 'Logout' }).click();
    });

    // should already be in home page
  });

  test("Happy Path (Search Name): For user searching for specific product (search bar: product name)", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");

    // Step 3: Fill in Search Bar to find specific product by name (tamagotchi)
    await page.getByRole("searchbox", { name: "Search" }).click();
    await page.getByRole("searchbox", { name: "Search" }).fill("tamagotchi");
    await page.getByRole("button", { name: "Search" }).click();
    // should only find one Tamagotchi product
    await expect(page).toHaveURL("http://localhost:3000/search");
    await expect(page.getByText("Search Results")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Found 1 product(s)")).toBeVisible({ timeout: 5000 });

    await page.waitForSelector('.card', { timeout: 5000 });
    const searchProducts = await page.locator(".card").count();
    expect(searchProducts).toEqual(1);

    // Step 4: Navigate to Product Details (by clicking on More Details button of a product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    await expect(page).toHaveURL(`http://localhost:3000/product/${TAMAGOTCHI.slug}`);
    await expect(page.getByText(`Name : ${TAMAGOTCHI.name}`)).toBeVisible({ timeout: 5000 });

    // Step 5: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 6: User Logout (done after each test case already)
  });

  test("Happy Path (Search Description): For user searching for specific product (search bar: product description)", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");

    // Step 3: Fill in Search Bar to find specific product by description (strawberry)
    await page.getByRole("searchbox", { name: "Search" }).click();
    await page.getByRole("searchbox", { name: "Search" }).fill("strawberry");
    await page.getByRole("button", { name: "Search" }).click();
    // should only find one Blackberry product
    await expect(page).toHaveURL("http://localhost:3000/search");
    await expect(page.getByText("Search Results")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Found 1 product(s)")).toBeVisible({ timeout: 5000 });

    await page.waitForSelector('.card', { timeout: 5000 });
    const searchProducts = await page.locator(".card").count();
    expect(searchProducts).toEqual(1);

    // Step 4: Navigate to Product Details (by clicking on More Details button of a product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    await expect(page).toHaveURL(`http://localhost:3000/product/${BLACKBERRY.slug}`);
    await expect(page.getByText(`Name : ${BLACKBERRY.name}`)).toBeVisible({ timeout: 5000 });

    // Step 5: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 6: User Logout (done after each test case already)
  });

  test("No Results Path (Search): For user searching for specific product but no results found", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");

    // Step 3: Fill in Search Bar to find specific product by description (strawberry)
    await page.getByRole("searchbox", { name: "Search" }).click();
    await page.getByRole("searchbox", { name: "Search" }).fill("missing");
    await page.getByRole("button", { name: "Search" }).click();
    // should have no search results found
    await expect(page).toHaveURL("http://localhost:3000/search");
    await expect(page.getByText("Search Results")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("No Products Found")).toBeVisible({ timeout: 5000 });

    const searchProducts = await page.locator(".card").count();
    expect(searchProducts).toEqual(0);

    // Step 5: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 6: User Logout (done after each test case already)
  });

  test("Happy Path (Filter Single Category): For user searching for products under specific category", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");

    // Step 3: Click Load More button on Home (pagination)
    await page.waitForSelector('.card', { timeout: 5000 });
    const initialProducts = await page.locator(".card").count();
    expect(initialProducts).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Load More" }).click();
    await page.waitForTimeout(2000); // Wait for new products to load
    const productsAfterLoadMore = await page.locator('.card').count();
    expect(productsAfterLoadMore).toBeGreaterThan(initialProducts);

    // Step 4: Filter by Category (Books)
    await page.getByRole("checkbox", { name: `${BOOKS.name}` }).check();
    // should have lesser product cards (exactly 4 from seedData)
    await page.waitForTimeout(2000); // Wait for filtered products to load
    await page.waitForSelector('.card', { timeout: 5000 });
    const filteredProducts = await page.locator('.card').count();
    expect(filteredProducts).toEqual(4);
    expect(filteredProducts).toBeLessThan(productsAfterLoadMore);

    // Step 5: Navigate to Product Details (by clicking on More Details button of a product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    // should be Coding Book (last book to be created)
    await expect(page).toHaveURL(`http://localhost:3000/product/${CODING_BOOK.slug}`);
    await expect(page.getByText(`Name : ${CODING_BOOK.name}`)).toBeVisible({ timeout: 5000 });

    // Step 6: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 7: User Logout (done after each test case already)
  });

  test("Happy Path (Filter Multiple Categories): For user searching for products under specific categories", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");

    // Step 3: Click Load More button on Home (pagination)
    await page.waitForSelector('.card', { timeout: 5000 });
    const initialProducts = await page.locator(".card").count();
    expect(initialProducts).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Load More" }).click();
    await page.waitForTimeout(2000); // Wait for new products to load
    const productsAfterLoadMore = await page.locator('.card').count();
    expect(productsAfterLoadMore).toBeGreaterThan(initialProducts);

    // Step 4: Filter by Category (Books + Clothing)
    await page.getByRole("checkbox", { name: `${BOOKS.name}` }).check();
    await page.getByRole("checkbox", { name: `${CLOTHING.name}` }).check();
    // should have lesser product cards (exactly 5 from seedData)
    await page.waitForTimeout(2000); // Wait for filtered products to load
    await page.waitForSelector('.card', { timeout: 5000 });
    const filteredProducts = await page.locator('.card').count();
    expect(filteredProducts).toEqual(5);
    expect(filteredProducts).toBeLessThan(productsAfterLoadMore);

    // Step 5: Navigate to Product Details (by clicking on More Details button of a product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    // should be Coding Book (last book/clothing to be created)
    await expect(page).toHaveURL(`http://localhost:3000/product/${CODING_BOOK.slug}`);
    await expect(page.getByText(`Name : ${CODING_BOOK.name}`)).toBeVisible({ timeout: 5000 });

    // Step 6: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 7: User Logout (done after each test case already)
  });

  test("Happy Path (Filter Price): For user searching for products under specific price range", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");

    // Step 3: Click Load More button on Home (pagination)
    await page.waitForSelector('.card', { timeout: 5000 });
    const initialProducts = await page.locator(".card").count();
    expect(initialProducts).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Load More" }).click();
    await page.waitForTimeout(2000); // Wait for new products to load
    const productsAfterLoadMore = await page.locator('.card').count();
    expect(productsAfterLoadMore).toBeGreaterThan(initialProducts);

    // Step 4: Filter by Price Range ($0 to $19)
    await page.getByRole("radio", { name: "$0 to 19" }).check();
    // should have lesser product cards (exactly 3 from seedData)
    await page.waitForTimeout(2000); // Wait for filtered products to load
    await page.waitForSelector('.card', { timeout: 5000 });
    const filteredProducts = await page.locator('.card').count();
    expect(filteredProducts).toEqual(3);
    expect(filteredProducts).toBeLessThan(productsAfterLoadMore);

    // Step 5: Navigate to Product Details (by clicking on More Details button of a product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    // should be Coding Book (last $0 to 19 range product to be created)
    await expect(page).toHaveURL(`http://localhost:3000/product/${CODING_BOOK.slug}`);
    await expect(page.getByText(`Name : ${CODING_BOOK.name}`)).toBeVisible({ timeout: 5000 });

    // Step 6: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 7: User Logout (done after each test case already)
  });

  test("Happy Path (Filter Category + Price): For user searching for products under specific price range and category", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");

    // Step 3: Click Load More button on Home (pagination)
    await page.waitForSelector('.card', { timeout: 5000 });
    const initialProducts = await page.locator(".card").count();
    expect(initialProducts).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Load More" }).click();
    await page.waitForTimeout(2000); // Wait for new products to load
    const productsAfterLoadMore = await page.locator('.card').count();
    expect(productsAfterLoadMore).toBeGreaterThan(initialProducts);

    // Step 4: Filter by Category + Price Range (Books + $0 to $19)
    await page.getByRole("checkbox", { name: `${BOOKS.name}` }).check();
    await page.getByRole("radio", { name: "$0 to 19" }).check();
    // should have lesser product cards (exactly 2 from seedData)
    await page.waitForTimeout(2000); // Wait for filtered products to load
    await page.waitForSelector('.card', { timeout: 5000 });
    const filteredProducts = await page.locator('.card').count();
    expect(filteredProducts).toEqual(2);
    expect(filteredProducts).toBeLessThan(productsAfterLoadMore);

    // Step 5: Navigate to Product Details (by clicking on More Details button of a product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    // should be Coding Book (last Books + $0 to 19 range product to be created)
    await expect(page).toHaveURL(`http://localhost:3000/product/${CODING_BOOK.slug}`);
    await expect(page.getByText(`Name : ${CODING_BOOK.name}`)).toBeVisible({ timeout: 5000 });

    // Step 6: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 7: User Logout (done after each test case already)
  });

  test("No Results Path (Filter): For user searching for products under specific product using filter", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");

    // Step 3: Click Load More button on Home (pagination)
    await page.waitForSelector('.card', { timeout: 5000 });
    const initialProducts = await page.locator(".card").count();
    expect(initialProducts).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Load More" }).click();
    await page.waitForTimeout(2000); // Wait for new products to load
    const productsAfterLoadMore = await page.locator('.card').count();
    expect(productsAfterLoadMore).toBeGreaterThan(initialProducts);

    // Step 4: Filter by Category + Price Range (Books + $20 to $39)
    await page.getByRole("checkbox", { name: `${BOOKS.name}` }).check();
    await page.getByRole("radio", { name: "$20 to 39" }).check();
    // should have no products found
    await page.waitForTimeout(2000); // Wait for filtered products to load
    await expect(page.getByText("No products found for this filter.")).toBeVisible({ timeout: 5000 });

    // Step 5: Reset Filter
    await page.getByRole('button', { name: 'RESET FILTERS' }).click();
    // should be have more product cards (equal to initialProducts)
    await page.waitForTimeout(2000); // Wait for filter reset to load
    const productsAfterReset = await page.locator('.card').count();
    expect(productsAfterReset).toEqual(initialProducts);

    // Step 6: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 7: User Logout (done after each test case already)
  });
});