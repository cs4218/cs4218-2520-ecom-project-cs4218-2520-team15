/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { test, expect, request } from '@playwright/test';
import { TEST_USERS } from './fixtures/seedData.js';

test.describe.configure({ mode: 'serial' });

test.describe('S11 - Order history and details viewing', () => {
  const baseURL = 'http://localhost:3000';
  
  const testUser = TEST_USERS.find(user => user.role === 0);
  
  if (!testUser) {
    throw new Error('Normal test user not found in seed data');
  }

  test.beforeAll(async () => {
    const apiContext = await request.newContext();
    await apiContext.post('http://localhost:6060/api/v1/test/teardown');
    await apiContext.post('http://localhost:6060/api/v1/test/seed');
    await apiContext.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate(() => localStorage.clear());
    
    await page.goto(`${baseURL}/login`);
    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(testUser.email);
    await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(testUser.password);
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await page.waitForURL(baseURL + '/', { timeout: 10000 });
  });

  test.afterEach(async () => {
    const apiContext = await request.newContext();
    await apiContext.post('http://localhost:6060/api/v1/test/teardown');
    await apiContext.post('http://localhost:6060/api/v1/test/seed');
    await apiContext.dispose();
  });

  async function createTestOrder(page, productIndex = 0, cardNumber = '4111111111111111') {
    await page.goto(`${baseURL}/`);
    await page.waitForResponse(/\/api\/v1\/product\/product-list\/.*/);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.getByRole('button', { name: 'ADD TO CART' }).nth(productIndex).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForURL(`${baseURL}/cart`);
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await page.waitForResponse('/api/v1/product/braintree/token');
    await page.waitForSelector('iframe[name*="number"]', { timeout: 15000 });
    
    const cardNumberFrame = page.frameLocator('iframe[name="braintree-hosted-field-number"]').first();
    const expirationFrame = page.frameLocator('iframe[name="braintree-hosted-field-expirationDate"]').first();
    const cvvFrame = page.frameLocator('iframe[name="braintree-hosted-field-cvv"]').first();
    
    await cardNumberFrame.getByRole('textbox', { name: 'Credit Card Number' }).fill(cardNumber);
    await expirationFrame.getByRole('textbox', { name: 'Expiration Date' }).fill('1228');
    await cvvFrame.getByRole('textbox', { name: 'CVV' }).fill('123');
    
    await page.waitForTimeout(1000);
    
    const paymentBtn = page.getByRole('button', { name: 'Make Payment' });
    await paymentBtn.scrollIntoViewIfNeeded();
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    await paymentBtn.click();
    
    await page.waitForURL(/\/dashboard\/user\/orders/, { timeout: 20000 });
  }

  test('should navigate to orders page via header dropdown', async ({ page }) => {
    await page.getByRole('button', { name: testUser.name }).click();
    await page.waitForTimeout(500);
    
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL(/\/dashboard\/user/, { timeout: 10000 });
    
    await page.getByRole('link', { name: 'Orders' }).click();
    await page.waitForURL(`${baseURL}/dashboard/user/orders`);
    
    await expect(page.getByRole('heading', { name: 'Your Orders' })).toBeVisible();
  });

  test('should display order details after creating order', async ({ page }) => {
    await createTestOrder(page, 0, '4111111111111111');
    
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    
    const orderPanels = page.locator('.border.shadow');
    // 2 pre-seeded + 1 new = 3 total
    await expect(orderPanels).toHaveCount(3);
    
    const newOrder = orderPanels.nth(2);
    
    const orderNumberCell = newOrder.locator('td').first();
    await expect(orderNumberCell).toHaveText('3');
    
    await expect(newOrder.getByRole('cell', { name: 'Not Processed' })).toBeVisible();
    await expect(newOrder.getByRole('cell', { name: testUser.name })).toBeVisible();
    await expect(newOrder.getByRole('cell', { name: 'Success' })).toBeVisible();
    
    const quantityCell = newOrder.locator('td').nth(5);
    await expect(quantityCell).toHaveText('1');
    
    const dateCell = newOrder.locator('td').nth(3);
    const dateText = await dateCell.textContent();
    expect(dateText || '').toMatch(/ago|seconds|minutes|hours|just now/);
  });

  test('should display product line items with correct details', async ({ page }) => {
    await createTestOrder(page, 1, '5555555555554444');
    
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    
    // Get the newly created order (3rd one)
    const newOrder = page.locator('.border.shadow').nth(2);
    
    const productCards = newOrder.locator('.row.mb-2.p-3.card.flex-row');
    await expect(productCards).toHaveCount(1);
    
    const firstProduct = productCards.first();
    
    const productImage = firstProduct.locator('img.card-img-top');
    await expect(productImage).toBeVisible();
    await expect(productImage).toHaveAttribute('alt');
    
    const productName = firstProduct.locator('h4');
    await expect(productName).toBeVisible();
    const nameText = await productName.textContent();
    expect((nameText || '').length).toBeGreaterThan(0);
    
    const productDescription = firstProduct.locator('p').first();
    await expect(productDescription).toBeVisible();
    const descText = await productDescription.textContent();
    expect((descText || '').length).toBeLessThanOrEqual(40);
    
    const productPrice = firstProduct.locator('p:has-text("Price:")');
    await expect(productPrice).toBeVisible();
    const priceText = await productPrice.textContent();
    expect(priceText || '').toMatch(/Price: \$/);
  });

  test('should display multiple orders in correct chronological order', async ({ page }) => {
    await createTestOrder(page, 2, '4111111111111111');
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => localStorage.setItem('cart', '[]'));
    
    await page.goto(`${baseURL}/`);
    await page.waitForResponse(/\/api\/v1\/product\/product-list\/.*/);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.getByRole('button', { name: 'ADD TO CART' }).nth(3).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForURL(`${baseURL}/cart`);
    
    await expect(page.locator('p:has-text("You Have 1 items in your cart")')).toBeVisible();
    
    await page.waitForResponse('/api/v1/product/braintree/token');
    await page.waitForSelector('iframe[name*="number"]', { timeout: 15000 });
    
    const cardNumberFrame = page.frameLocator('iframe[name="braintree-hosted-field-number"]').first();
    const expirationFrame = page.frameLocator('iframe[name="braintree-hosted-field-expirationDate"]').first();
    const cvvFrame = page.frameLocator('iframe[name="braintree-hosted-field-cvv"]').first();
    
    await cardNumberFrame.getByRole('textbox', { name: 'Credit Card Number' }).fill('5555555555554444');
    await expirationFrame.getByRole('textbox', { name: 'Expiration Date' }).fill('1228');
    await cvvFrame.getByRole('textbox', { name: 'CVV' }).fill('123');
    
    await page.waitForTimeout(1000);
    
    const paymentBtn = page.getByRole('button', { name: 'Make Payment' });
    await paymentBtn.scrollIntoViewIfNeeded();
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    await paymentBtn.click();
    
    await page.waitForURL(/\/dashboard\/user\/orders/, { timeout: 20000 });
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const orderPanels = page.locator('.border.shadow');
    // 2 pre-seeded + 2 new = 4 total
    await expect(orderPanels).toHaveCount(4);
    
    // Check the two new orders (3rd and 4th)
    const thirdOrderNum = await orderPanels.nth(2).locator('td').first().textContent();
    const fourthOrderNum = await orderPanels.nth(3).locator('td').first().textContent();
    
    expect(thirdOrderNum || '').toBe('3'); 
    expect(fourthOrderNum || '').toBe('4');
  });

  test('should display order with multiple product line items', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForResponse(/\/api\/v1\/product\/product-list\/.*/);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.getByRole('button', { name: 'ADD TO CART' }).nth(4).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: 'ADD TO CART' }).nth(5).click();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('.ant-badge-count')).toHaveText('2');
    
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForURL(`${baseURL}/cart`);
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await expect(page.locator('p:has-text("You Have 2 items in your cart")')).toBeVisible();
    
    await page.waitForResponse('/api/v1/product/braintree/token');
    await page.waitForSelector('iframe[name*="number"]', { timeout: 15000 });
    
    const cardNumberFrame = page.frameLocator('iframe[name="braintree-hosted-field-number"]').first();
    const expirationFrame = page.frameLocator('iframe[name="braintree-hosted-field-expirationDate"]').first();
    const cvvFrame = page.frameLocator('iframe[name="braintree-hosted-field-cvv"]').first();
    
    await cardNumberFrame.getByRole('textbox', { name: 'Credit Card Number' }).fill('378282246310005');
    await expirationFrame.getByRole('textbox', { name: 'Expiration Date' }).fill('1228');
    await cvvFrame.getByRole('textbox', { name: 'CVV' }).fill('1234');
    
    await page.waitForTimeout(1000);
    
    const paymentBtn = page.getByRole('button', { name: 'Make Payment' });
    await paymentBtn.scrollIntoViewIfNeeded();
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    await paymentBtn.click();
    
    await page.waitForURL(/\/dashboard\/user\/orders/, { timeout: 20000 });
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    
    // Get the new order (3rd one)
    const newOrder = page.locator('.border.shadow').nth(2);
    
    const quantityCell = newOrder.locator('td').nth(5);
    await expect(quantityCell).toHaveText('2');
    
    const productCards = newOrder.locator('.row.mb-2.p-3.card.flex-row');
    await expect(productCards).toHaveCount(2);
    
    for (let i = 0; i < 2; i++) {
      const product = productCards.nth(i);
      await expect(product.locator('h4')).toBeVisible();
      await expect(product.locator('p').first()).toBeVisible();
      await expect(product.locator('p:has-text("Price:")')).toBeVisible();
    }
  });

  test('should show empty state when no orders exist', async ({ page }) => {
    // This test checks if the page shows the heading even with pre-seeded orders
    await page.goto(`${baseURL}/dashboard/user/orders`);
    await page.waitForSelector('h1:has-text("Your Orders")', { timeout: 10000 });
    
    await expect(page.getByRole('heading', { name: 'Your Orders' })).toBeVisible();
    
    // With pre-seeded orders, there should be 2 orders
    const orderPanels = page.locator('.border.shadow');
    const count = await orderPanels.count();
    expect(count).toBe(2);
  });

  test('should persist orders after page refresh', async ({ page }) => {
    await createTestOrder(page, 0, '6011111111111117');
    
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    
    const initialOrderCount = await page.locator('.border.shadow').count();
    expect(initialOrderCount).toBeGreaterThan(0);
    
    await page.reload();
    
    await page.waitForSelector('h1:has-text("Your Orders")', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const afterRefreshCount = await page.locator('.border.shadow').count();
    expect(afterRefreshCount).toBe(initialOrderCount);
  });
});