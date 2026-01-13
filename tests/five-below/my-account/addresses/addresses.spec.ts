import { test, expect } from '@playwright/test';
import { AddressesPage } from '@pages/five-below/my-account/addresses/addresses.page';

/**
 * Addresses Tests
 *
 * Uses global-setup.ts authentication:
 * - globalSetup runs ONCE before all tests (one login per test run)
 * - Saves session to storageState.json
 * - All tests reuse that session automatically
 * - NO manual auth needed in tests
 *
 * Do NOT run with:
 *  npx playwright test this-file.spec.ts --no-global-setup
 */

test.describe('Addresses (authenticated)', () => {
  // Keeping timeout in case address data is slow to load
  test.setTimeout(60_000);

  let addressesPage: AddressesPage;

  test.beforeEach(async ({ page }) => {
    // Handle any dialogs automatically
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    addressesPage = new AddressesPage(page);
  });

  test('should navigate to Addresses page and display heading and breadcrumb', async () => {
    await addressesPage.goto();
    await addressesPage.expectToBeOnPage();
  });

  test('should display all saved address cards with Remove and Edit buttons', async () => {
    await addressesPage.goto();

    // Verify at least one address card is visible
    await addressesPage.expectAddressList();

    // Verify buttons inside the page object
    await addressesPage.expectAddressButtons();
  });

  test('should display Add Address button as visible and enabled', async () => {
    await addressesPage.goto();

    await expect(addressesPage.addAddressButton).toBeVisible();
    await expect(addressesPage.addAddressButton).toBeEnabled();
  });
});
