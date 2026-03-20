/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { expect, Page, test } from "@playwright/test";
import { TEST_USERS } from "./fixtures/seedData";

const ADMIN = TEST_USERS[0];

test.describe("Admin Update Category", () => {
  const setup = async (page: Page, category: string) => {
    const placeholder = `Placeholder ${category}`;
    await test.step("create placeholder category", async () => {
      const categoryInput = page.getByRole("textbox", {
        name: "Enter new category",
      });
      await categoryInput.click();
      await categoryInput.fill(placeholder);
      await page.getByRole("button", { name: "Submit" }).click();
    });
  };

  const act = async (page: Page, category: string) => {
    await page
      .locator("tr", {
        has: page.locator("td", { hasText: `Placeholder ${category}` }),
      })
      .locator("button", { hasText: /^Edit$/ })
      .click();
    const categoryInput = page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Enter new category" });
    await categoryInput.click();
    await categoryInput.clear();
    await categoryInput.fill(category);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit" })
      .click();

    await expect(
      page
        .locator("div")
        .filter({ hasText: `${category} is updated` })
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
    await expect(
      page.locator("div").filter({ hasText: "Category is deleted" }).nth(4),
    ).toBeVisible();
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
    });

    await test.step("navigate to admin dashboard → create category tab", async () => {
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Create Category" }).click();
    });
  });

  test.describe(async () => {
    const category = "Category A";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created category
       */
      await setup(page, category);
      await expect(
        page.getByRole("cell", { name: `Placeholder ${category}` }),
      ).toBeVisible();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to update category", async ({ page }) => {
      await act(page, category);

      await expect(page.getByRole("cell", { name: category })).toBeVisible();
      await expect(
        page.getByRole("cell", { name: `Placeholder ${category}` }),
      ).not.toBeVisible();
    });
  });

  test.describe(async () => {
    const category = "Category B";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created category
       */
      const placeholder = `Placeholder ${category}`;
      await setup(page, category);
      await expect(page.getByRole("cell", { name: placeholder })).toBeVisible();
      await page.getByRole("link", { name: "Create Product" }).click();
      await page
        .locator("div")
        .filter({ hasText: /^Select a category$/ })
        .nth(1)
        .click();
      const option = page
        .locator("div")
        .filter({ hasText: placeholder })
        .nth(0);
      await expect(option).toBeVisible();
      await expect(option).toBeEnabled();
      await page.getByRole("link", { name: "Create Category" }).click();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to select updated category in create product form", async ({
      page,
    }) => {
      await act(page, category);
      await page.getByRole("link", { name: "Create Product" }).click();
      await page
        .locator("div")
        .filter({ hasText: /^Select a category$/ })
        .nth(1)
        .click();

      const option = page.locator("div").filter({ hasText: category }).nth(0);
      await expect(option).toBeVisible();
      await expect(option).toBeEnabled();
      await expect(
        page.locator("link", { hasText: `Placeholder ${category}` }),
      ).not.toBeVisible();
    });
  });

  test.describe(async () => {
    const category = "Category C";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created category
       */
      await setup(page, category);
      await page.getByRole("link", { name: "Categories" }).click();
      await page.getByRole("link", { name: "ALL CATEGORIES" }).click();
      const categoryButton = page.getByRole("link", {
        name: `Placeholder ${category}`,
      });
      await expect(categoryButton).toBeVisible();
      await expect(categoryButton).toBeEnabled();
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Create Category" }).click();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to select updated category in all categories page", async ({
      page,
    }) => {
      await act(page, category);
      await page.getByRole("link", { name: "Categories" }).click();
      await page.getByRole("link", { name: "ALL CATEGORIES" }).click();

      const categoryButton = page.getByRole("link", { name: category });
      await expect(categoryButton).toBeVisible();
      await expect(categoryButton).toBeEnabled();
      await expect(
        page.getByRole("link", { name: `Placeholder ${category}` }),
      ).not.toBeVisible();
    });
  });

  test.describe(async () => {
    const category = "Category D";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created category
       */
      await setup(page, category);
      await page.getByRole("link", { name: "Home" }).click();
      await page.getByRole("link", { name: "Categories" }).click();
      const categoryButton = page.getByRole("link", {
        name: `Placeholder ${category}`,
      });
      await expect(categoryButton).toBeVisible();
      await expect(categoryButton).toBeEnabled();
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Create Category" }).click();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to select updated category in categories navbar submenu", async ({
      page,
    }) => {
      await act(page, category);
      await page.getByRole("link", { name: "Home" }).click();
      await page.getByRole("link", { name: "Categories" }).click();

      const categoryButton = page.getByRole("link", { name: category });
      await expect(categoryButton).toBeVisible();
      await expect(categoryButton).toBeEnabled();
      await expect(
        page.getByRole("link", { name: `Placeholder ${category}` }),
      ).not.toBeVisible();
    });
  });

  test.describe(async () => {
    const category = "Category E";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created category
       */
      await setup(page, category);
      await page.getByRole("link", { name: "Home" }).click();
      const categoryFilter = page.getByRole("checkbox", {
        name: `Placeholder ${category}`,
      });
      await expect(categoryFilter).toBeVisible();
      await expect(categoryFilter).toBeEnabled();
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Create Category" }).click();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, category);
    });

    test("should be able to select updated category in home page filter", async ({
      page,
    }) => {
      await act(page, category);
      await page.getByRole("link", { name: "Home" }).click();

      const categoryFilter = page.getByRole("checkbox", { name: category });
      await expect(categoryFilter).toBeVisible();
      await expect(categoryFilter).toBeEnabled();
      await expect(
        page.getByRole("checkbox", { name: `Placeholder ${category}` }),
      ).not.toBeVisible();
    });
  });
});
