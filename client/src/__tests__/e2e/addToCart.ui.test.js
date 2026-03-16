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
    // Clear localStorage before each test to start fresh
    await page.goto(baseURL);
    await page.evaluate(() => localStorage.clear());
    
    // Login first
    await page.goto(`${baseURL}/login`);
    
    // Fill in login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Click login button - use text selector which is more reliable
    await page.click('button:has-text("LOGIN")');
    
    // Wait for successful login - should redirect to home page
    await page.waitForURL(baseURL + '/', { timeout: 10000 });
    
    // Verify user is logged in by checking for user name in header (more specific selector)
    await expect(page.locator('.nav-link.dropdown-toggle:has-text("testing")')).toBeVisible();
  });

  test('should add products from home, category listing, and product details, then manage cart', async ({ page }) => {
    // STEP 1: Add Product A from Home Page (HomePage.js)
    console.log('STEP 1: Adding product from home page...');
    await page.goto(`${baseURL}/`);
    
    // Wait for products to load
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get the first product card
    const firstProduct = page.locator('.card').first();
    
    // Get product A details
    const productAName = await firstProduct.locator('.card-title').first().textContent();
    const productAPriceText = await firstProduct.locator('.card-price').textContent();
    
    console.log(`Product A: ${productAName}, Price: ${productAPriceText}`);
    
    // Click ADD TO CART on first product
    await firstProduct.locator('button:has-text("ADD TO CART")').click();
    
    // Wait for toast notification (from react-hot-toast)
    await page.waitForSelector('.go3958317564', { timeout: 5000 }); // toast container class
    
    // Verify cart badge shows 1 item (from Header.js using antd Badge)
    await expect(page.locator('.ant-badge-count')).toHaveText('1');

    // STEP 2: Navigate to Categories and add Product B from category listing
    console.log('STEP 2: Adding product from category listing...');
    
    // Click on Categories dropdown in header (Header.js) - be more specific
    await page.click('a.nav-link.dropdown-toggle:has-text("Categories")');
    
    // Wait for dropdown menu to appear
    await page.waitForSelector('.dropdown-menu', { state: 'visible' });
    
    // Click on the first actual category (skip "All Categories" link)
    // Look for category links that go to /category/
    const categoryLinks = page.locator('.dropdown-menu a[href^="/category/"]');
    const firstCategoryLink = categoryLinks.first();
    const categoryName = await firstCategoryLink.textContent();
    console.log(`Navigating to category: ${categoryName}`);
    
    await firstCategoryLink.click();
    
    // Wait for category page to load (CategoryProduct.js)
    await page.waitForURL(/\/category\//);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    // Get second product's details from category page
    const secondProduct = page.locator('.card').first();
    const productBName = await secondProduct.locator('.card-title').first().textContent();
    const productBPriceText = await secondProduct.locator('.card-price').textContent();
    
    console.log(`Product B: ${productBName}, Price: ${productBPriceText}`);
    
    // Add to cart
    await secondProduct.locator('button:has-text("ADD TO CART")').click();
    
    // Wait for toast
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    
    // Verify cart badge shows 2 items
    await expect(page.locator('.ant-badge-count')).toHaveText('2');

    // STEP 3: Go to Product Details and add Product C (ProductDetails.js)
    console.log('STEP 3: Adding product from product details page...');
    
    // Click "More Details" on a product
    await page.locator('button:has-text("More Details")').first().click();
    
    // Wait for product details page
    await page.waitForURL(/\/product\//);
    await page.waitForSelector('.product-details', { timeout: 10000 });
    
    // Get product C details
    const productCNameElement = await page.locator('.product-details-info h6').filter({ hasText: 'Name' });
    const productCName = await productCNameElement.textContent();
    
    const productCPriceElement = await page.locator('.product-details-info h6').filter({ hasText: 'Price' });
    const productCPrice = await productCPriceElement.textContent();
    
    console.log(`Product C: ${productCName}, ${productCPrice}`);
    
    // Add to cart from details page
    await page.locator('.product-details-info button:has-text("ADD TO CART")').click();
    
    // Wait for toast
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    
    // Verify cart badge shows 3 items
    await expect(page.locator('.ant-badge-count')).toHaveText('3');

    // STEP 4: Visit /cart and verify all items are present (CartPage.js)
    console.log('STEP 4: Verifying cart contents...');
    
    // Click on Cart link in header
    await page.click('.nav-link:has-text("Cart")');
    
    // Wait for cart page
    await page.waitForURL(`${baseURL}/cart`);
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    // Verify message shows correct count
    await expect(page.locator('p:has-text("You Have 3 items in your cart")')).toBeVisible();
    
    // Verify 3 products are in cart (cards with flex-row class)
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(3);
    
    // Verify total price is visible
    const totalElement = page.locator('h4:has-text("Total")');
    await expect(totalElement).toBeVisible();
    
    const totalText = await totalElement.textContent();
    console.log(`Cart total: ${totalText}`);

    // STEP 5: Remove one item and verify updates
    console.log('STEP 5: Removing one item from cart...');
    
    // Click Remove button on first item
    await page.locator('button:has-text("Remove")').first().click();
    
    // Verify only 2 items remain
    await expect(cartItems).toHaveCount(2);
    
    // Verify message updated
    await expect(page.locator('p:has-text("You Have 2 items in your cart")')).toBeVisible();
    
    // Verify cart badge updated to 2
    await expect(page.locator('.ant-badge-count')).toHaveText('2');

    // STEP 6: Refresh page and verify cart persists via localStorage (cart.js context)
    console.log('STEP 6: Verifying cart persistence after refresh...');
    
    await page.reload();
    
    // Wait for page to reload
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    // Verify still 2 items
    await expect(cartItems).toHaveCount(2);
    
    // Verify message still shows 2 items
    await expect(page.locator('p:has-text("You Have 2 items in your cart")')).toBeVisible();
    
    console.log('✅ All steps completed successfully!');
  });

  test('should handle empty cart scenario', async ({ page }) => {
    // Go to cart when empty
    await page.goto(`${baseURL}/cart`);
    
    // Verify empty cart message (from CartPage.js)
    await expect(page.locator('p:has-text("Your Cart Is Empty")')).toBeVisible();
    
    // Verify no cart items displayed
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(0);
  });

  test('should update cart badge across navigation', async ({ page }) => {
    // Add item from home
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    await page.locator('button:has-text("ADD TO CART")').first().click();
    await page.waitForSelector('.go3958317564', { timeout: 5000 });
    
    // Verify badge shows 1
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
    
    // Navigate to Categories page
    await page.goto(`${baseURL}/categories`);
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
    
    // Navigate back to Home
    await page.click('.nav-link:has-text("Home")');
    await page.waitForURL(baseURL + '/');
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
    
    // Navigate to a product details page
    await page.locator('button:has-text("More Details")').first().click();
    await page.waitForURL(/\/product\//);
    await expect(page.locator('.ant-badge-count')).toHaveText('1');
  });

  test('should add same product multiple times', async ({ page }) => {
    // Go to home page
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const firstProduct = page.locator('.card').first();
    
    // Add same product 3 times
    for (let i = 0; i < 3; i++) {
      await firstProduct.locator('button:has-text("ADD TO CART")').click();
      await page.waitForSelector('.go3958317564', { timeout: 5000 });
      await expect(page.locator('.ant-badge-count')).toHaveText(String(i + 1));
    }
    
    // Go to cart
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    
    // Verify 3 items in cart (same product added 3 times creates 3 separate cart entries)
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(3);
  });
});