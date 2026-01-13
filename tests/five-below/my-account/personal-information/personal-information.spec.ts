import { test, expect } from '@playwright/test';
import { PersonalInformationPage } from '@pages/five-below/my-account/personal-information/personal-information.page';

test.describe('Personal Information (authenticated)', () => {
  test.setTimeout(60_000);

  let personalInfoPage: PersonalInformationPage;

  test.beforeEach(async ({ page }) => {
    // Handle any dialogs automatically

    page.on('dialog', async (dialog: any) => {
      await dialog.accept();
    });

    personalInfoPage = new PersonalInformationPage(page);
  });

  test('should navigate to Personal Information page and verify structure', async () => {
    await personalInfoPage.goto();
    await personalInfoPage.expectToBeOnPage();
  });

  test('should display a valid email', async () => {
    await personalInfoPage.goto();
    await personalInfoPage.expectEmail();
  });

  // Skipped: Phone number is now only visible in the edit page (at least for now) /my-account/personal-information/edit
  test.skip('@unstable should display a valid phone number', async () => {
    await personalInfoPage.goto();
    await personalInfoPage.expectPhoneNumber();
  });

  test('should display page subtitle for account management', async () => {
    await personalInfoPage.goto();
    await expect(personalInfoPage.pageSubtitle).toBeVisible();
  });

  test('should have an enabled Edit link', async () => {
    await personalInfoPage.goto();
    await personalInfoPage.expectEditLink();
  });
});
