/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { expect, Page, test } from "@playwright/test";
import { TEST_CATEGORIES, TEST_USERS } from "./fixtures/seedData";

const ADMIN = TEST_USERS[0];

test.describe("Admin Create Product", () => {
  const category = TEST_CATEGORIES[0].name;

  const act = async (page: Page, product: string, price: string) => {
    await page
      .locator("div")
      .filter({ hasText: /^Select a category$/ })
      .nth(1)
      .click();
    await page.getByText(category).nth(1).click();
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload Photo").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles("./__mocks__/mock-img.png");
    await page.getByRole("textbox", { name: "Enter a name" }).fill(product);
    await page
      .getByRole("textbox", { name: "Enter a description" })
      .fill(`${product} is a fake item`);
    await page.getByPlaceholder("Enter a price").fill(price);
    await page.getByPlaceholder("Enter a quantity").fill("100");
    await page
      .locator("div")
      .filter({ hasText: /^Select shipping$/ })
      .nth(1)
      .click();
    await page.getByText("Yes").click();
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForResponse("/api/v1/product/create-product");
  };

  const cleanup = async (page: Page, product: string) => {
    await page.getByRole("button", { name: ADMIN.name }).click();
    await page.getByRole("link", { name: "DASHBOARD" }).click();
    await page.getByRole("link", { name: "Products" }).click();
    const productCard = page.getByRole("link", {
      name: `${product} ${product} ${product} is a fake item`,
    });
    await productCard.click();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForResponse(/\/api\/v1\/product\/delete-product\/.*/);
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

    await test.step("navigate to admin dashboard → create product tab", async () => {
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Create Product" }).click();
    });
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "9.11";

    test.afterEach(async ({ page }) => {
      await cleanup(page, product);
    });

    test("should be able to create new product", async ({ page }) => {
      await act(page, product, price);
      await page.waitForURL("**/admin/products");
      await page.waitForResponse("/api/v1/product/get-product");

      await expect(
        page.getByRole("link", {
          name: `${product} ${product} ${product} is a fake item`,
        }),
      ).toBeVisible();
    });
  });

  test("should not be able to create new product if photo exceed size limt", async ({
    page,
  }) => {
    const product = `Product ${new Date().getTime()}`;
    const price = "10.11";

    await page
      .locator("div")
      .filter({ hasText: /^Select a category$/ })
      .nth(1)
      .click();
    await page.getByText(category).nth(1).click();
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload Photo").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles("./__mocks__/mock-large-img.jpg");
    await page.getByRole("textbox", { name: "Enter a name" }).fill(product);
    await page
      .getByRole("textbox", { name: "Enter a description" })
      .fill(`${product} is a fake item`);
    await page.getByPlaceholder("Enter a price").fill(price);
    await page.getByPlaceholder("Enter a quantity").fill("100");
    await page
      .locator("div")
      .filter({ hasText: /^Select shipping$/ })
      .nth(1)
      .click();
    await page.getByText("Yes").click();

    await expect(
      page
        .locator("div")
        .filter({ hasText: "Photo size cannot exceed 1MB" })
        .nth(4),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create" }),
    ).not.toBeEnabled();
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "11.11";

    test.afterEach(async ({ page }) => {
      await cleanup(page, product);
    });

    test("should be able to view new product in category product page", async ({
      page,
    }) => {
      await act(page, product, price);
      await page.waitForURL("**/admin/products");
      await page.waitForResponse("/api/v1/product/get-product");
      await page.getByRole("link", { name: "Categories" }).click();
      await page.getByRole("link", { name: "Electronic" }).click();

      await expect(page.getByRole("heading", { name: product })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: `$${price}` }),
      ).toBeVisible();
      await expect(
        page.getByText(`${product} is a fake item...`),
      ).toBeVisible();
      await expect(page.getByRole("img", { name: product })).toBeVisible();
    });
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "12.11";

    test.afterEach(async ({ page }) => {
      await cleanup(page, product);
    });

    test("should be able to view new product in home page", async ({
      page,
    }) => {
      await act(page, product, price);
      await page.waitForURL("**/admin/products");
      await page.waitForResponse("/api/v1/product/get-product");
      await page.getByRole("link", { name: "Home" }).click();

      await expect(page.getByRole("heading", { name: product })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: `$${price}` }),
      ).toBeVisible();
      await expect(
        page.getByText(`${product} is a fake item...`),
      ).toBeVisible();
      await expect(page.getByRole("img", { name: product })).toBeVisible();
    });
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "13.11";

    test.afterEach(async ({ page }) => {
      await cleanup(page, product);
    });

    test("should be able to view new product in search page", async ({
      page,
    }) => {
      await act(page, product, price);
      await page.waitForURL("**/admin/products");
      await page.waitForResponse("/api/v1/product/get-product");
      const searchInput = page.getByRole("searchbox", { name: "Search" });
      await searchInput.click();
      await searchInput.fill(product);
      // Offset the button click cause the toast blocks it partially
      const searchButton = page.getByRole("button", { name: "Search" });
      const searchButtonBB = await searchButton.boundingBox();
      await searchButton.click({
        delay: 500,
        position: {
          // @ts-ignore
          x: searchButtonBB?.width - 2,
          // @ts-ignore
          y: searchButtonBB?.height * 0.5,
        },
      });
      await page.waitForResponse(/\/api\/v1\/product\/search\/.*/);

      await expect(page.getByRole("heading", { name: product })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: `$${price}` }),
      ).toBeVisible();
      await expect(
        page.getByText(`${product} is a fake item...`),
      ).toBeVisible();
      await expect(page.getByRole("img", { name: product })).toBeVisible();
    });
  });
});
