/* Name: Kok Fangyu Inez
 * Student No: A0258672R
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/seedData.js';

const USER = TEST_USERS[1]; // Normal user

test.describe("Static Pages (About + Contact + Privacy Policy) and Page Not Found", () => {
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

  test("Static Pages: For user browsing through website/company info", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");
    // should have links to all 3 static pages
    await expect(page.getByText("About")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Contact")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Privacy Policy")).toBeVisible({ timeout: 5000 });

    // Step 3: Navigate to About page
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL("http://localhost:3000/about");
    await expect(page.getByText("Add text")).toBeVisible({ timeout: 5000 });

    // Step 4: Navigate to Contact page
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL("http://localhost:3000/contact");
    await expect(page.getByText("CONTACT US")).toBeVisible({ timeout: 5000 });

    // Step 5: Navigate to Privacy Policy page
    await page.getByRole('link', { name: 'Privacy Policy' }).click();
    await expect(page).toHaveURL("http://localhost:3000/policy");
    await expect(page.getByText("add privacy policy")).toHaveCount(7);

    // Step 6: User Logout (done after each test case already)
  });

  test("Page Not Found: For user exploring website pages through url", async ({ page }) => {
    // Step 1: User Login (done before each test case already)

    // Step 2: Navigate to Home (already done automatically after login)
    await expect(page).toHaveURL("http://localhost:3000");
    await expect(page.getByRole("button", { name: "E2E Test Normal User" })).toHaveText("E2E Test Normal User");
    // should have links to all 3 static pages
    await expect(page.getByText("About")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Contact")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Privacy Policy")).toBeVisible({ timeout: 5000 });

    // Step 3: Navigate to unknown page
    page.goto("http://localhost:3000/unknown");
    await expect(page.getByText("404")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Oops ! Page Not Found")).toBeVisible({ timeout: 5000 });

    // Step 4: Navigate back to Home page via Go Back button
    await page.getByRole('link', { name: 'Go Back' }).click();
    await expect(page).toHaveURL("http://localhost:3000");

    // Step 5: User Logout (done after each test case already)
  });
});