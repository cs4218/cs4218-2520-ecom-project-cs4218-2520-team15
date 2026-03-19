/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { test, expect } from '@playwright/test';

test.describe('S7 - Add-to-cart from multiple entry points', () => {
  const baseURL = 'http://localhost:3000';
  
  const testUser = {
    email: 'e2etest_normal_user@example.com',
    password: 'TestNormal@12345'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    await page.evaluate(() => localStorage.clear());
    
    await page.goto(`${baseURL}/login`);
    
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    await page.click('button[type="submit"].btn-primary');
    
    await page.waitForURL(baseURL + '/', { timeout: 10000 });
    
    await expect(page.locator('.nav-link.dropdown-toggle:has-text("E2E Test Normal User")')).toBeVisible();
  });

  test('should add products from home, category listing, and product details, then manage cart', async ({ page }) => {
    const addedProducts = new Set();
    
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const firstProduct = page.locator('.card').first();
    const productAName = (await firstProduct.locator('.card-title').first().textContent())?.trim();
    addedProducts.add(productAName);
    
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
    
    const allProductsInCategory = page.locator('.card');
    const categoryProductCount = await allProductsInCategory.count();
    
    let productBName = null;
    let secondProductIndex = -1;
    
    for (let i = 0; i < categoryProductCount; i++) {
      const prodName = (await allProductsInCategory.nth(i).locator('.card-title').first().textContent())?.trim();
      if (!addedProducts.has(prodName)) {
        productBName = prodName;
        secondProductIndex = i;
        break;
      }
    }
    
    if (secondProductIndex === -1) {
      throw new Error(`Could not find a second unique product. Available products in category: ${categoryProductCount}`);
    }
    
    addedProducts.add(productBName);
    
    const secondProduct = allProductsInCategory.nth(secondProductIndex);
    await secondProduct.locator('button:has-text("ADD TO CART")').click();
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    await expect(page.locator('.ant-badge-count')).toHaveText('2');

    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const allProductsOnHome = page.locator('.card');
    const homeProductCount = await allProductsOnHome.count();
    
    let productCName = null;
    let thirdProductIndex = -1;
    
    for (let i = 0; i < homeProductCount; i++) {
      const prodName = (await allProductsOnHome.nth(i).locator('.card-title').first().textContent())?.trim();
      if (!addedProducts.has(prodName)) {
        productCName = prodName;
        thirdProductIndex = i;
        break;
      }
    }
    
    if (thirdProductIndex === -1) {
      throw new Error(`Could not find a third unique product. Already added: ${Array.from(addedProducts).join(', ')}`);
    }
    
    addedProducts.add(productCName);
    
    await allProductsOnHome.nth(thirdProductIndex).locator('button:has-text("More Details")').click();
    await page.waitForURL(/\/product\//, { timeout: 15000 });
    await page.waitForSelector('.product-details', { timeout: 15000 });
    
    await page.locator('.product-details-info button:has-text("ADD TO CART")').click();
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    await expect(page.locator('.ant-badge-count')).toHaveText('3');

    const cartData = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    });
    
    const uniqueIds = new Set(cartData.map(item => item._id));
    if (uniqueIds.size !== 3) {
      throw new Error(`Cart has duplicate products! Unique IDs: ${uniqueIds.size}, Total items: ${cartData.length}`);
    }

    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await expect(page.locator('p:has-text("You Have 3 items in your cart")')).toBeVisible();
    
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(3);
    
    const totalElement = page.locator('h4:has-text("Total")');
    await expect(totalElement).toBeVisible();

    await page.locator('button:has-text("Remove")').first().click();
    
    await expect(page.locator('p:has-text("You Have 2 items in your cart")')).toBeVisible({ timeout: 5000 });
    await expect(cartItems).toHaveCount(2, { timeout: 5000 });
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
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
    
    await page.locator('button:has-text("More Details")').first().click();
    await page.waitForURL(/\/product\//, { timeout: 15000 });
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