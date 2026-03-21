/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { expect, Page, test } from "@playwright/test";
import { TEST_CATEGORIES, TEST_USERS } from "./fixtures/seedData";

const ADMIN = TEST_USERS[0];

test.describe("Admin Create Category", () => {
  const act = async (page: Page, category: string) => {
    const categoryInput = page.getByRole("textbox", {
      name: "Enter new category",
    });
    await categoryInput.click();
    await categoryInput.fill(category);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.waitForResponse("/api/v1/category/create-category");
    await expect(
      page
        .locator("div")
        .filter({ hasText: `${category} is created` })
        .nth(4),
    ).toBeVisible();
  };

  const cleanup = async (page: Page, category: string) => {
    await page.getByRole("button", { name: ADMIN.name }).click();
    await page.getByRole("link", { name: "DASHBOARD" }).click();
    await page.getByRole("link", { name: "Create Category" }).click();
    await page
      .locator("tr", { has: page.locator("td", { hasText: category }) })
      .locator("button", { hasText: /^Delete$/ })
      .click();
    await page.waitForResponse(/\/api\/v1\/category\/delete-category\/.*/);
  };

  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    await test.step("login as an admin", async () => {
      await page.getByRole("link", { name: "Login" }).click();
      const emailInput = page.getByRole("textbox", {
        name: "Enter Your Email",
      });
      await emailInput.click();
      await emailInput.fill(ADMIN.email);
      const passwordInput = page.getByRole("textbox", {
        name: "Enter Your Password",
      });
      await passwordInput.click();
      await passwordInput.fill(ADMIN.password);
      await page.getByRole("button", { name: "LOGIN" }).click();
      await page.waitForResponse("/api/v1/auth/login");
    });

    await test.step("navigate to admin dashboard → create category tab", async () => {
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Create Category" }).click();
    });
  });

  test.describe(async () => {
    const category = `Category ${new Date().getTime()}`;

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to create new category", async ({ page }) => {
      await act(page, category);

      await expect(page.getByRole("cell", { name: category })).toBeVisible();
    });
  });

  test("should not be able to create new category with same name as an existing category", async ({
    page,
  }) => {
    const category = TEST_CATEGORIES[0].name;

    const categoryInput = page.getByRole("textbox", {
      name: "Enter new category",
    });
    await categoryInput.click();
    await categoryInput.fill(category);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.waitForResponse("/api/v1/category/create-category");

    await expect(
      page.locator("div").filter({ hasText: "Category already exists" }).nth(4),
    ).toBeVisible();
    await expect(page.locator("td", { hasText: category })).toHaveCount(1);
  });

  test.describe(async () => {
    const category = `Category ${new Date().getTime()}`;

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to select new category in create product form", async ({
      page,
    }) => {
      await act(page, category);
      await page.getByRole("link", { name: "Create Product" }).click();
      await page.waitForResponse("/api/v1/category/get-category");
      await page
        .locator("div")
        .filter({ hasText: /^Select a category$/ })
        .nth(1)
        .click();

      const option = page.locator("div").filter({ hasText: category }).nth(0);
      await expect(option).toBeVisible();
      await expect(option).toBeEnabled();
    });
  });

  test.describe(async () => {
    const category = `Category ${new Date().getTime()}`;

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to select new category in all categories page", async ({
      page,
    }) => {
      await act(page, category);
      await page.getByRole("link", { name: "Categories" }).click();
      await page.getByRole("link", { name: "ALL CATEGORIES" }).click();
      await page.waitForResponse("/api/v1/category/get-category");

      const categoryButton = page.getByRole("link", { name: category });
      await expect(categoryButton).toBeVisible();
      await expect(categoryButton).toBeEnabled();
    });
  });

  test.describe(async () => {
    const category = `Category ${new Date().getTime()}`;

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to select new category in categories navbar submenu", async ({
      page,
    }) => {
      await act(page, category);
      await page.getByRole("link", { name: "Home" }).click();
      await page.waitForResponse("/api/v1/category/get-category");
      await page.getByRole("link", { name: "Categories" }).click();

      const categoryButton = page.getByRole("link", { name: category });
      await expect(categoryButton).toBeVisible();
      await expect(categoryButton).toBeEnabled();
    });
  });

  test.describe(async () => {
    const category = `Category ${new Date().getTime()}`;

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to select new category in home page filter", async ({
      page,
    }) => {
      await act(page, category);
      await page.getByRole("link", { name: "Home" }).click();
      await page.waitForResponse("/api/v1/category/get-category");

      const categoryFilter = page.getByRole("checkbox", { name: category });
      await expect(categoryFilter).toBeVisible();
      await expect(categoryFilter).toBeEnabled();
    });
  });
});
