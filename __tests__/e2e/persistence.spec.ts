/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/seedData';

test.describe('Persistence', () => {
    const USER = TEST_USERS[1];

    test('should allow guest items to persist after login', async ({ page }) => {
        await page.goto('http://localhost:3000/');

        // Add items to cart
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(2).click();
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(5).click();

        // Expect cart items to exist
        await page.getByRole('link', { name: 'Cart' }).click();
        await page.waitForURL('**/cart');
        await expect(page.locator('h1')).toContainText('Hello GuestYou Have 2 items in your cart please login to checkout !');

        // User login
        await page.goto('http://localhost:3000/login');
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(USER.password);
        await page.getByRole('button', { name: 'LOGIN' }).click();
        await page.waitForURL('**/');

        // Expect cart items to remain
        await page.getByRole('link', { name: 'Cart' }).click();
        await page.waitForURL('**/cart');
        await expect(page.locator('h1')).toContainText(`Hello ${USER.name}You Have 2 items in your cart`);
    });

    test('should allow user items to persist after logout', async ({ page }) => {
        await page.goto('http://localhost:3000/login');

        // User login
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(USER.password);
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Add items to cart
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(2).click();
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(5).click();

        // Expect cart items to exist
        await page.getByRole('link', { name: 'Cart' }).click();
        await page.waitForURL('**/cart');
        await expect(page.locator('h1')).toContainText(`Hello ${USER.name}You Have 2 items in your cart`);

        // Logout
        await page.getByRole('button', { name: USER.name }).click();
        await page.getByRole('link', { name: 'Logout' }).click();
        await page.waitForURL('**/login');

        // Expect cart items to remain
        await page.getByRole('link', { name: 'Cart' }).click();
        await page.waitForURL('**/cart');
        await expect(page.locator('h1')).toContainText('Hello GuestYou Have 2 items in your cart please login to checkout !');
    });

    test('should allow items to persist after refresh', async ({ page }) => {
        await page.goto('http://localhost:3000/');

        // Add items to cart
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(2).click();
        await page.getByRole('button', { name: 'ADD TO CART' }).nth(5).click();

        // Expect cart items to exist
        await page.getByRole('link', { name: 'Cart' }).click();
        await page.waitForURL('**/cart');
        await expect(page.locator('h1')).toContainText('Hello GuestYou Have 2 items in your cart please login to checkout !');

        // Refresh
        await page.reload();

        // Expect cart items to remain
        await page.getByRole('link', { name: 'Cart' }).click();
        await page.waitForURL('**/cart');
        await expect(page.locator('h1')).toContainText('Hello GuestYou Have 2 items in your cart please login to checkout !');
    });

    test('should not allow user to view dashboard after logout', async ({ page }) => {
        await page.goto('http://localhost:3000/login');

        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(USER.password);
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Toast popup
        await expect(page.locator('div').filter({ hasText: 'login successfully' }).nth(4)).toBeVisible();

        // Able to go to user dashboard
        await page.getByRole('button', { name: USER.name }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.waitForURL('**/dashboard/user');

        // Able to see user's information
        await expect(page.getByRole('heading', { name: `Name: ${USER.name}` })).toBeVisible();
        await expect(page.getByRole('heading', { name: `Email: ${USER.email}` })).toBeVisible();
        await expect(page.getByRole('heading', { name: `Address: ${USER.address}` })).toBeVisible();

        // Logout
        await page.getByRole('button', { name: USER.name }).click();
        await page.getByRole('link', { name: 'Logout' }).click();
        await page.waitForURL('**/login');

        // Expect not to be able to see dashboard button
        await expect(page.getByRole('button', { name: USER.name })).not.toBeVisible();
        await expect(page.getByRole('link', { name: 'Dashboard' })).not.toBeVisible();
    });
});