/* Name: Mahadhir Bin Mohd Ismail
 * Student No: A0252808B
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/seedData';

test.describe('New User', () => {
    const NEW_USER = {
        name: "New User",
        email: "newuser@example.com",
        password: "newuser@12345",
        phone: "123456789",
        address: "123 New User",
        dob: '2001-01-03',
        answer: "new",
    };

    const EXISTING_USER = TEST_USERS[1];

    test.beforeAll(async ({ request }) => {
        // Ensure database is in seed state before running tests
        const res = await request.post('http://localhost:6060/api/v1/test/seed');
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/register');
    });


    test('should allow new user to register and login', async ({ page }) => {
        // Register a new user
        await page.getByRole('textbox', { name: 'Enter Your Name' }).fill(NEW_USER.name);
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(NEW_USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(NEW_USER.password);
        await page.getByRole('textbox', { name: 'Enter Your Phone' }).fill(NEW_USER.phone);
        await page.getByRole('textbox', { name: 'Enter Your Address' }).fill(NEW_USER.address);
        await page.getByPlaceholder('Enter Your DOB').fill(NEW_USER.dob);
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill(NEW_USER.answer);
        await page.getByRole('button', { name: 'REGISTER' }).click();

        // Expect page to redirect to login
        await page.waitForURL('**/login');
        await expect(page.getByRole('heading', { name: 'LOGIN FORM' })).toBeVisible();
        await expect(page.getByRole('main')).toContainText('LOGIN FORM');

        // Login as new user
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(NEW_USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(NEW_USER.password);
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Toast popup
        await expect(page.locator('div').filter({ hasText: 'login successfully' }).nth(4)).toBeVisible();

        // Able to see user button
        await expect(page.getByRole('button', { name: NEW_USER.name })).toBeVisible();

        // Able to go to user dashboard
        await page.getByRole('button', { name: NEW_USER.name }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.waitForURL('**/dashboard/user');

        // Able to see user's information
        await expect(page.getByRole('heading', { name: `Name: ${NEW_USER.name}` })).toBeVisible();
        await expect(page.getByRole('main')).toContainText(`Name: ${NEW_USER.name}`);
        await expect(page.getByRole('heading', { name: `Email: ${NEW_USER.email}` })).toBeVisible();
        await expect(page.getByRole('main')).toContainText(`Email: ${NEW_USER.email}`);
        await expect(page.getByRole('heading', { name: `Address: ${NEW_USER.address}` })).toBeVisible();
        await expect(page.getByRole('main')).toContainText(`Address: ${NEW_USER.address}`);
    });

    test('should prevent existing user from registering', async ({ page }) => {
        // Register existing user
        await page.getByRole('textbox', { name: 'Enter Your Name' }).fill(EXISTING_USER.name);
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(EXISTING_USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(EXISTING_USER.password);
        await page.getByRole('textbox', { name: 'Enter Your Phone' }).fill(EXISTING_USER.phone);
        await page.getByRole('textbox', { name: 'Enter Your Address' }).fill(EXISTING_USER.address);
        await page.getByPlaceholder('Enter Your DOB').fill(EXISTING_USER.dob);
        await page.getByRole('textbox', { name: 'What is Your Favorite sports' }).fill(EXISTING_USER.answer);
        await page.getByRole('button', { name: 'REGISTER' }).click();

        // Toast error popup
        await expect(page.locator('div').filter({ hasText: 'User is already registered.' }).nth(4)).toBeVisible();
    });
});

test.describe('Login', () => {
    const NOT_USER = {
        name: "New User",
        email: "newuser@example.com",
        password: "newuser@12345",
        phone: "123456789",
        address: "123 New User",
        dob: '2001-01-03',
        answer: "new",
    };

    const EXISTING_USER = TEST_USERS[1];

    test.beforeAll(async ({ request }) => {
        // Ensure database is in seed state before running tests
        const res = await request.post('http://localhost:6060/api/v1/test/seed');
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/login');
    });

    test('should not allow login if user does not exist', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(NOT_USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(NOT_USER.password);
        await page.getByRole('button', { name: 'LOGIN' }).click();

        await expect(page.locator('div').filter({ hasText: 'Email is not registered' }).nth(4)).toBeVisible();
    });

    test('should not allow login if password is incorrect', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(EXISTING_USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('wrongpassword');
        await page.getByRole('button', { name: 'LOGIN' }).click();

        await expect(page.locator('div').filter({ hasText: 'Password is incorrect' }).nth(4)).toBeVisible();
    });

    test('should allow existing user to log in', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(EXISTING_USER.email);
        await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(EXISTING_USER.password);
        await page.getByRole('button', { name: 'LOGIN' }).click();

        // Toast popup
        await expect(page.locator('div').filter({ hasText: 'login successfully' }).nth(4)).toBeVisible();

        // Able to see user button
        await expect(page.getByRole('button', { name: EXISTING_USER.name })).toBeVisible();

        // Able to go to user dashboard
        await page.getByRole('button', { name: EXISTING_USER.name }).click();
        await page.getByRole('link', { name: 'Dashboard' }).click();
        await page.waitForURL('**/dashboard/user');

        // Able to see user's information
        await expect(page.getByRole('heading', { name: `Name: ${EXISTING_USER.name}` })).toBeVisible();
        await expect(page.getByRole('heading', { name: `Email: ${EXISTING_USER.email}` })).toBeVisible();
        await expect(page.getByRole('heading', { name: `Address: ${EXISTING_USER.address}` })).toBeVisible();
    })
});