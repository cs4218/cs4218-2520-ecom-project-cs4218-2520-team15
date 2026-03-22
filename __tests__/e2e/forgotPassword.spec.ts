/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/seedData';

const USER = TEST_USERS[1];

test.describe('Password Reset', () => {
    test.beforeAll(async ({ request }) => {
        // Ensure database is in seed state before running tests
        const res = await request.post('http://localhost:6060/api/v1/test/seed');
    });

    test.afterAll(async ({ request }) => {
        // Ensure database is in seed state after running tests
        const res = await request.post('http://localhost:6060/api/v1/test/seed');
    });

    test('should allow user to reset password', async ({ page }) => {
        await page.goto('http://localhost:3000/login');

        // Ensure button is present
        await expect(page.getByRole('button', { name: 'Forgot Password' })).toBeVisible();
        await page.getByRole('button', { name: 'Forgot Password' }).click();

        // Ensure page elements are visible
        await expect(page.getByRole('main')).toContainText('RESET PASSWORD');
        await expect(page.getByRole('textbox', { name: 'Enter Your Email' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'What is Your Favorite sports' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Enter Your New Password' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'RESET' })).toBeVisible();

        // Reset password
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(USER.email);
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill(USER.answer);
        await page.getByRole('textbox', { name: 'Enter Your New Password' }).fill('newpassword');
        await page.getByRole('button', { name: 'RESET' }).click();

        // Toast popup
        await expect(page.locator('div').filter({ hasText: 'Password Reset Successfully' }).nth(4)).toBeVisible();

        // Expect page to redirect to login
        await page.waitForURL('**/login');
        await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();

        // Expect unable to login with old password
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(USER.password);
        await page.getByRole('button', { name: 'LOGIN' }).click();

        await expect(page.locator('div').filter({ hasText: 'Password is incorrect' }).nth(4)).toBeVisible();

        // Expect able to login with new password
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('newpassword');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Toast popup
        await expect(page.locator('div').filter({ hasText: 'login successfully' }).nth(4)).toBeVisible();
    });

    test('should not allow password reset if answer is incorrect', async ({ page }) => {
        await page.goto('http://localhost:3000/forgot-password');

        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(USER.email);
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill('wronganswer');
        await page.getByRole('textbox', { name: 'Enter Your New Password' }).fill('newpassword');
        await page.getByRole('button', { name: 'RESET' }).click();

        await expect(page.locator('div').filter({ hasText: 'Answer is incorrect' }).nth(4)).toBeVisible();
    });
});