/*
  * Name: Lim Jin Yin
  * Student ID: A0256976H
*/

import { expect, test } from "@playwright/test";
import { TEST_USERS, TEST_PRODUCTS } from "./fixtures/seedData";

test.describe("Checkout Edge Cases", () => {

  test("shows empty cart message when there are no items", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cart"));
    await page.goto("/cart");

    await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
    await expect(page.getByText("Make Payment")).not.toBeVisible();
  });
  

  test("removing the last item empties the cart and clears localStorage", async ({ page }) => {
    const product = TEST_PRODUCTS[0];

    await page.goto('/');
    await page.evaluate((items) => localStorage.setItem('cart', JSON.stringify(items)), [{
      _id: product.slug || '1',
      name: product.name,
      description: product.description,
      price: product.price,
    }]);
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('You Have 1 items in your cart')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Total : $' })).toBeVisible();

    const removeBtn = page.getByRole('button', { name: 'Remove' });
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
    await expect(page.getByText(`Total : $0`)).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem('cart'));
    expect(stored === null || stored === '[]').toBeTruthy();
  });

  test("simulated payment failure keeps the cart intact (API-level)", async ({ page }) => {
    const product = TEST_PRODUCTS[0];
    const user = TEST_USERS[1];

    // seed client-side state: cart + logged-in user
    await page.goto('/');
    await page.evaluate(({ p, u }) => {
      localStorage.setItem('cart', JSON.stringify([p]));
      localStorage.setItem('auth', JSON.stringify({ user: u, token: 'fake-token' }));
  }, { p: { _id: product.slug || '1', name: product.name, description: product.description, price: product.price }, u: user });

    // stub the braintree token endpoint so the page can render DropIn if needed
    await page.route('**/api/v1/product/braintree/token', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ clientToken: 'fake-client-token' }) });
    });

    // stub the payment endpoint to simulate a server-side failure
    await page.route('**/api/v1/product/braintree/payment', route => {
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'payment failed' }) });
    });

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const res = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/v1/product/braintree/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nonce: 'fake-nonce', cart: JSON.parse(localStorage.getItem('cart') || '[]') }),
        });
        return { status: r.status, body: await r.json().catch(() => null) };
      } catch (err) {
        return { status: 0, body: null };
      }
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const stored = await page.evaluate(() => localStorage.getItem('cart'));
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(Array.isArray(parsed) && parsed.length === 1).toBeTruthy();
  });

  test("guest with items is prompted to login and returned to cart after login", async ({ page }) => {
    const product = TEST_PRODUCTS[0];
    const user = TEST_USERS[1];

    await page.goto('/');
    await page.evaluate((p) => localStorage.setItem('cart', JSON.stringify([p])), {
      _id: product.slug || '1',
      name: product.name,
      description: product.description,
      price: product.price,
    });
    await page.evaluate(() => localStorage.removeItem('auth'));

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const promptBtn = page.getByRole('button', { name: 'Please Login to checkout' });
    await expect(promptBtn).toBeVisible();

    await promptBtn.click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(user.email);
    await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
    await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(user.password);
    await page.getByRole('button', { name: 'LOGIN' }).click();

    await page.waitForURL('**/cart', { timeout: 10000 });

    await expect(page.getByText('You Have 1 items in your cart')).toBeVisible();
  });

});
