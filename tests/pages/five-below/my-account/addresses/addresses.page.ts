import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/five-below/base.page';

export class AddressesPage extends BasePage {
  readonly heading: Locator;
  readonly addAddressButton: Locator;
  readonly addressCards: Locator;
  readonly breadcrumb: Locator;
  readonly removeButton: string; // relative selector for each card
  readonly editButton: string;   // relative selector for each card

  constructor(page: Page) {
    super(page);
    // The page uses a <p> element for the visual title (not a semantic heading),
    // so select by visible text rather than getByRole('heading').
    this.heading = page.getByText('Address', { exact: true }).first();
    this.addAddressButton = page.getByRole('button', { name: /add address/i });
    this.addressCards = page.locator('div.overflow-hidden.border.bg-white.flex.flex-col'); // container for each address card
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });

    // Relative selectors for each card
    this.removeButton = 'button:has-text("Remove")';
    this.editButton = 'button:has-text("Edit")';
  }

  async goto() {
    await this.navigateAndSetup('/my-account/addresses');
  }

  async expectToBeOnPage() {
    await expect(this.page).toHaveURL('/my-account/addresses');
    await expect(this.heading).toBeVisible();
    await expect(this.breadcrumb).toBeVisible();
  }

  async expectAddressList() {
    await expect(this.addressCards.first()).toBeVisible();
  }

  // Method to verify Remove/Edit buttons on each address card
  async expectAddressButtons() {
    const count = await this.addressCards.count();
    for (let i = 0; i < count; i++) {
      const card = this.addressCards.nth(i);
      await expect(card.locator(this.removeButton)).toBeVisible({ timeout: 10000 });
      await expect(card.locator(this.editButton)).toBeVisible({ timeout: 10000 });
    }
  }

  async clickAddAddress() {
    await this.addAddressButton.click();
  }

  async getAddressText(index = 0) {
    const addressCard = this.addressCards.nth(index);
    const texts = await addressCard.locator('p').allTextContents();
    return texts.join('\n');
  }

  async clickEditAddress(index = 0) {
    const card = this.addressCards.nth(index);
    await card.locator(this.editButton).click();
  }

  async expectAddressVisible(address: string) {
    await expect(this.page.getByText(address)).toBeVisible();
  }

  // Modal-related methods
  getDeleteModal(): Locator {
    return this.page.locator('role=dialog');
  }

  async clickRemoveAddress(index = 0): Promise<void> {
    const card = this.addressCards.nth(index);
    const removeButton = card.locator(this.removeButton);
    await removeButton.click();
  }

  async expectDeleteModalVisible(): Promise<void> {
    const modal = this.getDeleteModal();
    await expect(modal).toBeVisible({ timeout: 10000 });
  }

  getModalTitle(): Locator {
    const modal = this.getDeleteModal();
    return modal.locator('h2, h3, [role="heading"]').first();
  }

  getModalDescription(): Locator {
    const modal = this.getDeleteModal();
    return modal.locator('p').first();
  }

  getModalCancelButton(): Locator {
    const modal = this.getDeleteModal();
    return modal.locator('button:has-text("Cancel"), button:has-text("close")').first();
  }

  getModalDeleteButton(): Locator {
    const modal = this.getDeleteModal();
    return modal.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
  }

  async getModalButtons(): Promise<Locator[]> {
    const modal = this.getDeleteModal();
    return await modal.locator('button').all();
  }

  async clickModalCancelButton(): Promise<void> {
    const cancelButton = this.getModalCancelButton();
    await cancelButton.click();
  }

  async clickModalDeleteButton(): Promise<void> {
    const deleteButton = this.getModalDeleteButton();
    await deleteButton.click();
  }
}
