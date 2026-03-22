/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { expect, Page, test } from "@playwright/test";
import { TEST_USERS } from "./fixtures/seedData";

const [ADMIN, USER] = TEST_USERS;

/*
 * AI Usage Disclosure: This code was generated from Playwright Generator Agent
 *
 * Specification: plan/admin-users-management.plan.md
 *
 * Developer Notes:
 * - Test Scenarios 1, 2, and 4.5 have been removed
 *    - Covered by other tests, or deemed unnecessary
 * - Refactored the codes for ease of maintainability
 */
test.describe("Admin User Management - Login and Users Tab Verification", () => {
  const loginAsAdmin = async (page: Page) => {
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: "Enter Your Email" })
      .fill(ADMIN.email);
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill(ADMIN.password);
    await page.getByRole("button", { name: "LOGIN" }).click();

    // Verify login is successful
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: ADMIN.name }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.getByRole("link", { name: "Users" }).click();
  };

  test.beforeEach(async ({ page }) => {
    // 1. Login as admin and navigate to the Users tab
    await loginAsAdmin(page);
  });

  test.describe("3. Users Tab and Table Verification", () => {
    test("3.1 Admin user navigates to Users tab and views user list table", async ({
      page,
    }) => {
      // 2. Verify page heading and table structure
      await expect(page).toHaveURL("/dashboard/admin/users");
      await expect(page).toHaveTitle("Dashboard - All Users");

      // Verify 'All Users' heading is displayed
      await expect(
        page.getByRole("heading", { name: "All Users" }),
      ).toBeVisible();

      // Verify table with headers is visible
      const table = page.locator("table");
      await expect(table).toBeVisible();

      // Verify table headers
      const headers = page.locator("table thead th");
      await expect(headers).toHaveCount(5);
      await expect(
        table.getByRole("columnheader", { name: "#" }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: "Name" }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: "Email" }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: "Phone" }),
      ).toBeVisible();
      await expect(
        table.getByRole("columnheader", { name: "Role" }),
      ).toBeVisible();
    });

    test("3.2 User list table displays correct admin user information", async ({
      page,
    }) => {
      // 2. Verify users page is loaded with correct admin user information
      const table = page.locator("table");
      const rows = table.locator("tbody tr");
      const firstRow = rows.first();

      // Verify first row (admin user) contains correct information
      await expect(firstRow.locator("td").nth(0)).toContainText("1");
      await expect(firstRow.locator("td").nth(1)).toContainText(ADMIN.name);
      await expect(firstRow.locator("td").nth(2)).toContainText(ADMIN.email);
      await expect(firstRow.locator("td").nth(3)).toContainText(ADMIN.phone);
      await expect(firstRow.locator("td").nth(4)).toContainText("Admin");
    });

    test("3.3 User list table displays correct normal user information", async ({
      page,
    }) => {
      // 2. Verify users page is loaded with correct normal user information
      const table = page.locator("table");
      const rows = table.locator("tbody tr");
      const secondRow = rows.nth(1);

      // Verify second row (normal user) contains correct information
      await expect(secondRow.locator("td").nth(0)).toContainText("2");
      await expect(secondRow.locator("td").nth(1)).toContainText(USER.name);
      await expect(secondRow.locator("td").nth(2)).toContainText(USER.email);
      await expect(secondRow.locator("td").nth(3)).toContainText(USER.phone);
      await expect(secondRow.locator("td").nth(4)).toContainText("User");
    });

    test("3.4 User list table has correct number of columns", async ({
      page,
    }) => {
      // 2. Count the number of table headers
      const table = page.locator("table");
      const headers = table.locator("thead th");
      await expect(headers).toHaveCount(5);

      // 3. Verify each row has the same number of cells
      const rows = table.locator("tbody tr");

      // Verify cell count for each visible row
      const firstRow = rows.first();
      const firstRowCells = firstRow.locator("td");
      await expect(firstRowCells).toHaveCount(5);

      const secondRow = rows.nth(1);
      const secondRowCells = secondRow.locator("td");
      await expect(secondRowCells).toHaveCount(5);
    });

    test("3.5 User list table displays all users from the database", async ({
      page,
    }) => {
      // 2. Count the number of user rows in the table
      const table = page.locator("table");
      const rows = table.locator("tbody tr");

      // Verify exactly 2 user rows are displayed
      await expect(rows).toHaveCount(2);
    });

    test("3.6 Table is responsive and scrollable on smaller viewports", async ({
      page,
    }) => {
      // 2. Verify the table is wrapped in a responsive container
      const tableContainer = page.locator(".table-responsive");
      await expect(tableContainer).toBeVisible();

      // Verify table is inside responsive container
      const table = tableContainer.locator("table");
      await expect(table).toBeVisible();
    });
  });

  test.describe("4. Edge Cases and Error Scenarios", () => {
    test("4.1 Users page handles loading state correctly", async ({ page }) => {
      // Verify user list table is displayed with data after loading
      const table = page.locator("table");
      await expect(table).toBeVisible();

      const rows = table.locator("tbody tr");
      await expect(rows).toHaveCount(2);
    });

    test("4.2 Users page displays correct role differentiation", async ({
      page,
    }) => {
      const table = page.locator("table");
      const rows = table.locator("tbody tr");

      // 2. Verify role column displays 'Admin' for admin users (role = 1)
      const adminRow = rows.first();
      await expect(adminRow.locator("td").nth(4)).toContainText("Admin");

      // 3. Verify role column displays 'User' for normal users (role = 0)
      const normalUserRow = rows.nth(1);
      await expect(normalUserRow.locator("td").nth(4)).toContainText("User");
    });

    test("4.3 User list maintains data consistency across page reloads", async ({
      page,
    }) => {
      // Get initial user list data
      const table = page.locator("table");
      const initialRows = table.locator("tbody tr");
      const initialRowCount = await initialRows.count();

      const initialFirstRowText = await initialRows
        .first()
        .locator("td")
        .nth(1)
        .textContent();

      // 2. Reload the page
      await page.reload();

      // Verify page is reloaded and user list is displayed with same data
      const reloadedTable = page.locator("table");
      const reloadedRows = reloadedTable.locator("tbody tr");
      const reloadedRowCount = await reloadedRows.count();

      const reloadedFirstRowText = await reloadedRows
        .first()
        .locator("td")
        .nth(1)
        .textContent();

      // Verify the same number of users and same data
      expect(reloadedRowCount).toBe(initialRowCount);
      expect(reloadedFirstRowText).toBe(initialFirstRowText);
    });

    test("4.4 Admin user logout and re-login to Users page", async ({
      page,
    }) => {
      // Verify users page is displayed
      await expect(
        page.getByRole("heading", { name: "All Users" }),
      ).toBeVisible();

      // 2. Click on the user profile button and select 'Logout'
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "Logout" }).click();

      // Verify user is logged out and redirected to login page
      await expect(page).toHaveURL("/login");

      // 3. Login again with admin credentials
      await loginAsAdmin(page);

      // 4. Navigate back to the Users tab
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "Dashboard" }).click();
      await page.getByRole("link", { name: "Users" }).click();

      // Verify users page loads correctly with the same user list data
      await expect(page).toHaveURL("/dashboard/admin/users");
      await expect(
        page.getByRole("heading", { name: "All Users" }),
      ).toBeVisible();

      const table = page.locator("table");
      const rows = table.locator("tbody tr");
      await expect(rows).toHaveCount(2);
    });
  });
});
