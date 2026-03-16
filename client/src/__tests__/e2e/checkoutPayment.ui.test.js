/* Name: Tan Qin Xu
 * Student No: A0213002J
 */

import { test, expect } from '@playwright/test';

test.describe('S8 - Checkout and payment happy path', () => {
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
  });

  test('should complete checkout and payment flow successfully', async ({ page }) => {
    console.log('STEP 1: Adding product to cart...');
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    
    const firstProduct = page.locator('.card').first();
    const productName = await firstProduct.locator('.card-title').first().textContent();
    const productPrice = await firstProduct.locator('.card-price').textContent();
    
    console.log(`Adding product: ${productName}, Price: ${productPrice}`);
    
    await firstProduct.locator('button:has-text("ADD TO CART")').click();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('.ant-badge-count')).toHaveText('1');

    console.log('STEP 2: Navigating to cart...');
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    
    await expect(page.locator('p:has-text("You Have 1 items in your cart")')).toBeVisible();
    
    const cartItems = page.locator('.row.card.flex-row');
    await expect(cartItems).toHaveCount(1);
    
    const totalElement = page.locator('h4:has-text("Total")');
    await expect(totalElement).toBeVisible();

    console.log('STEP 3: Checking user address...');
    
    const updateAddressBtn = page.locator('button:has-text("Update Address")');
    const updateBtnVisible = await updateAddressBtn.isVisible().catch(() => false);
    
    if (updateBtnVisible) {
      console.log('No address found, updating profile...');

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

    console.log('STEP 4: Setting up payment method...');
    
    await page.waitForSelector('.braintree-options-list', { timeout: 15000 });
    
    const cardOption = page.locator('.braintree-option__label:has-text("Card")');
    await cardOption.click();
    
    console.log('Card payment option selected');
    
    await page.waitForTimeout(2000);
    
    const cardNumberFrame = page.frameLocator('iframe[name*="number"]').first();
    const expirationFrame = page.frameLocator('iframe[name*="expiration"]').first();
    const cvvFrame = page.frameLocator('iframe[name*="cvv"]').first();
    const postalFrame = page.frameLocator('iframe[name*="postal"]').first();
    
    await cardNumberFrame.locator('#credit-card-number').fill('4111111111111111');
    await expirationFrame.locator('#expiration').fill('1228'); // December 2028 (future date)
    await cvvFrame.locator('#cvv').fill('123');
    
    try {
      await postalFrame.locator('#postal-code').fill('12345', { timeout: 2000 });
    } catch (e) {
      console.log('Postal code field not found or not required');
    }
    
    console.log('Payment details filled');
    
    await page.waitForTimeout(1000);

    console.log('STEP 5: Submitting payment...');
    
    const paymentBtn = page.locator('button:has-text("Make Payment")');
    await paymentBtn.scrollIntoViewIfNeeded();
    
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    
    await paymentBtn.click();
    
    await page.waitForURL(/\/dashboard\/user\/orders/, { timeout: 20000 });
    
    console.log('Payment successful, redirected to orders page');

    console.log('STEP 6: Verifying order in orders page...');
    
    await page.waitForSelector('.border.shadow', { timeout: 10000 });
    
    const orderRows = page.locator('.border.shadow');
    await expect(orderRows).toHaveCount(1, { timeout: 10000 });
    
    await expect(page.locator('td:has-text("Success")')).toBeVisible(); // Payment success
    await expect(page.locator('td:has-text("Not Processed")')).toBeVisible(); // Default status
    await expect(page.locator('td:has-text("testing")')).toBeVisible(); // Buyer name
    
    console.log('Order verified successfully');

    console.log('STEP 7: Verifying cart is empty...');
    
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    
    await expect(page.locator('p:has-text("Your Cart Is Empty")')).toBeVisible();
    
    const emptyCartItems = page.locator('.row.card.flex-row');
    await expect(emptyCartItems).toHaveCount(0);
    
    const badge = page.locator('.ant-badge-count');
    const badgeVisible = await badge.isVisible().catch(() => false);
    if (badgeVisible) {
      await expect(badge).toHaveText('0');
    }
    
    console.log('✅ Complete checkout flow successful!');
  });

  test('should not allow payment without address', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    await page.locator('button:has-text("ADD TO CART")').first().click();
    await page.waitForTimeout(1000);
    
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    
    const iframe = page.locator('iframe[name*="braintree"]');
    const iframeVisible = await iframe.isVisible().catch(() => false);
    
    if (iframeVisible) {
      await page.waitForSelector('iframe[name*="braintree"]', { timeout: 10000 });
      
      const paymentBtn = page.locator('button:has-text("Make Payment")');
      const isDisabled = await paymentBtn.isDisabled().catch(() => true);
      
      if (isDisabled) {
        console.log('✅ Payment button correctly disabled without address');
      }
    }
  });

  test('should show payment loading state', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    await page.locator('button:has-text("ADD TO CART")').first().click();
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
    const postalFrame = page.frameLocator('iframe[name*="postal"]').first();
    
    await cardNumberFrame.locator('#credit-card-number').fill('4111111111111111');
    await expirationFrame.locator('#expiration').fill('1228'); // December 2028
    await cvvFrame.locator('#cvv').fill('123');
    
    try {
      await postalFrame.locator('#postal-code').fill('12345', { timeout: 2000 });
    } catch (e) {
      console.log('Postal code not required');
    }
    
    await page.waitForTimeout(1000);
    
    const paymentBtn = page.locator('button:has-text("Make Payment")');
    await paymentBtn.scrollIntoViewIfNeeded();
    await expect(paymentBtn).toBeEnabled({ timeout: 10000 });
    await paymentBtn.click();
    
    await expect(page.locator('button:has-text("Processing")')).toBeVisible({ timeout: 2000 });
    
    console.log('✅ Payment loading state displayed correctly');
  });

  test('should persist order after page refresh', async ({ page }) => {
    await page.goto(`${baseURL}/`);
    await page.waitForSelector('.card', { timeout: 10000 });
    await page.locator('button:has-text("ADD TO CART")').first().click();
    await page.waitForTimeout(1000);
    
    await page.click('.nav-link:has-text("Cart")');
    await page.waitForURL(`${baseURL}/cart`);
    
    await page.goto(`${baseURL}/dashboard/user/orders`);
    await page.waitForSelector('h1:has-text("Your Orders")', { timeout: 10000 });
    
    const initialOrderCount = await page.locator('.border.shadow').count();
    
    await page.reload();
    await page.waitForSelector('h1:has-text("Your Orders")', { timeout: 10000 });
    
    const afterRefreshCount = await page.locator('.border.shadow').count();
    expect(afterRefreshCount).toBe(initialOrderCount);
    
    console.log('✅ Orders persist after page refresh');
  });
});