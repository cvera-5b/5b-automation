import { test, expect } from '@playwright/test';
import { AddressesPage } from '@pages/five-below/my-account/addresses/addresses.page';
import { NewAddressPage } from '@pages/five-below/my-account/addresses/new-address.page';

/**
 * Edit Address Tests
 *
 * Uses global-setup.ts authentication:
 * - globalSetup runs ONCE before all tests (one login per test run)
 * - Saves session to storageState.json
 * - All tests reuse that session automatically
 * - NO manual auth needed in tests
 *
 * NOTE:
 * These tests modify the same persistent account address and can
 * interfere with each other when run in parallel.
 * To avoid flaky failures caused by this race condition,
 * we intentionally run this suite serially.
 */

test.describe.serial('Edit Address (authenticated)', () => {
  test.setTimeout(60_000);

  let addressesPage: AddressesPage;
  let newAddressPage: NewAddressPage;

  test.beforeEach(async ({ page }) => {
    addressesPage = new AddressesPage(page);
    newAddressPage = new NewAddressPage(page);
  });

  test('should save without changes and verify data persistence', async () => {
    // Navigate to addresses page
    await addressesPage.goto();
    await addressesPage.expectToBeOnPage();

    // Click edit on the first address
    await addressesPage.clickEditAddress();

    // Capture current form values
    const firstName = await newAddressPage.firstNameInput.inputValue();
    const lastName = await newAddressPage.lastNameInput.inputValue();
    const address1 = await newAddressPage.addressInput.inputValue();

    // Click Save without making any changes
    await newAddressPage.saveButton.click();

    // Verify we're back on the addresses page
    await addressesPage.expectToBeOnPage();

    // Verify the displayed address still contains the same values
    const cardText = await addressesPage.getAddressText();
    expect(cardText).toContain(firstName);
    expect(cardText).toContain(lastName);
    expect(cardText).toContain(address1);
  });

  test('should edit address and toggle between two addresses', async () => {
    // Constants for our test addresses
    const address123 = '123 Miraflor Blvd';
    const address987 = '987 Num 185 Urb La Roca';

    // Navigate to addresses page
    await addressesPage.goto();
    await addressesPage.expectToBeOnPage();

    // Get current address text
    const currentAddress = await addressesPage.getAddressText();
    const isAddress123 = currentAddress.includes(address123);

    // Click edit on the first address
    await addressesPage.clickEditAddress();

    // Fill in the new address based on current address
    if (isAddress123) {
      await newAddressPage.fillAddressAndSelect(address987);
    } else {
      await newAddressPage.fillAddressAndSelect(address123);
    }

    // Save the changes
    await newAddressPage.saveButton.click();

    // Verify we're back on the addresses page
    await addressesPage.expectToBeOnPage();

    // Verify the new address is visible
    const expectedAddress = isAddress123 ? address987 : address123;
    await addressesPage.expectAddressVisible(expectedAddress);
  });
});
