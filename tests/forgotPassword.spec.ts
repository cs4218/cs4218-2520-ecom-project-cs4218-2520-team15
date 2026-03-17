import { test, expect } from '@playwright/test';

test('should allow user to reset password', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await expect(page.getByRole('button', { name: 'Forgot Password' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('Forgot Password');
    await page.getByRole('button', { name: 'Forgot Password' }).click();

    await expect(page.getByRole('main')).toContainText('RESET PASSWORD');
    await expect(page.getByRole('textbox', { name: 'Enter Your Email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'What is Your Favorite sports' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Enter Your New Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'RESET' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('RESET');

    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@gmail.com');
    await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill('test@gmail.com');
    await page.getByRole('textbox', { name: 'Enter Your New Password' }).fill('test@gmail.com');
    await page.getByRole('button', { name: 'RESET' }).click();

    await expect(page.locator('div').filter({ hasText: 'Password Reset Successfully' }).nth(4)).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Password Reset Successfully');

    await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();
});

test('should not allow password reset if answer is incorrect', async ({ page }) => {
    await page.goto('http://localhost:3000/forgot-password');

    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@gmail.com');
    await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill('wronganswer');
    await page.getByRole('textbox', { name: 'Enter Your New Password' }).fill('test@gmail.com');
    await page.getByRole('button', { name: 'RESET' }).click();

    await expect(page.locator('div').filter({ hasText: 'Answer is incorrect' }).nth(4)).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Answer is incorrect');
});