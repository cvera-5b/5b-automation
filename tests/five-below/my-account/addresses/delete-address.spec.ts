import { test, expect } from '@fixtures/auth.fixture';
import { AddressesPage } from '@pages/five-below/my-account/addresses/addresses.page';

// Skipped for now until we can stabilize the tests - MACH-9915 - dev tech debt
test.describe.skip('@unstable Delete Address (authenticated)', () => {
  // Increase timeout to 60 seconds to account for authentication in beforeEach
  test.setTimeout(60_000);

  let addressesPage: AddressesPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    const page = authenticatedPage;
        addressesPage = new AddressesPage(page);

        // 1️⃣ Mock the final login exchange (Frontastic backend)
        await page.route('**/frontastic/action/myAccountAuth/callback**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    ok: true,
                    access_token: 'fake-access',
                    refresh_token: 'fake-refresh',
                    expires_in: 3600
                })
            });
        });

        // 2️⃣ Mock the /oidc/callback HTML page to avoid the “Woo hoo!” screen
        await page.route('**/oidc/callback**', async route => {
            // Automatically redirect to My Account (or wherever you want)
            return route.fulfill({
                status: 302,
                headers: {
                    location: 'https://coolstuffstaging.netlify.app/my-account/addresses'
                }
            });
        });
    });

  test('should navigate to Addresses page and display expected UI elements (MACH-9172)', async () => {
    // Navigate to addresses page
    await addressesPage.goto();

    // Verify page loaded correctly
    await addressesPage.expectToBeOnPage();

    // Verify key UI elements are present
    await expect(addressesPage.heading).toBeVisible();
    await expect(addressesPage.addAddressButton).toBeVisible();
    await expect(addressesPage.addressCards.first()).toBeVisible();
  });

  test('should display at least one address with Remove and Edit buttons', async () => {
    // Navigate to addresses page
    await addressesPage.goto();
    await addressesPage.expectToBeOnPage();

    // Verify at least one address card exists
    await addressesPage.expectAddressList();

    // Verify Remove and Edit buttons are visible on address cards
    await addressesPage.expectAddressButtons();
  });

  test('should display Delete Address confirmation modal with correct UI structure (MACH-9792)', async () => {
    // Navigate to addresses page
    await addressesPage.goto();
    await addressesPage.expectToBeOnPage();

    // Click Remove on first address
    await addressesPage.clickRemoveAddress(0);

    // Wait for modal to appear
    await addressesPage.expectDeleteModalVisible();

    // Validate modal title
    const modalTitle = addressesPage.getModalTitle();
    await expect(modalTitle).toBeVisible();
    const titleText = await modalTitle.textContent();
    expect(titleText?.toLowerCase()).toContain('delete');

    // Validate modal description/description text
    const modalDescription = addressesPage.getModalDescription();
    await expect(modalDescription).toBeVisible();

    // Validate Cancel button exists
    const cancelButton = addressesPage.getModalCancelButton();
    await expect(cancelButton).toBeVisible();

    // Validate Delete/Confirm button exists
    const deleteButton = addressesPage.getModalDeleteButton();
    await expect(deleteButton).toBeVisible();

    // Verify button labels are correct
    const cancelText = await cancelButton.textContent();
    const deleteText = await deleteButton.textContent();
    expect(cancelText?.trim()).toBeTruthy();
    expect(deleteText?.trim()).toBeTruthy();

    // Close modal
    await addressesPage.clickModalCancelButton();
  });

  test('should have Cancel button that closes the modal without deleting', async () => {
    // Navigate to addresses page
    await addressesPage.goto();
    await addressesPage.expectToBeOnPage();

    // Get the initial address text
    const initialAddressText = await addressesPage.getAddressText(0);

    // Click Remove button on first address
    await addressesPage.clickRemoveAddress(0);

    // Wait for modal to appear
    await addressesPage.expectDeleteModalVisible();

    // Click Cancel button
    await addressesPage.clickModalCancelButton();

    // Verify modal is closed
    await expect(addressesPage.getDeleteModal()).not.toBeVisible();

    // Verify we're still on the addresses page
    await addressesPage.expectToBeOnPage();

    // Verify the address still exists (was not deleted)
    const addressAfterCancel = await addressesPage.getAddressText(0);
    expect(addressAfterCancel).toEqual(initialAddressText);
  });

  test('should display modal with proper button ordering (Cancel then Delete)', async () => {
    // Navigate to addresses page
    await addressesPage.goto();
    await addressesPage.expectToBeOnPage();

    // Click Remove button on first address
    await addressesPage.clickRemoveAddress(0);

    // Wait for modal to appear
    await addressesPage.expectDeleteModalVisible();

    // Get all buttons in the modal
    const buttons = await addressesPage.getModalButtons();
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    // Verify button order and text
    const firstButtonText = await buttons[buttons.length - 2].textContent();
    const secondButtonText = await buttons[buttons.length - 1].textContent();

    // Cancel should come before Delete
    expect(firstButtonText?.trim().toLowerCase()).toMatch(/cancel|close/);
    expect(secondButtonText?.trim().toLowerCase()).toMatch(/delete|confirm/);

    // Close modal
    await addressesPage.clickModalCancelButton();
  });
});
