/* Name: Lee Guan Kai Delon
 * Student No: A0273286W
 */

import { expect, Page, request, test } from "@playwright/test";
import {
  TEST_CATEGORIES,
  TEST_PRODUCTS,
  TEST_USERS,
} from "./fixtures/seedData";

const [ADMIN, USER] = TEST_USERS;

test.describe("Admin Delete Product", () => {
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
    await page.waitForURL("**/admin/products");
    await page.waitForResponse("/api/v1/product/get-product");
  };

  const act = async (page: Page, product: string) => {
    await page
      .getByRole("link", {
        name: `${product} ${product} ${product} is a fake item`,
      })
      .click();
    await page.waitForResponse(/\/api\/v1\/product\/get-product\/.*/);
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
      /* Check that the pre-delete state is correct since
       * we are using a newly created product
       */
      await setup(page, product, price);
      await expect(
        page.getByRole("link", {
          name: `${product} ${product} ${product} is a fake item`,
        }),
      ).toBeVisible();
    });

    test("should be able to delete product", async ({ page }) => {
      await act(page, product);
      await page.waitForResponse("/api/v1/product/get-product");

      await expect(
        page.getByRole("link", {
          name: `${product} ${product} ${product} is a fake item`,
        }),
      ).not.toBeVisible();
    });
  });

  test.describe(async () => {
    const product = TEST_PRODUCTS[0];

    test.beforeEach(async ({ page }) => {
      await test.step("logout as an admin", async () => {
        await page.getByRole("button", { name: ADMIN.name }).click();
        await page.getByRole("link", { name: "LOGOUT" }).click();
      });

      await test.step("login as a normal user", async () => {
        await page.getByRole("link", { name: "Login" }).click();
        const emailInput = page.getByRole("textbox", {
          name: "Enter Your Email",
        });
        await emailInput.click();
        await emailInput.fill(USER.email);
        const passwordInput = page.getByRole("textbox", {
          name: "Enter Your Password",
        });
        await passwordInput.click();
        await passwordInput.fill(USER.password);
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.waitForResponse("/api/v1/auth/login");
      });

      await test.step("place an order", async () => {
        await page.getByRole("link", { name: "Home" }).click();
        await page.waitForResponse(/\/api\/v1\/product\/product-list\/.*/);
        await page.getByRole("button", { name: "ADD TO CART" }).nth(5).click(); // First item in TEST_PRODUCTS
        await page.getByRole("link", { name: "Cart" }).click();
        await page.waitForResponse("/api/v1/product/braintree/token");
        await page.getByRole("button", { name: "Paying with Card" }).click();
        const creditCardInput = page
          .locator('iframe[name="braintree-hosted-field-number"]')
          .contentFrame()
          .getByRole("textbox", { name: "Credit Card Number" });
        await creditCardInput.click();
        await creditCardInput.fill("4096362186971710");
        const expirationInput = page
          .locator('iframe[name="braintree-hosted-field-expirationDate"]')
          .contentFrame()
          .getByRole("textbox", { name: "Expiration Date" });
        await expirationInput.click();
        await expirationInput.fill(
          `01${(new Date().getFullYear() + 5).toString().substring(2)}`,
        );
        const cvvInput = page
          .locator('iframe[name="braintree-hosted-field-cvv"]')
          .contentFrame()
          .getByRole("textbox", { name: "CVV" });
        await cvvInput.click();
        await cvvInput.fill("011");
        await page.getByRole("button", { name: "Make Payment" }).click();
        await page.waitForResponse("/api/v1/product/braintree/payment");
      });

      await test.step("logout as a normal user", async () => {
        await page.getByRole("button", { name: USER.name }).click();
        await page.getByRole("link", { name: "LOGOUT" }).click();
      });

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
        await page.waitForResponse("/api/v1/product/get-product");
      });
    });

    test.afterEach(async () => {
      // Re-seed the database since there is no way to delete orders created
      const apiContext = await request.newContext();
      await apiContext.post("http://localhost:6060/api/v1/test/teardown");
      await apiContext.post("http://localhost:6060/api/v1/test/seed");
      await apiContext.dispose();
    });

    test("should not be able to delete product if has associated orders", async ({
      page,
    }) => {
      await page
        .getByRole("link", {
          name: `${product.name} ${product.name} ${product.description}`,
        })
        .click();
      await page.waitForResponse(/\/api\/v1\/product\/get-product\/.*/);
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForResponse(/\/api\/v1\/product\/delete-product\/.*/);
      await expect(
        page.locator("div").filter({ hasText: "Something went wrong" }).nth(4),
      ).toBeVisible();
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("link", { name: "Products" }).click();

      await expect(
        page.getByRole("link", {
          name: `${product.name} ${product.name} ${product.description}`,
        }),
      ).toBeVisible();
    });
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "11.12";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-delete state is correct since
       * we are using a newly created product
       */
      await setup(page, product, price);
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
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Products" }).click();
    });

    test("should not be able to view deleted product in category product page", async ({
      page,
    }) => {
      await act(page, product);
      await page.getByRole("link", { name: "Categories" }).click();
      await page.getByRole("link", { name: "Electronic" }).click();
      await page.waitForResponse(/\/api\/v1\/product\/product-category\/.*/);

      await expect(
        page.getByRole("heading", { name: product }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("heading", { name: `$${price}` }),
      ).not.toBeVisible();
      await expect(
        page.getByText(`${product} is a fake item...`),
      ).not.toBeVisible();
      await expect(page.getByRole("img", { name: product })).not.toBeVisible();
    });
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "12.12";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-delete state is correct since
       * we are using a newly created product
       */
      await setup(page, product, price);
      await page.getByRole("link", { name: "Home" }).click();
      await expect(page.getByRole("heading", { name: product })).toBeVisible();
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

    test("should not be able to view deleted product in home page", async ({
      page,
    }) => {
      await act(page, product);
      await page.getByRole("link", { name: "Home" }).click();
      await page.waitForResponse(/\/api\/v1\/product\/product-list\/.*/);

      await expect(
        page.getByRole("heading", { name: product }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("heading", { name: `$${price}` }),
      ).not.toBeVisible();
      await expect(
        page.getByText(`${product} is a fake item...`),
      ).not.toBeVisible();
      await expect(page.getByRole("img", { name: product })).not.toBeVisible();
    });
  });

  test.describe(async () => {
    const product = `Product ${new Date().getTime()}`;
    const price = "13.12";

    test.beforeEach(async ({ page }) => {
      /* Check that the pre-delete state is correct since
       * we are using a newly created product
       */
      await setup(page, product, price);
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
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Products" }).click();
    });

    test("should not be able to view deleted product in search page", async ({
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

      await expect(
        page.getByRole("heading", { name: "No Products Found" }),
      ).toBeVisible();
    });
  });
});
