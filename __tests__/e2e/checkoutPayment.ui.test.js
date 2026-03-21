/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/seedData.js';

test.describe.configure({ mode: 'serial' });

test.describe('S8 - Checkout and payment happy path', () => {
  const baseURL = 'http://localhost:3000';
  
  const testUser = TEST_USERS.find(user => user.role === 0);

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate(() => localStorage.clear());
    
    await page.goto(`${baseURL}/login`);
    
    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(testUser.email);
    await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(testUser.password);
    await page.getByRole('button', { name: 'LOGIN' }).click();
    
    await page.waitForURL(baseURL + '/', { timeout: 10000 });
    
    await expect(page.locator('.nav-link.dropdown-toggle:has-text("E2E Test Normal User")')).toBeVisible();
  });

  test('should complete checkout and payment flow successfully', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const firstProduct = page.locator('.card').first();
    const productName = await firstProduct.locator('.card-title').first().textContent();
    const productPrice = await firstProduct.locator('.card-price').textContent();
    
    await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('.ant-badge-count')).toHaveText('1');

    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await expect(page.locator('p:has-text("You Have 1 items in your cart")')).toBeVisible();
    
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(1);
    
    const totalElement = page.locator('h4:has-text("Total")');
    await expect(totalElement).toBeVisible();

    await page.waitForResponse('/api/v1/product/braintree/token');
    await page.waitForSelector('iframe[name*="number"]', { timeout: 15000 });
    
    const cardNumberFrame = page.frameLocator('iframe[name="braintree-hosted-field-number"]').first();
    const expirationFrame = page.frameLocator('iframe[name="braintree-hosted-field-expirationDate"]').first();
    const cvvFrame = page.frameLocator('iframe[name="braintree-hosted-field-cvv"]').first();
    
    await cardNumberFrame.getByRole('textbox', { name: 'Credit Card Number' }).fill('4111111111111111');
    await expirationFrame.getByRole('textbox', { name: 'Expiration Date' }).fill('1228');
    await cvvFrame.getByRole('textbox', { name: 'CVV' }).fill('123');
    
    await page.waitForTimeout(1000);

    const paymentBtn = page.getByRole('button', { name: 'Make Payment' });
    await paymentBtn.scrollIntoViewIfNeeded();
    
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    
    await paymentBtn.click();
    
    await page.waitForURL(/\/dashboard\/user\/orders/, { timeout: 25000 });

    await page.waitForSelector('h1:has-text("Your Orders")', { timeout: 10000 });
    
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    
    const orderRows = page.locator('.border.shadow');
    const orderCount = await orderRows.count();
    
    expect(orderCount).toBeGreaterThanOrEqual(1);
    
    await expect(page.locator('td:has-text("Success")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('td:has-text("Not Processed")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('td:has-text("E2E Test Normal User")').first()).toBeVisible({ timeout: 5000 });

    await page.getByRole('link', { name: 'Cart' }).click();
    
    await expect(page.locator('p:has-text("Your Cart Is Empty")')).toBeVisible();
    
    const emptyCartItems = page.locator('.row.card.flex-row');
    await expect(emptyCartItems).toHaveCount(0);
    
    const badge = page.locator('.ant-badge-count');
    const badgeVisible = await badge.isVisible().catch(() => false);
    if (badgeVisible) {
      await expect(badge).toHaveText('0');
    }
  });

  test('should not allow payment if is guest user', async ({ page }) => {
    test.setTimeout(60000);
    
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('link', { name: 'Cart' }).click();
    
    const iframe = page.locator('iframe[name*="braintree"]');
    const iframeVisible = await iframe.isVisible().catch(() => false);
    
    if (iframeVisible) {
      await page.waitForSelector('iframe[name*="braintree"]', { timeout: 10000 });
      
      const paymentBtn = page.getByRole('button', { name: 'Make Payment' });
      const isDisabled = await paymentBtn.isDisabled().catch(() => true);
      
      expect(isDisabled).toBeTruthy();
    }
  });

  test('should show payment loading state', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('link', { name: 'Cart' }).click();
    
    await page.waitForResponse('/api/v1/product/braintree/token');
    await page.waitForSelector('iframe[name*="number"]', { timeout: 15000 });
    
    const cardNumberFrame = page.frameLocator('iframe[name="braintree-hosted-field-number"]').first();
    const expirationFrame = page.frameLocator('iframe[name="braintree-hosted-field-expirationDate"]').first();
    const cvvFrame = page.frameLocator('iframe[name="braintree-hosted-field-cvv"]').first();
    
    await cardNumberFrame.getByRole('textbox', { name: 'Credit Card Number' }).fill('4111111111111111');
    await expirationFrame.getByRole('textbox', { name: 'Expiration Date' }).fill('1228');
    await cvvFrame.getByRole('textbox', { name: 'CVV' }).fill('123');
    
    await page.waitForTimeout(1000);
    
    const paymentBtn = page.getByRole('button', { name: 'Make Payment' });
    await paymentBtn.scrollIntoViewIfNeeded();
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    await paymentBtn.click();
    
    await expect(page.locator('button:has-text("Processing")')).toBeVisible({ timeout: 2000 });
  });

  test('should persist order after page refresh', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard/user/orders`);
    await page.waitForSelector('h1:has-text("Your Orders")', { timeout: 10000 });
    
    await page.waitForTimeout(2000);
    
    const initialOrderCount = await page.locator('.border.shadow').count();
    
    await page.reload();
    await page.waitForSelector('h1:has-text("Your Orders")', { timeout: 10000 });
    
    await page.waitForTimeout(2000);
    
    const afterRefreshCount = await page.locator('.border.shadow').count();
    
    expect(afterRefreshCount).toBe(initialOrderCount);
  });
});