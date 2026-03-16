/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { test, expect } from '@playwright/test';

test.describe('S11 - Order history and details viewing', () => {
  const baseURL = 'http://localhost:3000';
  const testUser = {
    email: 'abc@gmail.com',
    password: 'abc123'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate(() => localStorage.clear());
    
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:has-text("LOGIN")');
    await page.waitForURL(baseURL + '/', { timeout: 10000 });
    
    await page.evaluate(async () => {
      const auth = JSON.parse(localStorage.getItem('auth'));
      if (auth?.token) {
        try {
          const response = await fetch('http://localhost:6060/api/v1/auth/orders', {
            method: 'DELETE',
            headers: {
              'Authorization': auth.token
            }
          });
          console.log('Delete orders response:', response.status);
        } catch (error) {
          console.log('Delete orders error:', error);
        }
      }
    });
    
    await page.waitForTimeout(500);
  });

  async function createTestOrder(page) {
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const firstProduct = page.locator('.card').first();
    await firstProduct.locator('button:has-text("ADD TO CART")').click();
    await page.waitForTimeout(1000);
    
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    const updateAddressBtn = page.locator('button:has-text("Update Address")');
    const updateBtnVisible = await updateAddressBtn.isVisible().catch(() => false);
    
    if (updateBtnVisible) {
      await page.locator('a.nav-link.dropdown-toggle:has-text("testing")').click();
      await page.waitForTimeout(500);
      await page.locator('a.dropdown-item:has-text("Dashboard")').click();
      await page.waitForURL(/\/dashboard\/user/, { timeout: 10000 });
      
      await page.click('a:has-text("Profile")');
      await page.waitForURL(/\/dashboard\/user\/profile/);
      
      await page.waitForSelector('input#profile-address', { timeout: 5000 });
      await page.fill('input#profile-address', '123 Test Street, Singapore');
      await page.click('button:has-text("UPDATE")');
      await page.waitForTimeout(2000);
      
      await page.click('.nav-link:has-text("Cart")');
      await page.waitForURL(`${baseURL}/cart`);
    }
    
    await page.waitForSelector('.braintree-options-list', { timeout: 15000 });
    const cardOption = page.locator('.braintree-option__label:has-text("Card")');
    await cardOption.click();
    await page.waitForTimeout(2000);
    
    const cardNumberFrame = page.frameLocator('iframe[name*="number"]').first();
    const expirationFrame = page.frameLocator('iframe[name*="expiration"]').first();
    const cvvFrame = page.frameLocator('iframe[name*="cvv"]').first();
    
    await cardNumberFrame.locator('#credit-card-number').fill('4111111111111111');
    await expirationFrame.locator('#expiration').fill('1228');
    await cvvFrame.locator('#cvv').fill('123');
    
    try {
      const postalFrame = page.frameLocator('iframe[name*="postal"]').first();
      await postalFrame.locator('#postal-code').fill('12345', { timeout: 2000 });
    } catch (e) {
      // Postal code not required
    }
    
    await page.waitForTimeout(1000);
    
    const paymentBtn = page.locator('button:has-text("Make Payment")');
    await paymentBtn.scrollIntoViewIfNeeded();
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    await paymentBtn.click();
    
    await page.waitForURL(/\/dashboard\/user\/orders/, { timeout: 20000 });
  }

  test('should navigate to orders page via header dropdown', async ({ page }) => {
    await page.locator('a.nav-link.dropdown-toggle:has-text("testing")').click();
    await page.waitForTimeout(500);
    
    await page.locator('a.dropdown-item:has-text("Dashboard")').click();
    await page.waitForURL(/\/dashboard\/user/, { timeout: 10000 });
    
    await page.click('a:has-text("Orders")');
    await page.waitForURL(`${baseURL}/dashboard/user/orders`);
    
    await expect(page.locator('h1:has-text("Your Orders")')).toBeVisible();
  });

  test('should navigate to orders page via UserMenu', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard/user`);
    await page.waitForSelector('.list-group', { timeout: 10000 });
    
    await page.click('a.list-group-item:has-text("Orders")');
    await page.waitForURL(`${baseURL}/dashboard/user/orders`);
    
    await expect(page.locator('h1:has-text("Your Orders")')).toBeVisible();
  });

  test('should display order details after creating order', async ({ page }) => {
    await createTestOrder(page);
    
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    
    const orderPanels = page.locator('.border.shadow');
    await expect(orderPanels).toHaveCount(1);
    
    const firstOrder = orderPanels.first();
    
    const orderNumberCell = firstOrder.locator('td').first();
    await expect(orderNumberCell).toHaveText('1');
    
    await expect(firstOrder.locator('td:has-text("Not Processed")')).toBeVisible();
    await expect(firstOrder.locator('td:has-text("testing")')).toBeVisible();
    await expect(firstOrder.locator('td:has-text("Success")')).toBeVisible();
    
    const quantityCell = firstOrder.locator('td').nth(5);
    await expect(quantityCell).toHaveText('1');
    
    const dateCell = firstOrder.locator('td').nth(3);
    const dateText = await dateCell.textContent();
    expect(dateText).toMatch(/ago|seconds|minutes|hours|just now/);
  });

  test('should display product line items with correct details', async ({ page }) => {
    await createTestOrder(page);
    
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
    expect(nameText.length).toBeGreaterThan(0);
    
    const productDescription = firstProduct.locator('p').first();
    await expect(productDescription).toBeVisible();
    const descText = await productDescription.textContent();
    expect(descText.length).toBeLessThanOrEqual(40);
    
    const productPrice = firstProduct.locator('p:has-text("Price:")');
    await expect(productPrice).toBeVisible();
    expect(await productPrice.textContent()).toMatch(/Price: \$/);
  });

  test('should display multiple orders in correct chronological order', async ({ page }) => {
    await createTestOrder(page);
    
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const secondProduct = page.locator('.card').nth(1);
    await secondProduct.locator('button:has-text("ADD TO CART")').click();
    await page.waitForTimeout(1000);
    
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    
    await page.waitForSelector('.braintree-options-list', { timeout: 15000 });
    const cardOption = page.locator('.braintree-option__label:has-text("Card")');
    await cardOption.click();
    await page.waitForTimeout(2000);
    
    const cardNumberFrame = page.frameLocator('iframe[name*="number"]').first();
    const expirationFrame = page.frameLocator('iframe[name*="expiration"]').first();
    const cvvFrame = page.frameLocator('iframe[name*="cvv"]').first();
    
    await cardNumberFrame.locator('#credit-card-number').fill('4111111111111111');
    await expirationFrame.locator('#expiration').fill('1228');
    await cvvFrame.locator('#cvv').fill('123');
    
    try {
      const postalFrame = page.frameLocator('iframe[name*="postal"]').first();
      await postalFrame.locator('#postal-code').fill('12345', { timeout: 2000 });
    } catch (e) {
      // Postal code not required
    }
    
    await page.waitForTimeout(1000);
    
    const paymentBtn = page.locator('button:has-text("Make Payment")');
    await paymentBtn.scrollIntoViewIfNeeded();
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    await paymentBtn.click();
    
    await page.waitForURL(/\/dashboard\/user\/orders/, { timeout: 20000 });
    
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    
    const orderPanels = page.locator('.border.shadow');
    await expect(orderPanels).toHaveCount(2);
    
    const firstOrderNum = await orderPanels.first().locator('td').first().textContent();
    const secondOrderNum = await orderPanels.nth(1).locator('td').first().textContent();
    
    expect(firstOrderNum).toBe('1');
    expect(secondOrderNum).toBe('2');
  });

  test('should display order with multiple product line items', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.locator('button:has-text("ADD TO CART")').first().click();
    await page.waitForTimeout(1000);
    
    await page.locator('button:has-text("ADD TO CART")').nth(1).click();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('.ant-badge-count')).toHaveText('2');
    
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await expect(page.locator('p:has-text("You Have 2 items in your cart")')).toBeVisible();
    
    const updateAddressBtn = page.locator('button:has-text("Update Address")');
    const updateBtnVisible = await updateAddressBtn.isVisible().catch(() => false);
    
    if (updateBtnVisible) {
      await page.locator('a.nav-link.dropdown-toggle:has-text("testing")').click();
      await page.waitForTimeout(500);
      await page.locator('a.dropdown-item:has-text("Dashboard")').click();
      await page.waitForURL(/\/dashboard\/user/, { timeout: 10000 });
      
      await page.click('a:has-text("Profile")');
      await page.waitForURL(/\/dashboard\/user\/profile/);
      
      await page.waitForSelector('input#profile-address', { timeout: 5000 });
      await page.fill('input#profile-address', '123 Test Street, Singapore');
      await page.click('button:has-text("UPDATE")');
      await page.waitForTimeout(2000);
      
      await page.click('.nav-link:has-text("Cart")');
      await page.waitForURL(`${baseURL}/cart`);
    }
    
    await page.waitForSelector('.braintree-options-list', { timeout: 15000 });
    const cardOption = page.locator('.braintree-option__label:has-text("Card")');
    await cardOption.click();
    await page.waitForTimeout(2000);
    
    const cardNumberFrame = page.frameLocator('iframe[name*="number"]').first();
    const expirationFrame = page.frameLocator('iframe[name*="expiration"]').first();
    const cvvFrame = page.frameLocator('iframe[name*="cvv"]').first();
    
    await cardNumberFrame.locator('#credit-card-number').fill('4111111111111111');
    await expirationFrame.locator('#expiration').fill('1228');
    await cvvFrame.locator('#cvv').fill('123');
    
    try {
      const postalFrame = page.frameLocator('iframe[name*="postal"]').first();
      await postalFrame.locator('#postal-code').fill('12345', { timeout: 2000 });
    } catch (e) {
      // Postal code not required
    }
    
    await page.waitForTimeout(1000);
    
    const paymentBtn = page.locator('button:has-text("Make Payment")');
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
    
    await expect(page.locator('h1:has-text("Your Orders")')).toBeVisible();
    expect(count).toBe(0);
  });

  test('should persist orders after page refresh', async ({ page }) => {
    await createTestOrder(page);
    
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