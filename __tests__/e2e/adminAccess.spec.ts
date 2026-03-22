/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from "./fixtures/seedData";

test.describe('Admin Access', () => {
    const ADMIN = TEST_USERS[0];
    const USER = TEST_USERS[1]; 

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/login');
    });

    test('should allow admin to login', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(ADMIN.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(ADMIN.password);
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Toast popup
        await expect(page.locator('div').filter({ hasText: 'login successfully' }).nth(4)).toBeVisible();

        // Able to see admin button
        await expect(page.getByRole('button', { name: ADMIN.name })).toBeVisible();

        // Able to go to admin dashboard
        await page.getByRole('button', { name: ADMIN.name }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.waitForURL('**/dashboard/admin');

        // Able to see admin's information
        await expect(page.getByRole('heading', { name: `Admin Name : ${ADMIN.name}` })).toBeVisible();
        await expect(page.getByRole('heading', { name: `Admin Email : ${ADMIN.email}` })).toBeVisible();
        await expect(page.getByRole('heading', { name: `Admin Contact : ${ADMIN.phone}` })).toBeVisible();

        // Able to see admin panel features
        await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Create Category' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Create Product' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Products' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
    });

    test('should prevent user from accessing admin dashboard', async ({ page }) => {
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

        // Able to see user features
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible();

        // Not able to see admin's information
        await expect(page.getByRole('heading', { name: `Admin Name : ${USER.name}` })).not.toBeVisible();
        await expect(page.getByRole('heading', { name: `Admin Email : ${USER.email}` })).not.toBeVisible();
        await expect(page.getByRole('heading', { name: `Admin Contact : ${USER.phone}` })).not.toBeVisible();

        // Not able to see admin panel features
        await expect(page.getByRole('heading', { name: 'Admin Panel' })).not.toBeVisible();
        await expect(page.getByRole('link', { name: 'Create Category' })).not.toBeVisible();
        await expect(page.getByRole('link', { name: 'Create Product' })).not.toBeVisible();
        await expect(page.getByRole('link', { name: 'Products' })).not.toBeVisible();
        await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible();

        // Attempt to access admin dashboard
        await page.goto('http://localhost:3000/dashboard/admin');

        // Expect that admin panel is not displayed
        await expect(page.getByRole('heading', { name: 'Admin Panel' })).not.toBeVisible();

        // Wait for redirect to login page (Spinner redirects after 3 seconds)
        await page.waitForURL('**/login');
        await expect(page).toHaveURL(/\/login/);
    });
});