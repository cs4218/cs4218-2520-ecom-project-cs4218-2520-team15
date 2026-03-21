/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_PRODUCTS, TEST_CATEGORIES } from './fixtures/seedData.js';

const USER = TEST_USERS[1]; // Normal user

const ELECTRONICS = TEST_CATEGORIES[0];
const COSMETICS = TEST_CATEGORIES[3];
const CLOTHING = TEST_CATEGORIES[1];

const TAMAGOTCHI = TEST_PRODUCTS[8];
const LAPTOP = TEST_PRODUCTS[0];
const NUS_TSHIRT = TEST_PRODUCTS[5];

test.describe("Product Browsing (Home + Category Product + Product Detail Pages)", () => {
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

  test("Happy Path: For user looking for specific category of products", async ({ page }) => {
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

    // Step 4: Navigate to Category (Electronics)
    await page.getByRole("link", { name: "Categories" }).click();
    await page.getByRole('link', { name: `${ELECTRONICS.name}` }).click();
    await expect(page).toHaveURL(`http://localhost:3000/category/${ELECTRONICS.slug}`);
    await expect(page.getByText(`Category - ${ELECTRONICS.name}`)).toBeVisible({ timeout: 5000 });

    // Step 5: Click Load More button on Category
    await page.waitForSelector('.card', { timeout: 5000 });
    const initialCategoryProducts = await page.locator('.card').count();
    expect(initialCategoryProducts).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Load More" }).click();
    await page.waitForTimeout(2000); // Wait for new products to load
    const categoryProductsAfterLoadMore = await page.locator('.card').count();
    expect(categoryProductsAfterLoadMore).toBeGreaterThan(initialCategoryProducts);

    // Step 6: Navigate to Product Details (by clicking on More Details button of a product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    // should be Tamagotchi (last electronics to be created)
    await expect(page).toHaveURL(`http://localhost:3000/product/${TAMAGOTCHI.slug}`);
    await expect(page.getByText(`Name : ${TAMAGOTCHI.name}`)).toBeVisible({ timeout: 5000 });

    // Step 7: Navigate to Product Details of Related Product (by clicking on More Details button of a listed related product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    // should be Laptop (first electronics to be created)
    await expect(page).toHaveURL(`http://localhost:3000/product/${LAPTOP.slug}`);
    await expect(page.getByText(`Name : ${LAPTOP.name}`)).toBeVisible({ timeout: 5000 });

    // Step 8: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 9: User Logout (done after each test case already)
  });

  test("Empty Category Path: For user looking for specific category of products but no products under it", async ({ page }) => {
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

    // Step 4: Navigate to Category (Cosmetics)
    await page.getByRole("link", { name: "Categories" }).click();
    await page.getByRole('link', { name: `${COSMETICS.name}` }).click();
    await expect(page).toHaveURL(`http://localhost:3000/category/${COSMETICS.slug}`);
    await expect(page.getByText(`Category - ${COSMETICS.name}`)).toBeVisible({ timeout: 5000 });
    // should have no products under cosmetics
    const initialCategoryProducts = await page.locator('.card').count();
    expect(initialCategoryProducts).toEqual(0);

    // Step 5: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 6: User Logout (done after each test case already)
  });

  test("No Related Products Path: For user looking for specific category of products but no related products", async ({ page }) => {
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

    // Step 4: Navigate to Category (Clothing)
    await page.getByRole("link", { name: "Categories" }).click();
    await page.getByRole('link', { name: `${CLOTHING.name}` }).click();
    await expect(page).toHaveURL(`http://localhost:3000/category/${CLOTHING.slug}`);
    await expect(page.getByText(`Category - ${CLOTHING.name}`)).toBeVisible({ timeout: 5000 });

    // Step 5: Navigate to Product Details (by clicking on More Details button of a product)
    await page.getByRole('button', { name: 'More Details' }).first().click();
    // should be NUS T-Shirt (only clothing)
    await expect(page).toHaveURL(`http://localhost:3000/product/${NUS_TSHIRT.slug}`);
    await expect(page.getByText(`Name : ${NUS_TSHIRT.name}`)).toBeVisible({ timeout: 5000 });
    // should have no related products
    await expect(page.getByText("No Similar Products found")).toBeVisible({ timeout: 5000 });
    const relatedProductCount = await page.locator('.similar-products .card').count();
    expect(relatedProductCount).toEqual(0);

    // Step 6: Naviagte back to Home (simulate not wanting to get anything)
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 7: User Logout (done after each test case already)
  });
});
