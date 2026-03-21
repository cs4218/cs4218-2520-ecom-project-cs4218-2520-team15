/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { test, expect } from '@playwright/test';

test.describe('S7 - Add-to-cart from multiple entry points', () => {
  const testUser = {
    email: 'e2etest_normal_user@example.com',
    password: 'TestNormal@12345',
    name: 'E2E Test Normal User',
    phone: '91237654',
    address: '456 Test Street',
    answer: 'playwright',
  };

  const parsePrice = (priceText) => Number((priceText || '').replace(/[^0-9.-]/g, ''));

  const ensureNormalUserExists = async (request) => {
    await request.post('http://localhost:6060/api/v1/auth/register', {
      data: testUser,
    });
  };

  const loginViaUi = async (page) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.getByRole('button', { name: 'LOGIN' }).click();

    // Login success is represented by auth state in localStorage, not always immediate URL change.
    await page.waitForFunction(() => Boolean(localStorage.getItem('auth')), null, {
      timeout: 15000,
    });

    await page.goto('/cart');
    // Start each test from a clean cart state.
    while ((await page.getByRole('button', { name: 'Remove' }).count()) > 0) {
      await page.getByRole('button', { name: 'Remove' }).first().click();
    }
    await expect(page.getByText('Your Cart Is Empty')).toBeVisible();
  };

  const addHomeProduct = async (page) => {
    await page.goto('/');
    const homeCard = page.locator('.card').first();
    const name = (await homeCard.locator('.card-title').first().textContent())?.trim();
    const priceText = (await homeCard.locator('.card-price').first().textContent())?.trim();
    const unitPrice = parsePrice(priceText);

    await homeCard.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page.getByRole('link', { name: 'Cart' })).toContainText('1');

    return { name, unitPrice };
  };

  const addCategoryProduct = async (page) => {
    await page.getByRole('link', { name: 'Categories' }).click();
    await expect(page).toHaveURL(/\/categories$/);

    const firstCategory = page.locator('a.btn.btn-primary').first();
    await firstCategory.click();
    await expect(page).toHaveURL(/\/category\/.+/);

    const categoryCard = page.locator('.card').first();
    const name = (await categoryCard.locator('.card-title').first().textContent())?.trim();
    const priceText = (await categoryCard.locator('.card-price').first().textContent())?.trim();
    const unitPrice = parsePrice(priceText);

    await categoryCard.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page.getByRole('link', { name: 'Cart' })).toContainText('2');

    return { name, unitPrice };
  };

  const addDetailsProduct = async (page) => {
    await page.goto('/');
    const card = page.locator('.card').nth(1);
    await card.getByRole('button', { name: 'More Details' }).click();
    await expect(page).toHaveURL(/\/product\/.+/);

    const detailsName = (await page.locator('h6').filter({ hasText: 'Name :' }).textContent())?.replace('Name :', '').trim();
    const detailsPriceText = (await page.locator('h6').filter({ hasText: 'Price :' }).textContent())?.replace('Price :', '').trim();
    const unitPrice = parsePrice(detailsPriceText);

    await page.getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(page.getByRole('link', { name: 'Cart' })).toContainText('3');

    return { name: detailsName, unitPrice };
  };

  const cartTotalValue = async (page) => {
    const totalText = await page.locator('h4').filter({ hasText: 'Total :' }).textContent();
    return parsePrice(totalText);
  };

  test.beforeEach(async ({ page, request }) => {
    await ensureNormalUserExists(request);
    await loginViaUi(page);
  });

  // Tan Qin Xu, A0213002J
  test('adds from home, category listing, and product details; verifies cart items/prices/total; updates after remove', async ({ page }) => {
    const productA = await addHomeProduct(page);
    const productB = await addCategoryProduct(page);
    const productC = await addDetailsProduct(page);

    await page.goto('/cart');
    await expect(page.getByText('You Have 3 items in your cart')).toBeVisible();
    await expect(page.locator('.row.card.flex-row')).toHaveCount(3);

    // Assert all chosen product names appear in cart.
    await expect(page.locator('.row.card.flex-row')).toContainText(productA.name);
    await expect(page.locator('.row.card.flex-row')).toContainText(productB.name);
    await expect(page.locator('.row.card.flex-row')).toContainText(productC.name);

    // Assert per-item prices shown in cart match the selected products.
    const cartPriceTexts = await page.locator('.row.card.flex-row p:has-text("Price :")').allTextContents();
    const cartPrices = cartPriceTexts.map(parsePrice);
    expect(cartPrices).toContain(productA.unitPrice);
    expect(cartPrices).toContain(productB.unitPrice);
    expect(cartPrices).toContain(productC.unitPrice);

    const expectedTotal = productA.unitPrice + productB.unitPrice + productC.unitPrice;
    await expect.poll(() => cartTotalValue(page)).toBeCloseTo(expectedTotal, 2);

    // Remove one item and verify count + total update.
    const removedPrice = parsePrice(await page.locator('.row.card.flex-row p:has-text("Price :")').first().textContent());
    await page.getByRole('button', { name: 'Remove' }).first().click();
    await expect(page.getByText('You Have 2 items in your cart')).toBeVisible();
    await expect(page.locator('.row.card.flex-row')).toHaveCount(2);
    await expect.poll(() => cartTotalValue(page)).toBeCloseTo(expectedTotal - removedPrice, 2);

    // Persistence check (localStorage cart survives reload).
    await page.reload();
    await expect(page.locator('.row.card.flex-row')).toHaveCount(2);
    await expect(page.getByText('You Have 2 items in your cart')).toBeVisible();
  });

  // Tan Qin Xu, A0213002J
  test('updates cart badge and empty state after removing all items', async ({ page }) => {
    await addHomeProduct(page);
    await addCategoryProduct(page);
    await page.goto('/cart');
    await expect(page.getByText('You Have 2 items in your cart')).toBeVisible();

    while ((await page.getByRole('button', { name: 'Remove' }).count()) > 0) {
      await page.getByRole('button', { name: 'Remove' }).first().click();
    }

    await expect(page.getByText('Your Cart Is Empty')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cart' })).toContainText('0');
  });
});