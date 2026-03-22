/*
  * Name: Lim Jin Yin
  * Student ID: A0256976H
*/

import { expect, Page, test } from "@playwright/test";
import { TEST_USERS } from "./fixtures/seedData";

const USER  = TEST_USERS[1];

test.describe.serial("User Profile Update", () => {

  const fillField = async (page: Page, placeholder: string, value: string) => {
    const input = page.getByPlaceholder(placeholder);
    await input.click();
    await input.clear();
    await input.fill(value);
  };

  const submitForm = async (page: Page) => {
    const profileForm = page.locator('form', {
      has: page.getByRole('heading', { name: 'USER PROFILE' }),
    });
    const submitButton = profileForm.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    const urlPart = '/api/v1/auth/profile';
    const networkDone = Promise.race([
      page.waitForResponse((resp) => resp.url().includes(urlPart)),
      page.waitForEvent('requestfailed', (req) => req.url().includes(urlPart)),
      page.waitForEvent('requestfinished', (req) => req.url().includes(urlPart)),
    ]);

    await Promise.all([
      submitButton.click(),
      networkDone,
    ]);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(250);
  };

  const resetProfile = async (page: Page) => {
    try {
      await page.request.post('/api/v1/test/teardown');
      await page.request.post('/api/v1/test/seed');
    } catch (err) {
      console.error('resetProfile API error', err);
    }

    await page.evaluate(() => localStorage.removeItem('auth'));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(250);
  };


  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    await test.step("login as normal user", async () => {
      await page.getByRole("link", { name: "Login" }).click();
      const emailInput = page.getByRole("textbox", { name: "Enter Your Email" });
      await emailInput.click();
      await emailInput.fill(USER.email);
      const passwordInput = page.getByRole("textbox", { name: "Enter Your Password" });
      await passwordInput.click();
      await passwordInput.fill(USER.password);
      await page.getByRole("button", { name: "LOGIN" }).click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    await test.step("navigate to profile page", async () => {
      await page.getByRole("button", { name: USER.name }).click();
      await page.getByRole("link", { name: "DASHBOARD" }).click();
      await page.getByRole("link", { name: "Profile" }).click();
      await page.waitForLoadState("networkidle");
    });
  });

  test.describe("initial render", () => {

    test("should display the USER PROFILE heading", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "USER PROFILE" })).toBeVisible();
    });

    test("should pre-fill all fields with the seeded user values", async ({ page }) => {
      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(USER.name);
      await expect(page.getByPlaceholder("Enter Your Email")).toHaveValue(USER.email);
      await expect(page.getByPlaceholder("Enter Your Phone")).toHaveValue(USER.phone);
      await expect(page.getByPlaceholder("Enter Your Address")).toHaveValue(USER.address);
      await expect(page.getByPlaceholder("Enter Your Password")).toHaveValue("");
    });

    test("should render the email field as disabled", async ({ page }) => {
      await expect(page.getByPlaceholder("Enter Your Email")).toBeDisabled();
    });

    test("should render all other fields as enabled", async ({ page }) => {
      await expect(page.getByPlaceholder("Enter Your Name")).toBeEnabled();
      await expect(page.getByPlaceholder("Enter Your Password")).toBeEnabled();
      await expect(page.getByPlaceholder("Enter Your Phone")).toBeEnabled();
      await expect(page.getByPlaceholder("Enter Your Address")).toBeEnabled();
    });

  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should update name only and leave other fields unchanged", async ({ page }) => {
      await fillField(page, "Enter Your Name", "Updated Name");
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible({ timeout: 10000 });

      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue("Updated Name");
      await expect(page.getByPlaceholder("Enter Your Phone")).toHaveValue(USER.phone);
      await expect(page.getByPlaceholder("Enter Your Address")).toHaveValue(USER.address);
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should update phone only and leave other fields unchanged", async ({ page }) => {
      await fillField(page, "Enter Your Phone", "99998888");
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Phone")).toHaveValue("99998888");
      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(USER.name);
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should update address only and leave other fields unchanged", async ({ page }) => {
      await fillField(page, "Enter Your Address", "789 New Street");
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Address")).toHaveValue("789 New Street");
      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(USER.name);
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should update name, phone, and address simultaneously", async ({ page }) => {
      await fillField(page, "Enter Your Name", "Multi Update Name");
      await fillField(page, "Enter Your Phone", "11112222");
      await fillField(page, "Enter Your Address", "Multi Update Street");
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue("Multi Update Name");
      await expect(page.getByPlaceholder("Enter Your Phone")).toHaveValue("11112222");
      await expect(page.getByPlaceholder("Enter Your Address")).toHaveValue("Multi Update Street");
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should show success when the form is submitted without any changes", async ({ page }) => {
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(USER.name);
    });

    test("should not be possible to type into the email field", async ({ page }) => {
      const emailInput = page.getByPlaceholder("Enter Your Email");
      
      await emailInput.press("a");
      await expect(emailInput).toHaveValue(USER.email);
    });

    test("should preserve the original email after a successful profile update", async ({ page }) => {
      await fillField(page, "Enter Your Name", "Email Attempt");
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Email")).toHaveValue(USER.email);
    });

  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should show an error toast for a password of length 5 (below boundary)", async ({ page }) => {
      await fillField(page, "Enter Your Password", "12345"); // 5 chars
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).not.toBeVisible();
      await expect(page.getByText("Password is required and should be at least 6 characters long")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(USER.name);
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should successfully update with a password of at least length 6", async ({ page }) => {
      await fillField(page, "Enter Your Password", "abc123"); // exactly 6 chars
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should update the navbar display name after a successful name change", async ({ page }) => {
      await fillField(page, "Enter Your Name", "New Display Name");
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      
      await expect(
        page.getByRole("button", { name: "New Display Name" })
      ).toBeVisible();
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should persist the updated name in localStorage after a successful update", async ({ page }) => {
      await fillField(page, "Enter Your Name", "LocalStorage Name");
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();

      const storedName = await page.evaluate(() => {
        const raw = localStorage.getItem("auth");
        return raw ? JSON.parse(raw).user?.name : null;
      });
      expect(storedName).toBe("LocalStorage Name");
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should allow a second update immediately after a successful first update", async ({ page }) => {
      await fillField(page, "Enter Your Name", "First Update");
      await submitForm(page);
      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      await page.waitForTimeout(5250);

      await fillField(page, "Enter Your Name", "Second Update");
      await submitForm(page);
      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue("Second Update");
    });
  });

  test.describe(() => {
    test.afterEach(async ({ page }) => {
      await resetProfile(page);
    });

    test("should persist the updated profile after a full page reload", async ({ page }) => {
      await fillField(page, "Enter Your Name", "Persisted Name");
      await fillField(page, "Enter Your Phone", "55556666");
      await fillField(page, "Enter Your Address", "Persisted Street");
      await submitForm(page);

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
      await page.waitForTimeout(500);

      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue("Persisted Name");
      await expect(page.getByPlaceholder("Enter Your Phone")).toHaveValue("55556666");
      await expect(page.getByPlaceholder("Enter Your Address")).toHaveValue("Persisted Street");
    });
  });

  test("should show an error toast and leave the form unchanged when the server returns an error", async ({ page }) => {
    // Password too short triggers the soft error path (200 + data.error)
    // No afterEach needed — the update is rejected so no cleanup is required
    await fillField(page, "Enter Your Name", "Should Not Save");
    await fillField(page, "Enter Your Password", "123"); // 3 chars — rejected
    await submitForm(page);

    // toast.error is shown, not toast.success
    await expect(page.getByText("Profile Updated Successfully")).not.toBeVisible();
    await expect(page.getByText("Password is required and should be at least 6 characters long")).toBeVisible();

    await expect(
      page.getByRole("button", { name: USER.name })
    ).toBeVisible();

    // localStorage is not updated
    const storedName = await page.evaluate(() => {
      const raw = localStorage.getItem("auth");
      return raw ? JSON.parse(raw).user?.name : null;
    });
    expect(storedName).toBe(USER.name);
  });

  test("should show an error toast when the network request fails", async ({ page }) => {
    await page.route("**/api/v1/auth/profile", (route) => route.abort());

    await fillField(page, "Enter Your Name", "Network Fail");
    await submitForm(page);

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.getByText("Profile Updated Successfully")).not.toBeVisible();
  });

});