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

  test.beforeEach(async ({ page }) => {
    const apiContext = await request.newContext();
    await apiContext.post('http://localhost:6060/api/v1/test/teardown');
    await apiContext.post('http://localhost:6060/api/v1/test/seed');
    await apiContext.dispose();
    
    await page.goto(baseURL);
    await page.evaluate(() => localStorage.clear());
    
    await page.goto(`${baseURL}/login`);
    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(testUser.email);
    await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(testUser.password);
    await page.getByRole('button', { name: 'LOGIN' }).click();
    await page.waitForURL(baseURL + '/', { timeout: 10000 });
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
    await expect(orderPanels).toHaveCount(1);
    
    const firstOrder = orderPanels.first();
    
    const orderNumberCell = firstOrder.locator('td').first();
    await expect(orderNumberCell).toHaveText('1');
    
    await expect(firstOrder.getByRole('cell', { name: 'Not Processed' })).toBeVisible();
    await expect(firstOrder.getByRole('cell', { name: testUser.name })).toBeVisible();
    await expect(firstOrder.getByRole('cell', { name: 'Success' })).toBeVisible();
    
    const quantityCell = firstOrder.locator('td').nth(5);
    await expect(quantityCell).toHaveText('1');
    
    const dateCell = firstOrder.locator('td').nth(3);
    const dateText = await dateCell.textContent();
    expect(dateText || '').toMatch(/ago|seconds|minutes|hours|just now/);
  });

  test('should display product line items with correct details', async ({ page }) => {
    // Use product index 1, different card
    await createTestOrder(page, 1, '5555555555554444');
    
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    
    const firstOrder = page.locator('.border.shadow').first();
    
    const productCards = firstOrder.locator('.row.mb-2.p-3.card.flex-row');
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
    // First order: product index 2, card 1
    await createTestOrder(page, 2, '4111111111111111');
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => localStorage.setItem('cart', '[]'));
    
    await page.goto(`${baseURL}/`);
    await page.waitForResponse(/\/api\/v1\/product\/product-list\/.*/);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Second order: product index 3, different card to avoid duplicate payment block
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
    
    // Use different card for second payment
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
    await expect(orderPanels).toHaveCount(2);
    
    const firstOrderNum = await orderPanels.first().locator('td').first().textContent();
    const secondOrderNum = await orderPanels.nth(1).locator('td').first().textContent();
    
    expect(firstOrderNum || '').toBe('1'); 
    expect(secondOrderNum || '').toBe('2');
  });

  test('should display order with multiple product line items', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForResponse(/\/api\/v1\/product\/product-list\/.*/);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Add two different products (index 4 and 5)
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
    
    // Use yet another different card
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
    
    const firstOrder = page.locator('.border.shadow').first();
    
    const quantityCell = firstOrder.locator('td').nth(5);
    await expect(quantityCell).toHaveText('2');
    
    const productCards = firstOrder.locator('.row.mb-2.p-3.card.flex-row');
    await expect(productCards).toHaveCount(2);
    
    for (let i = 0; i < 2; i++) {
      const product = productCards.nth(i);
      await expect(product.locator('h4')).toBeVisible();
      await expect(product.locator('p').first()).toBeVisible();
      await expect(product.locator('p:has-text("Price:")')).toBeVisible();
    }
  });

  test('should show empty state when no orders exist', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard/user/orders`);
    await page.waitForSelector('h1:has-text("Your Orders")', { timeout: 10000 });
    
    const orderPanels = page.locator('.border.shadow');
    const count = await orderPanels.count();
    
    await expect(page.getByRole('heading', { name: 'Your Orders' })).toBeVisible();
    expect(count).toBe(0);
  });

  test('should persist orders after page refresh', async ({ page }) => {
    // Use product index 0, yet another card
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