/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { expect, Page, test } from "@playwright/test";
import {
  TEST_CATEGORIES,
  TEST_PRODUCTS,
  TEST_USERS,
} from "./fixtures/seedData";

const ADMIN = TEST_USERS[0];

test.describe("Admin Update Product", () => {
  const category = TEST_CATEGORIES[0].name;

  const setup = async (page: Page, product: string, price: string) => {
    await page.getByRole("link", { name: "Create Product" }).click();
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
    await page
      .getByRole("textbox", { name: "Enter a name" })
      .fill(`Placeholder ${product}`);
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
    await page.waitForURL("**/admin/products");
    await page.waitForResponse("/api/v1/product/get-product");
  };

  const act = async (page: Page, product: string) => {
    await page
      .getByRole("link", {
        name: `Placeholder ${product} Placeholder ${product} ${product} is a fake item`,
      })
      .click();
    await page.waitForResponse(/\/api\/v1\/product\/get-product\/.*/);
    const nameInput = page.getByRole("textbox", { name: "Enter a name" });
    await nameInput.clear();
    await nameInput.fill(product);
    await page.getByRole("button", { name: "Update" }).click();
    await page.waitForResponse(/\/api\/v1\/product\/update-product\/.*/);
    await page.waitForURL("**/admin/products");
    await page.waitForResponse("/api/v1/product/get-product");
  };

  const cleanup = async (page: Page, product: string) => {
    await page.getByRole("button", { name: ADMIN.name }).click();
    await page.getByRole("link", { name: "DASHBOARD" }).click();
    await page.getByRole("link", { name: "Products" }).click();
    await page
      .getByRole("link", {
        name: `${product} ${product} ${product} is a fake item`,
      })
      .click();
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

    await test.step("navigate to admin dashboard → products tab", async () => {
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Products" }).click();
    });
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "9.12";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created product
       */
      await setup(page, product, price);
      await expect(
        page.getByRole("link", {
          name: `Placeholder ${product} Placeholder ${product} ${product} is a fake item`,
        }),
      ).toBeVisible();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, product);
    });

    test("should be able to update product", async ({ page }) => {
      await act(page, product);

      await expect(
        page.getByRole("link", {
          name: `${product} ${product} ${product} is a fake item`,
        }),
      ).toBeVisible();
    });
  });

  test("should do nothing if photo exceed size limit", async ({ page }) => {
    const product = TEST_PRODUCTS[0];

    await page
      .getByRole("link", {
        name: `${product.name} ${product.name} ${product.description}`,
      })
      .click();
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload Photo").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles("./__mocks__/mock-large-img.jpg");
    await expect(
      page
        .locator("div")
        .filter({ hasText: "Photo size cannot exceed 1MB" })
        .nth(4),
    ).toBeVisible();
    await page.getByRole("button", { name: "Update" }).click();
    await page.waitForResponse(/\/api\/v1\/product\/update-product\/.*/);
    await page.waitForURL("**/admin/products");
    await page.waitForResponse("/api/v1/product/get-product");

    await expect(
      page.getByRole("link", {
        name: `${product.name} ${product.name} ${product.description}`,
      }),
    ).toBeVisible();
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "11.12";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created product
       */
      await setup(page, product, price);
      await page.getByRole("link", { name: "Categories" }).click();
      await page.getByRole("link", { name: "Electronic" }).click();
      await expect(
        page.getByRole("heading", { name: `Placeholder ${product}` }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: `$${price}` }),
      ).toBeVisible();
      await expect(
        page.getByText(`${product} is a fake item...`),
      ).toBeVisible();
      await expect(page.getByRole("img", { name: product })).toBeVisible();
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Products" }).click();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, product);
    });

    test("should be able to view updated product in category product page", async ({
      page,
    }) => {
      await act(page, product);
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
    const price = "12.12";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created product
       */
      await setup(page, product, price);
      await page.getByRole("link", { name: "Home" }).click();
      await expect(
        page.getByRole("heading", { name: `Placeholder ${product}` }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: `$${price}` }),
      ).toBeVisible();
      await expect(
        page.getByText(`${product} is a fake item...`),
      ).toBeVisible();
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Products" }).click();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, product);
    });

    test("should be able to view updated product in home page", async ({
      page,
    }) => {
      await act(page, product);
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
    const price = "13.12";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-update state is correct since
       * we are using a newly created product
       */
      await setup(page, product, price);
      const searchInput = page.getByRole("searchbox", { name: "Search" });
      await searchInput.click();
      await searchInput.fill(`Placeholder ${product}`);
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
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Products" }).click();
    });

    test.afterEach(async ({ page }) => {
      await cleanup(page, product);
    });

    test("should be able to view updated product in search page", async ({
      page,
    }) => {
      await act(page, product);
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
