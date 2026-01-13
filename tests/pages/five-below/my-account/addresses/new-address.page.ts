import { Page, Locator, expect } from '@playwright/test';

export class NewAddressPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly firstNameInput: Locator;
  readonly phoneNumberInput: Locator;
  readonly lastNameInput: Locator;
  readonly addressInput: Locator;
  readonly addressTypeSelect: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  // Validation errors
  readonly firstNameError: Locator;
  readonly lastNameError: Locator;
  readonly addressError: Locator;
  readonly addressDropdownOptions: Locator;

  constructor(page: Page) {
    this.page = page;

    // Headings
    this.pageTitle = page.getByRole('heading', { name: 'Addresses' });
    this.pageSubtitle = page.getByText('Manage Addresses For Your Account');

    // Form fields
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.phoneNumberInput = page.locator('input[name="phone"]');
    this.addressInput = page.locator('input[name="address1"]');
    this.addressTypeSelect = page.locator('select[name="addressType"]');

    // Buttons
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveButton = page.getByRole('button', { name: 'Save' });

    // Validation errors
    this.firstNameError = page.getByText('First name is required');
    this.lastNameError = page.getByText('Last name is required');
    this.addressError = page.getByText('Address is required');

    // Address autocomplete dropdown
    this.addressDropdownOptions = page.locator('.radar-autocomplete-results-list > li');
  }

  async goto() {
    await this.page.goto('/my-account/addresses/new');
  }

  async expectToBeOnPage() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.pageSubtitle).toBeVisible();
  }

  async selectAddressFromDropdown(index = 0) {
    // Wait for the dropdown to appear and select the specified option
    await this.addressDropdownOptions.nth(index).click();
  }

  async fillAddressAndSelect(address: string, dropdownIndex = 0) {
    await this.addressInput.fill(address);
    await this.addressInput.press('ArrowDown');
    await this.selectAddressFromDropdown(dropdownIndex);
  }

  async expectFormElements() {
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.addressInput).toBeVisible();
    await expect(this.addressTypeSelect).toBeVisible();
  }

  async expectButtons() {
    await expect(this.cancelButton).toBeVisible();
    await expect(this.cancelButton).toBeEnabled();
    await expect(this.saveButton).toBeVisible();
    await expect(this.saveButton).toBeEnabled();
  }

  async fillForm(firstName: string, lastName: string, address: string, type: 'billing' | 'shipping') {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.addressInput.fill(address);
    await this.addressTypeSelect.selectOption(type);
  }

  async submitForm() {
    await this.saveButton.click();
  }

  async expectAddressTypeOptions() {
    // Verify options existence
    const options = await this.addressTypeSelect.locator('option').all();
    expect(options.length).toBe(2);

    // Verify text and value of each option
    await expect(options[0]).toHaveText('Billing');
    await expect(options[0]).toHaveAttribute('value', 'billing');
    await expect(options[1]).toHaveText('Shipping');
    await expect(options[1]).toHaveAttribute('value', 'shipping');
  }

  async verifyAddressTypeSelection() {
    // Verify option selection behavior
    await this.addressTypeSelect.selectOption('billing');
    await expect(this.addressTypeSelect).toHaveValue('billing');
    
    await this.addressTypeSelect.selectOption('shipping');
    await expect(this.addressTypeSelect).toHaveValue('shipping');
  }

  // Accessibility helper methods
  async expectHasAriaDescribedby(element: Locator) {
    await expect(element).toHaveAttribute('aria-describedby');
  }

  async expectAriaInvalid(element: Locator, isInvalid: boolean) {
    await expect(element).toHaveAttribute('aria-invalid', isInvalid.toString());
  }

  async expectHasButtonRole(element: Locator) {
    await expect(element).toHaveAttribute('role', 'button');
  }

  // Accessibility group validations
  async expectFormControlsAreValid() {
    for (const input of [this.firstNameInput, this.lastNameInput, this.addressInput]) {
      await this.expectAriaInvalid(input, false);
    }
  }

  async expectFormControlsAreInvalid() {
    for (const input of [this.firstNameInput, this.lastNameInput, this.addressInput]) {
      await this.expectAriaInvalid(input, true);
    }
  }

  async expectFormControlsHaveDescriptions() {
    for (const input of [this.firstNameInput, this.lastNameInput, this.addressInput]) {
      await this.expectHasAriaDescribedby(input);
    }
  }

  async expectButtonsHaveRoles() {
    for (const button of [this.cancelButton, this.saveButton]) {
      await this.expectHasButtonRole(button);
    }
  }

  async verifyKeyboardNavigation() {
    const tabSequence = [this.firstNameInput, this.lastNameInput, this.phoneNumberInput, this.addressInput];
    
    await tabSequence[0].focus();
    for (const input of tabSequence) {
      await expect(input).toBeFocused();
      await this.page.keyboard.press('Tab');
    }
  }
}
