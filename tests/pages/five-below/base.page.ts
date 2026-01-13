import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  // Method to handle common navigation and setup
  async navigateAndSetup(path: string) {
    await this._goto(path);
    await this._handleModal();
    await this._expectToBeOnPage(path);
  }

  async goto(path: string) {
    await this.navigateAndSetup(path);
  }

  private async _goto(path: string, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Wait for network idle before continuing
        await this.page.goto(path, { 
          waitUntil: 'domcontentloaded',
          timeout: 45000 
        });

        // Wait for main content and any loading indicators to disappear
        await Promise.all([
          this.page.waitForSelector('main', { state: 'visible', timeout: 45000 }),
          this._waitForLoadingStates()
        ]);
        
        return; // Success, exit the retry loop
      } catch (error: any) {
        if (attempt > maxRetries) {
          throw new Error(`Failed to load page after ${maxRetries + 1} attempts: ${error.message || 'Unknown error'}`);
        }
        console.log(`Attempt ${attempt} failed, retrying...`);
        // Optional: Add a small delay between retries
        await this.page.waitForTimeout(2000);
      }
    }
  }

  private async _waitForLoadingStates() {
    try {
      // Wait for common loading indicators to disappear
      await Promise.all([
        // domcontentloaded < load < networkidle (more restrictive / slow)
        // Wait for network requests to finish
        this.page.waitForLoadState('domcontentloaded', { timeout: 45000 }),
        // Wait for any loading spinners or indicators
        this.page.waitForSelector('[role="progressbar"]', { state: 'hidden', timeout: 45000 }).catch(() => {}),
        // Wait for any error messages about loading to disappear
        this.page.waitForSelector('text="Error loading"', { state: 'hidden', timeout: 45000 }).catch(() => {})
      ]);
    } catch (error: any) {
      console.log('Some loading indicators might still be present:', error.message || 'Unknown error');
    }
  }

  private async _handleModal() {
    const modal = this.page.getByRole('dialog', { name: 'Modal Overlay Box' });
    if (await modal.isVisible()) {
      await this.page.keyboard.press('Escape');
      await modal.waitFor({ state: 'hidden' });
    }
  }

  private async _expectToBeOnPage(path: string) {
    await expect(this.page).toHaveURL(path);
  }
}
