/*
  * Name: Lim Jin Yin
  * Student ID: A0256976H
*/

import { expect, Page, test } from "@playwright/test";
import { TEST_USERS, TEST_PRODUCTS, TEST_ORDERS } from "./fixtures/seedData";

const ADMIN = TEST_USERS[0];

const SUCCESS_ORDER_SEEDED = TEST_ORDERS.find((o) => o.payment.success === true)!;
const FAILED_ORDER_SEEDED  = TEST_ORDERS.find((o) => o.payment.success === false)!;

const SUCCESS_ORDER_SEEDED_STATUS = SUCCESS_ORDER_SEEDED.status;
const FAILED_ORDER_SEEDED_STATUS  = FAILED_ORDER_SEEDED.status;

test.describe("Admin Order Management", () => {
    
  const getOrderBlock = (page: Page, paymentText: "Success" | "Failed") =>
    page
      .locator(".border.shadow")
      .filter({ has: page.locator("tbody tr td", { hasText: paymentText }) });

  const changeStatus = async (
    page: Page,
    payment: "Success" | "Failed",
    newStatus: string,
  ) => {
    const orderBlock = getOrderBlock(page, payment);

    // The current status text inside the table cell is the dropdown trigger.
    // Click the specific status cell (avoid global role collisions).
    const currentStatusCell = orderBlock.locator("tbody tr td").nth(1);
    const currentStatus = (await currentStatusCell.textContent())?.trim();
    await currentStatusCell.click();

    // Ant Design renders the dropdown outside the orderBlock; scope to the
    // visible dropdown and click the option element with matching title.
    const dropdown = page.locator('.ant-select-dropdown').filter({ hasText: newStatus }).first();
    await expect(dropdown).toBeVisible();

    const option = dropdown.locator(`.ant-select-item[title="${newStatus}"]`).first();
    await expect(option).toBeVisible();
    await option.click();

    // Wait for the cell to reflect the new value after handleChange re-fetches
    await expect(orderBlock.getByRole("cell", { name: newStatus })).toBeVisible();
    await page.waitForLoadState("networkidle");
  };

  const resetStatus = async (
    page: Page,
    payment: "Success" | "Failed",
    originalStatus: string,
  ) => {
    await changeStatus(page, payment, originalStatus);
  };

  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    await test.step("login as an admin", async () => {
      await page.getByRole("link", { name: "Login" }).click();
      const emailInput = page.getByRole("textbox", { name: "Enter Your Email" });
      await emailInput.click();
      await emailInput.fill(ADMIN.email);
      const passwordInput = page.getByRole("textbox", { name: "Enter Your Password" });
      await passwordInput.click();
      await passwordInput.fill(ADMIN.password);
      await page.getByRole("button", { name: "LOGIN" }).click();
    });

    await test.step("navigate to admin dashboard → orders tab", async () => {
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "Dashboard" }).click();
      await page.getByRole("link", { name: "Orders" }).click();
    });
  });

  test("should display the All Orders heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "All Orders" })
    ).toBeVisible();
  });

  test("should display one order block per seeded order", async ({ page }) => {
    await expect(page.locator(".border.shadow")).toHaveCount(TEST_ORDERS.length);
  });

  test("should display the buyer name in each order block", async ({ page }) => {
    const buyerName = TEST_USERS[1].name;
    const blocks = page.locator(".border.shadow");
    const count = await blocks.count();

    for (let i = 0; i < count; i++) {
      await expect(blocks.nth(i).getByText(buyerName)).toBeVisible();
    }
  });

  test("should display 'Success' for a successful payment and 'Failed' for a failed payment", async ({ page }) => {
    await expect(
      getOrderBlock(page, "Success").locator("tbody tr td").nth(4)
    ).toHaveText("Success");
    await expect(
      getOrderBlock(page, "Failed").locator("tbody tr td").nth(4)
    ).toHaveText("Failed");
  });

  test("should display the correct product count as Quantity for each order", async ({ page }) => {
    await expect(
      getOrderBlock(page, "Success").locator("tbody tr td").nth(5)
    ).toHaveText(String(SUCCESS_ORDER_SEEDED.productSlugs.length));
    await expect(
      getOrderBlock(page, "Failed").locator("tbody tr td").nth(5)
    ).toHaveText(String(FAILED_ORDER_SEEDED.productSlugs.length));
  });

  test("should display a relative date for each order", async ({ page }) => {
    // Since both orders are seeded at the same time, checking one is sufficient
    // since the assertion is about format, not value
    const dateCell = getOrderBlock(page, "Success").locator("tbody tr td").nth(3);
    const dateText = await dateCell.textContent();

    expect(dateText).toBeTruthy();
    expect(dateText).not.toMatch(/^\d{4}-\d{2}-\d{2}T/); // not a raw ISO string
    expect(dateText).toMatch(/ago|just now|seconds/); // moment relative format
  });

  test("should show the seeded status as the default value in each dropdown", async ({ page }) => {
    await expect(
      getOrderBlock(page, "Success").getByRole("cell", { name: SUCCESS_ORDER_SEEDED_STATUS })
    ).toBeVisible();
    await expect(
      getOrderBlock(page, "Failed").getByRole("cell", { name: FAILED_ORDER_SEEDED_STATUS })
    ).toBeVisible();
  });

  test("should list all five valid status options in the dropdown", async ({ page }) => {
    const currentStatus = await getOrderBlock(page, "Success")
      .locator("tbody tr td").nth(1).textContent();
    await getOrderBlock(page, "Success")
      .getByRole("cell", { name: currentStatus!.trim() }).click();

    const dropdown = page.locator('.ant-select-dropdown').first();
    await expect(dropdown).toBeVisible();

    const expectedOptions = [
      'Not Processed',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled',
    ];

    for (const opt of expectedOptions) {
      await expect(dropdown.getByTitle(opt).first()).toBeVisible();
    }

    await page.keyboard.press("Escape");
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetStatus(page, "Success", "Not Processed");
    });

    test("should transition from Not Processed to Processing", async ({ page }) => {
      await changeStatus(page, "Success", "Processing");

      await expect(
        getOrderBlock(page, "Success").getByRole("cell", { name: "Processing" })
      ).toBeVisible();
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetStatus(page, "Success", "Not Processed");
    });

    test("should transition from Processing to Shipped", async ({ page }) => {
      await changeStatus(page, "Success", "Processing"); // from seeded state to intermediate state
      await changeStatus(page, "Success", "Shipped"); // from intermediate state to next state

      await expect(
        getOrderBlock(page, "Success").getByRole("cell", { name: "Shipped" })
      ).toBeVisible();
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetStatus(page, "Success", "Not Processed");
    });

    test("should transition from Shipped to Delivered", async ({ page }) => {
      await changeStatus(page, "Success", "Processing");
      await changeStatus(page, "Success", "Shipped");
      await changeStatus(page, "Success", "Delivered");

      await expect(
        getOrderBlock(page, "Success").getByRole("cell", { name: "Delivered" })
      ).toBeVisible();
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetStatus(page, "Success", "Not Processed");
    });

    test("should transition from Not Processed to Cancelled", async ({ page }) => {
      await changeStatus(page, "Success", "Cancelled");

      await expect(
        getOrderBlock(page, "Success").getByRole("cell", { name: "Cancelled" })
      ).toBeVisible();
    });
  });

  // test confirms that the controller does not enforce terminal state guards 
  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetStatus(page, "Success", "Not Processed");
    });

    test("should permit a status change from a terminal state (Delivered → Processing)", async ({ page }) => {
      await changeStatus(page, "Success", "Delivered");
      await changeStatus(page, "Success", "Processing"); // delivered to processing

      await expect(
        getOrderBlock(page, "Success").getByRole("cell", { name: "Processing" })
      ).toBeVisible();
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetStatus(page, "Success", "Not Processed");
    });

    test("should keep the same status when the current value is reselected", async ({ page }) => {
      await changeStatus(page, "Success", "Not Processed");

      await expect(
        getOrderBlock(page, "Success").getByRole("cell", { name: "Not Processed" })
      ).toBeVisible();
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetStatus(page, "Failed", FAILED_ORDER_SEEDED_STATUS);
    });

    test("should update one order without affecting the other", async ({ page }) => {
      await changeStatus(page, "Failed", "Cancelled");

      // Target order moved to Cancelled
      await expect(
        getOrderBlock(page, "Failed").getByRole("cell", { name: "Cancelled" })
      ).toBeVisible();

      // Other order remains at its seeded state — check the status cell text
      const successBlock = getOrderBlock(page, "Success");
      await expect(
        successBlock.locator("tbody tr td").nth(1)
      ).toHaveText(SUCCESS_ORDER_SEEDED_STATUS);
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetStatus(page, "Success", "Not Processed");
    });

    test("should persist the updated status after navigating away and returning", async ({ page }) => {
      await changeStatus(page, "Success", "Shipped");

      await page.getByRole("link", { name: "Home" }).click();
      await page.getByRole("button", { name: ADMIN.name }).click();
      await page.getByRole("link", { name: "Dashboard" }).click();
      await page.getByRole("link", { name: "Orders" }).click();

      await expect(
        getOrderBlock(page, "Success").getByRole("cell", { name: "Shipped" })
      ).toBeVisible();
    });
  });

  test("should render a product card for each product in an order", async ({ page }) => {
    await expect(
      getOrderBlock(page, "Success").locator(".card.flex-row")
    ).toHaveCount(SUCCESS_ORDER_SEEDED.productSlugs.length);
  });

  test("should render the product price with a dollar sign on each card", async ({ page }) => {
    const laptopPrice = TEST_PRODUCTS.find((p) => p.slug === "laptop")!.price;

    await expect(
      getOrderBlock(page, "Success").getByText(`Price: $${laptopPrice}`)
    ).toBeVisible();
  });

  test("should render a truncated description of at most 30 characters on each card", async ({ page }) => {
    const laptopDesc = TEST_PRODUCTS.find((p) => p.slug === "laptop")!.description;
    const firstCard  = getOrderBlock(page, "Success").locator(".card.flex-row").first();
    const descText   = await firstCard.locator("p").first().textContent();

    expect(descText).toBe(laptopDesc.substring(0, 30));
  });

});