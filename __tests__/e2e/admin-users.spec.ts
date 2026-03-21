import { expect, Page, test } from "@playwright/test";

import { TEST_USERS } from "./fixtures/seedData";

const ADMIN = TEST_USERS[0];
const NORMAL_USER = TEST_USERS[1];

test.describe("Admin User Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await test.step("login as an admin", async () => {
      await page.getByRole("link", { name: "Login" }).click();
      // use placeholder locators — these match the inputs in the login form
      const emailInput = page.getByPlaceholder("Enter Your Email ");
      await emailInput.click();
      await emailInput.fill(ADMIN.email);
      const passwordInput = page.getByPlaceholder("Enter Your Password");
      await passwordInput.click();
      await passwordInput.fill(ADMIN.password);
      await page.getByRole("button", { name: "LOGIN" }).click();
      await page.waitForResponse("/api/v1/auth/login");
    });
    
    await test.step("navigate to admin dashboard → users tab", async () => {
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Users" }).click();
    });

  });

test("should display list of users with correct details", async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'All Users' })).toBeVisible();

  const userRows = page.locator("table tbody tr");
    await expect(userRows).toHaveCount(2);

    // locate the specific row for each user (avoid global role collisions)
    const adminRow = page.locator("table tbody tr", { hasText: ADMIN.email }).first();
    await expect(adminRow.getByRole("cell", { name: ADMIN.name })).toBeVisible();
    await expect(adminRow.getByRole("cell", { name: ADMIN.email })).toBeVisible();
    // role is in the 5th column (index 4). Use nth() to avoid Playwright strict-mode collisions.
    await expect(adminRow.locator('td').nth(4)).toHaveText('Admin');

    const normalRow = page.locator("table tbody tr", { hasText: NORMAL_USER.email }).first();
    await expect(normalRow.getByRole("cell", { name: NORMAL_USER.name })).toBeVisible();
    await expect(normalRow.getByRole("cell", { name: NORMAL_USER.email })).toBeVisible();
    await expect(normalRow.locator('td').nth(4)).toHaveText('User');
  });

});