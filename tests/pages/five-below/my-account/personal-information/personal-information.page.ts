import { Page, Locator, expect } from '@playwright/test';

export class PersonalInformationPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly editLink: Locator;
  readonly emailLink: Locator;
  readonly phoneText: Locator;

  constructor(page: Page) {
    this.page = page;

    // Title and subtitle
    this.pageTitle = page.getByRole('paragraph').filter({ hasText: /^Personal Information$/ });
    this.pageSubtitle = page.getByText('Manage Personal Information For Your Account', { exact: true });

    // Card content
    this.editLink = page.getByRole('link', { name: 'Edit' });
    this.emailLink = page.getByRole('link').filter({ hasText: '@' });

    // Phone number: <p> with only digits inside the same card
    const cardContainer = this.editLink.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    this.phoneText = cardContainer.locator('p').filter({ hasText: /^\d+$/ }).first();
  }

  async goto() {
    await this.page.goto('/my-account/personal-information');
  }

  async expectToBeOnPage() {
    await expect(this.page).toHaveURL('/my-account/personal-information', {
      timeout: 10000
    });
    await expect(this.pageSubtitle).toBeVisible();
  }

  async expectEmail() {
    await expect(this.emailLink).toBeVisible();
    const email = (await this.emailLink.innerText()).trim();
    expect(email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
  }

  async expectPhoneNumber() {
    await expect(this.phoneText).toBeVisible();
    const phone = (await this.phoneText.innerText()).trim();
    expect(phone).toMatch(/^\d+$/);
  }

  async expectEditLink() {
    await expect(this.editLink).toBeVisible();
    await expect(this.editLink).toBeEnabled();
  }
}
