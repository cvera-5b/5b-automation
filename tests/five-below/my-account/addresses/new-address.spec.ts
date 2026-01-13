import { test, expect } from '@playwright/test';
import { NewAddressPage } from '@pages/five-below/my-account/addresses/new-address.page';

test.describe('New Address Form (authenticated)', () => {
  test.setTimeout(60_000);

  let newAddressPage: NewAddressPage;

  test.beforeEach(async ({ page }) => {
    // Auto-handle dialogs
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    newAddressPage = new NewAddressPage(page);
  });

  test('should navigate to New Address page and verify structure', async () => {
    await newAddressPage.goto();
    await newAddressPage.expectToBeOnPage();
    await newAddressPage.expectFormElements();
  });

  test('should allow filling out the form', async () => {
    await newAddressPage.goto();

    const addressData = {
      firstName: "John",
      lastName: "Doe",
      address: "123 Test Street",
      type: "shipping",
    } as const;

    await newAddressPage.fillForm(
      addressData.firstName,
      addressData.lastName,
      addressData.address,
      addressData.type
    );

    // Verify fields are filled
    await expect(newAddressPage.firstNameInput).toHaveValue(addressData.firstName);
    await expect(newAddressPage.lastNameInput).toHaveValue(addressData.lastName);
    await expect(newAddressPage.addressInput).toHaveValue(addressData.address);
  });

  test('should have enabled Cancel and Save buttons', async () => {
    await newAddressPage.goto();
    await newAddressPage.expectButtons();
  });

  test('should show validation errors when saving empty form', async () => {
    await newAddressPage.goto();

    // Click Save directly without filling form
    await newAddressPage.submitForm();

    // Expect error messages
    await expect(newAddressPage.firstNameError).toBeVisible();
    await expect(newAddressPage.lastNameError).toBeVisible();
    await expect(newAddressPage.addressError.first()).toBeVisible();
  });

  test('should meet accessibility and interaction standards', async () => {
    await newAddressPage.goto();

    // Verify initial form state
    await newAddressPage.expectFormControlsAreValid();

    // Verify form controls have aria-describedby
    await newAddressPage.expectFormControlsHaveDescriptions();

    // Test validation changes aria states
    await newAddressPage.submitForm();
    await newAddressPage.expectFormControlsAreInvalid();

    // Verify button roles
    await newAddressPage.expectButtonsHaveRoles();

    // Verify keyboard navigation
    await newAddressPage.verifyKeyboardNavigation();

    // Verify fixing validation errors
    await newAddressPage.firstNameInput.fill('John');
    await newAddressPage.expectAriaInvalid(newAddressPage.firstNameInput, false);
  });

  test('should have Billing and Shipping options in address type select', async () => {
    await newAddressPage.goto();

    // Verify select visibility and enabled state
    await expect(newAddressPage.addressTypeSelect).toBeVisible();
    await expect(newAddressPage.addressTypeSelect).toBeEnabled();

    // Verify correct options exist
    await newAddressPage.expectAddressTypeOptions();

    // Verify option selection works
    await newAddressPage.verifyAddressTypeSelection();
  });
});
