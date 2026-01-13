//import { test, expect, authenticateUser } from '@fixtures/auth.fixture'; // << ⚡ ENABLE this line if you want to use one login per spec file (instead of a single login per execution) and remove next one
import { test, expect, TestInfo, Page } from '@playwright/test';
import { MyAccountPage } from '@pages/five-below/my-account/my-account.page';
import { retryPasswordIfNeeded } from '../../../global-setup';


/**
 * My Account Tests
 * 
 * Uses global-setup.ts authentication:
 * - globalSetup runs ONCE before all tests (one login per test run)
 * - Saves session to storageState.json
 * - All tests reuse that session automatically
 * - NO manual auth needed in tests
 * - Do not use this exec command:
 *    npx playwright test packages/commerce/qa-automation/frontend/tests/five-below/my-account/my-account.spec.ts --no-global-setup
 */

// Requires authenticated state provided by global-setup
test.describe('My Account (authenticated)', () => {
  let myAccountPage: MyAccountPage;

  //test.describe.configure({ mode: 'serial' }); // We need to this (SERIAL) because of the Strivacity re-authentication issues MACH-9915 // Chromium / Chrome issue

  // ⚡ ENABLE these lines if you want to use one login per spec file
  /*   let authenticatedPage: any;
    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      authenticatedPage = await context.newPage();
      await authenticateUser(authenticatedPage);
    });  */

  test.beforeEach(async ({ page }) => {
    // Handle any dialogs automatically

    //authenticatedPage.on('dialog', async (dialog: any) => { // << ⚡ ENABLE this line if you want to use one login per spec file and remove next one
    page.on('dialog', async (dialog: any) => {
      await dialog.accept();
    });

    // myAccountPage = new MyAccountPage(authenticatedPage); // << ⚡ ENABLE this line if you want to use one login per spec file and remove next one
    myAccountPage = new MyAccountPage(page);

    mitigateStrivacityReAuth(test.info(), page);
  });

  test('should navigate to My Account page and verify visibility', async () => {
    await myAccountPage.goto();
  });

  test('should display Personal Information section with View All link', async () => {
    //test.setTimeout(60_000); 
    await myAccountPage.goto();
    await expect(myAccountPage.personalInformationSection).toBeVisible();
    await expect(myAccountPage.personalInformationViewAll).toBeVisible();
  });

  test('should display Wallet section with credit card information', async () => {
    await myAccountPage.goto();

    // Verify wallet section is present
    await expect(myAccountPage.walletSection).toBeVisible();
    await expect(myAccountPage.walletViewAll).toBeVisible();

    // Verify wallet content
    await expect(myAccountPage.walletManageCardsText).toBeVisible();

    // Wait for cards to finish loading
    await myAccountPage.waitForCardsToLoad();
    await myAccountPage.expectExistingCardsToBeVisible();

    // Verify existing cards are displayed
    const cards = await myAccountPage.existingCards.all();
    expect(cards.length).toBeGreaterThan(0);
  });

  test('should display credit cards information correctly', async () => {
    await myAccountPage.goto();

    // Wait for cards to render
    await myAccountPage.expectExistingCardsToBeVisible();

    // Verify first card details
    const firstCard = myAccountPage.existingCards.first();
    // Currently there is automation data for this user but if it gives issues, consider deleting next 3 lines
    await expect(firstCard.getByText('John Smith')).toBeVisible();
    await expect(firstCard.getByText('*****0007')).toBeVisible();
    await expect(firstCard.getByText('07/34')).toBeVisible();

    // Verify card logo (SVG, not img tag) - not relying anymore on Visa logo nor mastercard
    await expect(myAccountPage.getCardLogo(firstCard)).toBeVisible();
  });

  test('should display account management buttons', async () => {
    await myAccountPage.goto();
    await expect(myAccountPage.logoutButton).toBeVisible();
    await expect(myAccountPage.deleteAccountButton).toBeVisible();
    await expect(myAccountPage.customerServiceButton).toBeVisible();
    await expect(myAccountPage.faqsButton).toBeVisible();
  });
});

const mitigateStrivacityReAuth = async (testInfo: TestInfo, page: Page) => {
  const projectName = testInfo.project.name.toLowerCase();
  if (projectName.includes('chromium') || projectName.includes('chrome')) {
    await retryPasswordIfNeeded(page);
  }
}