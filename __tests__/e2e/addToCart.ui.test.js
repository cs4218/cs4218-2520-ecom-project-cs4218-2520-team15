/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/seedData.js';

test.describe('S7 - Add-to-cart from multiple entry points', () => {
  const baseURL = 'http://localhost:3000';
  
  const testUser = TEST_USERS.find(user => user.role === 0);

  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"].btn-primary');
    await page.waitForURL(baseURL + '/', { timeout: 10000 });
    
    await page.evaluate(() => localStorage.setItem('cart', '[]'));
  });

  test('should add products from home, category listing, and product details, then manage cart', async ({ page }) => {
    // 1. Add from home page
    await page.goto(baseURL);
    await page.waitForSelector('[role="button"]', { timeout: 10000 });
    
    await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
    await page.waitForTimeout(1000);

    // 2. Add from category listing page
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'Electronics' }).click();
    await page.waitForURL(/\/category\//);
    
    await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
    await page.waitForTimeout(1000);

    // 3. Add from product details page
    await page.goto(baseURL);
    await page.waitForSelector('[role="button"]', { timeout: 10000 });
    
    await page.getByRole('button', { name: 'More Details' }).first().click();
    await page.waitForURL(/\/product\//);
    
    await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
    await page.waitForTimeout(1000);

    // 4. Go to cart and verify items
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForURL(`${baseURL}/cart`);
    
    await expect(page.locator('text=You Have 3 items in your cart')).toBeVisible();
    await expect(page.locator('.row.card.flex-row')).toHaveCount(3);
    await expect(page.locator('h4').filter({ hasText: 'Total' })).toBeVisible();

    // 5. Remove one item and verify
    const firstItemName = await page.locator('.row.card.flex-row').first().locator('p').first().textContent();
    
    await page.getByRole('button', { name: 'Remove' }).first().click();
    
    await expect(page.locator('.row.card.flex-row').first().locator('p').first()).not.toHaveText(firstItemName, { timeout: 5000 });
    await expect(page.locator('text=You Have 2 items in your cart')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.row.card.flex-row')).toHaveCount(2, { timeout: 5000 });

    // 6. Verify persistence after reload
    await page.reload();
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await expect(page.locator('.row.card.flex-row')).toHaveCount(2);
    await expect(page.locator('text=You Have 2 items in your cart')).toBeVisible();
  });

  test('should handle empty cart scenario', async ({ page }) => {
    await page.goto(`${baseURL}/cart`);
    
    await expect(page.locator('text=Your Cart Is Empty')).toBeVisible();
    await expect(page.locator('.row.card.flex-row')).toHaveCount(0);
  });

  test('should update cart badge across navigation', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForSelector('[role="button"]', { timeout: 10000 });
    
    await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
    await page.waitForTimeout(1000);
    
    // Navigate to a different page
    await page.getByRole('link', { name: 'Categories' }).click();
    await page.getByRole('link', { name: 'Electronics' }).click();
    await page.waitForURL(/\/category\//);
    
    // Navigate back home
    await page.getByRole('link', { name: 'Home' }).click();
    await page.waitForURL(baseURL + '/');
    
    // Verify cart still has items by going to cart page
    await page.getByRole('link', { name: 'Cart' }).click();
    await expect(page.locator('text=You Have 1 items in your cart')).toBeVisible();
  });

  test('should add same product multiple times', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForSelector('[role="button"]', { timeout: 10000 });
    
    const firstProduct = page.locator('.card').first();
    
    await firstProduct.getByRole('button', { name: 'ADD TO CART' }).click();
    await page.waitForTimeout(500);
    
    await firstProduct.getByRole('button', { name: 'ADD TO CART' }).click();
    await page.waitForTimeout(500);
    
    await firstProduct.getByRole('button', { name: 'ADD TO CART' }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForURL(`${baseURL}/cart`);
    
    await expect(page.locator('text=You Have 3 items in your cart')).toBeVisible();
    await expect(page.locator('.row.card.flex-row')).toHaveCount(3);
  });
});