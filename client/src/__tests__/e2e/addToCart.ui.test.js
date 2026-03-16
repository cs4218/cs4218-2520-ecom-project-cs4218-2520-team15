/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { test, expect } from '@playwright/test';

test.describe('S7 - Add-to-cart from multiple entry points', () => {
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
    
    await expect(page.locator('.nav-link.dropdown-toggle:has-text("testing")')).toBeVisible();
  });

  test('should add products from home, category listing, and product details, then manage cart', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const firstProduct = page.locator('.card').first();
    
    const productAName = await firstProduct.locator('.card-title').first().textContent();
    const productAPriceText = await firstProduct.locator('.card-price').textContent();
    
    await firstProduct.locator('button:has-text("ADD TO CART")').click();
    
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    
    await expect(page.locator('.ant-badge-count')).toHaveText('1');

    await page.click('a.nav-link.dropdown-toggle:has-text("Categories")');
    
    await page.waitForSelector('.dropdown-menu', { state: 'visible' });
    
    const categoryLinks = page.locator('.dropdown-menu a[href^="/category/"]');
    const firstCategoryLink = categoryLinks.first();
    
    await firstCategoryLink.click();
    
    await page.waitForURL(/\/category\//);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const secondProduct = page.locator('.card').first();
    const productBName = await secondProduct.locator('.card-title').first().textContent();
    const productBPriceText = await secondProduct.locator('.card-price').textContent();
    
    await secondProduct.locator('button:has-text("ADD TO CART")').click();
    
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    
    await expect(page.locator('.ant-badge-count')).toHaveText('2');

    await page.locator('button:has-text("More Details")').first().click();
    
    await page.waitForURL(/\/product\//);
    await page.waitForSelector('.product-details', { timeout: 10000 });
    
    const productCNameElement = await page.locator('.product-details-info h6').filter({ hasText: 'Name' });
    const productCName = await productCNameElement.textContent();
    
    const productCPriceElement = await page.locator('.product-details-info h6').filter({ hasText: 'Price' });
    const productCPrice = await productCPriceElement.textContent();
    
    await page.locator('.product-details-info button:has-text("ADD TO CART")').click();
    
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    
    await expect(page.locator('.ant-badge-count')).toHaveText('3');

    await page.click('.nav-link:has-text("Cart")');
    
    await page.waitForURL(`${baseURL}/cart`);
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await expect(page.locator('p:has-text("You Have 3 items in your cart")')).toBeVisible();
    
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(3);
    
    const totalElement = page.locator('h4:has-text("Total")');
    await expect(totalElement).toBeVisible();

    await page.locator('button:has-text("Remove")').first().click();
    
    await expect(cartItems).toHaveCount(2);
    
    await expect(page.locator('p:has-text("You Have 2 items in your cart")')).toBeVisible();
    
    await expect(page.locator('.ant-badge-count')).toHaveText('2');

    await page.reload();
    
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await expect(cartItems).toHaveCount(2);
    
    await expect(page.locator('p:has-text("You Have 2 items in your cart")')).toBeVisible();
  });

  test('should handle empty cart scenario', async ({ page }) => {
    await page.goto(`${baseURL}/cart`);
    
    await expect(page.locator('p:has-text("Your Cart Is Empty")')).toBeVisible();
    
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(0);
  });

  test('should update cart badge across navigation', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.locator('button:has-text("ADD TO CART")').first().click();
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
    
    await page.goto(`${baseURL}/categories`);
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
    
    await page.click('.nav-link:has-text("Home")');
    await page.waitForURL(baseURL + '/');
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
    
    await page.locator('button:has-text("More Details")').first().click();
    await page.waitForURL(/\/product\//);
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
  });

  test('should add same product multiple times', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const firstProduct = page.locator('.card').first();
    
    for (let i = 0; i < 3; i++) {
      await firstProduct.locator('button:has-text("ADD TO CART")').click();
      await page.waitForSelector('.go3958317564', { timeout: 5000 });
      await expect(page.locator('.ant-badge-count')).toHaveText(String(i + 1));
    }
    
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(3);
  });
});