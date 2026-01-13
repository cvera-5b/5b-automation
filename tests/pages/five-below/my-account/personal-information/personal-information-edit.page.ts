import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/five-below/base.page';

export class PersonalInformationEditPage extends BasePage {
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);

    // Page title and subtitle
    // NOTE: pageTitle is a <p> element, not a semantic heading, so use getByText
    this.pageTitle = page.getByText('Personal Information', { exact: true }).first();
    this.pageSubtitle = page.getByText('Manage Personal Information For Your Account', { exact: true });

    // Form inputs
    this.emailInput = page.locator('input[name="email"]');
    this.phoneInput = page.locator('input[name="phone"]');

    // Action buttons
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  async goto() {
    await this.navigateAndSetup('/my-account/personal-information/edit');
  }

  async expectToBeOnPage() {
    // NOTE: The edit endpoint performs authentication token validation (OIDC flow),
    // which causes slower page loads than typical pages. Extended timeouts (120s)
    // are necessary to allow the auth validation to complete before checking visibility.
    await expect(this.page).toHaveURL('/my-account/personal-information/edit');
    await expect(this.pageTitle).toBeVisible({ timeout: 120000 });
    await expect(this.pageSubtitle).toBeVisible({ timeout: 30000 });
  }

  async expectFormElements() {
    // NOTE: The edit endpoint performs authentication token validation (OIDC flow),
    // which causes slower page loads than typical pages. Extended timeouts (120s)
    // are necessary to allow the auth validation to complete before checking visibility.
    await expect(this.emailInput).toBeVisible({ timeout: 120000 });
    await expect(this.phoneInput).toBeVisible({ timeout: 30000 });
  }

  async expectActionButtons() {
    // NOTE: The edit endpoint performs authentication token validation (OIDC flow),
    // which causes slower page loads than typical pages. Extended timeouts (120s)
    // are necessary to allow the auth validation to complete before checking visibility.
    await expect(this.cancelButton).toBeVisible({ timeout: 120000 }); // Testing what happens if only the extra waiting is in the first assertion
    await expect(this.cancelButton).toBeEnabled();
    await expect(this.saveButton).toBeVisible();
    await expect(this.saveButton).toBeEnabled();
  }

  async enterPhoneNumber(value: string) {
    await this.phoneInput.waitFor({ state: 'visible', timeout: 60000 }); // because of the OIDC flow (re auth)
    // Clear the field first to ensure clean state
    await this.phoneInput.clear();
    // Fill with the provided value
    await this.phoneInput.fill(value);
  }

  async getPhoneInputValue(): Promise<string> {
    // Get the current value of the phone input field
    return await this.phoneInput.inputValue();
  }

  async expectPhoneInputEmpty() {
    // Verify that the phone input field is empty
    const value = await this.getPhoneInputValue();
    expect(value).toBe('');
  }

  async expectPhoneInputValue(expectedValue: string) {
    // Verify that the phone input field contains the expected value
    const value = await this.getPhoneInputValue();
    expect(value).toBe(expectedValue);
  }
}
