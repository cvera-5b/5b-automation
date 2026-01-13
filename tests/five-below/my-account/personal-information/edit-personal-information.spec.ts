import { test, expect } from '@playwright/test';
import { PersonalInformationEditPage } from '@pages/five-below/my-account/personal-information/personal-information-edit.page';

/**
 * Edit Personal Information (authenticated)
 *
 * Uses global-setup.ts authentication:
 * - Login executed ONCE per test run
 * - Session restored via storageState
 * - No manual auth or shared contexts inside tests
 *
 * Do NOT run with:
 *  npx playwright test this-file.spec.ts --no-global-setup
 */

test.describe('Edit Personal Information (authenticated)', () => {
  /**
   * Session validation on the edit endpoint may require additional backend checks
   * (see MACH-8464), so we keep a higher per-test timeout.
   *
   * This applies to EACH test (not the whole suite runtime).
   */
  test.setTimeout(90_000);

  let personalInfoEditPage: PersonalInformationEditPage;

  test.beforeEach(async ({ page }) => {
    // Handle any dialogs automatically
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    personalInfoEditPage = new PersonalInformationEditPage(page);
  });

  test('should navigate to Personal Information Edit page and verify structure', async () => {
    // MACH-9173: Validate that the edit page loads and displays expected UI elements
    await personalInfoEditPage.goto();
    await personalInfoEditPage.expectToBeOnPage();
  });

  test('should display form elements on Personal Information Edit page', async () => {
    await personalInfoEditPage.goto();
    await personalInfoEditPage.expectFormElements();
  });

  test('should display action buttons on Personal Information Edit page', async () => {
    await personalInfoEditPage.goto();
    await personalInfoEditPage.expectActionButtons();
  });

  test('should reject alphabetic characters in Phone Number field', async () => {
    // MACH-9775: Validate that the Phone Number field rejects alphabetic input
    await personalInfoEditPage.goto();

    // Attempt to enter alphabetic characters
    await personalInfoEditPage.enterPhoneNumber('abc');
    // Field should remain empty or reject the characters
    await personalInfoEditPage.expectPhoneInputEmpty();
  });

  test('should reject special characters in Phone Number field', async () => {
    // MACH-9775: Validate that the Phone Number field rejects special characters
    await personalInfoEditPage.goto();

    // Attempt to enter special characters
    await personalInfoEditPage.enterPhoneNumber('@#$%');
    // Field should remain empty or reject the characters
    await personalInfoEditPage.expectPhoneInputEmpty();
  });

  test('should accept numeric input in Phone Number field', async () => {
    // MACH-9775: Validate that the Phone Number field accepts numeric input
    await personalInfoEditPage.goto();

    // Enter numeric input
    const testPhoneNumber = '(703)555-5678'; // Example formatted number - We can use simple digits if needed, but when saving it formats it this way
    await personalInfoEditPage.enterPhoneNumber(testPhoneNumber);
    // Field should contain the numeric value
    await personalInfoEditPage.expectPhoneInputValue(testPhoneNumber);
  });
});
