import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.describe('New User', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/register');
    });

    test('should allow new user to register and login', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Your Name' }).fill('New User');
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('newuser@email.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('newuser@email.com');
        await page.getByRole('textbox', { name: 'Enter Your Phone' }).fill('1234567890');
        await page.getByRole('textbox', { name: 'Enter Your Address' }).fill('newaddress');
        await page.getByPlaceholder('Enter Your DOB').fill('2026-03-01');
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill('newuser');
        await page.getByRole('button', { name: 'REGISTER' }).click();

        await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('LOGIN FORM');

        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('newuser@email.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('newuser@email.com');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        await expect(page.locator('div').filter({ hasText: 'login successfully' }).nth(4)).toBeVisible();
        await expect(page.getByRole('status')).toContainText('login successfully');

        await expect(page.getByRole('button', { name: 'New User' })).toBeVisible();
        await expect(page.getByRole('list')).toContainText('New User');

        await page.getByRole('button', { name: 'New User' }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();

        await expect(page.getByRole('heading', { name: 'Name: New User' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Name: New User');
        await expect(page.getByRole('heading', { name: 'Email: newuser@email.com' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Email: newuser@email.com');
        await expect(page.getByRole('heading', { name: 'Address: newaddress' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Address: newaddress');
    });

    test('should prevent existing user from registering', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Your Name' }).fill('test@gmail.com');
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@gmail.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('test@gmail.com');
        await page.getByRole('textbox', { name: 'Enter Your Phone' }).fill('test@gmail.com');
        await page.getByRole('textbox', { name: 'Enter Your Address' }).fill('test@gmail.com');
        await page.getByPlaceholder('Enter Your DOB').fill('2026-03-01');
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill('test@gmail.com');
        await page.getByRole('button', { name: 'REGISTER' }).click();

        await expect(page.locator('div').filter({ hasText: 'User is already registered.' }).nth(4)).toBeVisible();
        await expect(page.getByRole('status')).toContainText('User is already registered. Please login.');
    });
});

test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/login');
    });

    test('should not allow login if user does not exist', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('notauser@gmail.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('notauser@gmail.com');
        await page.getByRole('button', { name: 'LOGIN' }).click();
        await expect(page.locator('div').filter({ hasText: 'Email is not registered' }).nth(4)).toBeVisible();
        await expect(page.getByRole('status')).toContainText('Email is not registered');
    });

    test('should not allow login if password is incorrect', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@gmail.com');
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('wrongpassword');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        await expect(page.locator('div').filter({ hasText: 'Password is incorrect' }).nth(4)).toBeVisible();
        await expect(page.getByRole('status')).toContainText('Password is incorrect');
    });
});