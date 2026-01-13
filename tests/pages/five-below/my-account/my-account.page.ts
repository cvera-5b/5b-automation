import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/five-below/base.page';

export class MyAccountPage extends BasePage {
  readonly accountHeading: Locator;
  readonly addressesSection: Locator;
  readonly personalInformationSection: Locator;
  readonly personalInformationViewAll: Locator;

  // Wallet
  readonly walletSection: Locator;
  readonly walletViewAll: Locator;
  readonly walletManageCardsText: Locator;
  readonly existingCards: Locator;

  // Account management buttons
  readonly logoutButton: Locator;
  readonly deleteAccountButton: Locator;
  readonly customerServiceButton: Locator;
  readonly faqsButton: Locator;

  // Stuck signed-in message
  readonly stuckSignedInMessage: Locator;
  readonly stuckSignedInHereLink: Locator;

  constructor(page: Page) {
    super(page);

    this.accountHeading = page.getByRole('heading', { level: 3 }).first();
    this.addressesSection = page.getByText('Addresses', { exact: true }).first();
    this.personalInformationSection = page.getByText('Personal Information').first();
    this.personalInformationViewAll = page.getByRole('link', { name: 'View All', exact: true }).first();

    // Wallet section
    this.walletSection = page.getByText('Wallet', { exact: true }).first();
    this.walletViewAll = page.getByRole('link', { name: 'View All', exact: true }).last();
    this.walletManageCardsText = page.getByText('Manage Cards For Easy Online Ordering').first();

    this.existingCards = page
      .locator('div')
      .filter({
        hasText: /\*{5}\d{4}/, // *****1234
      })
      .filter({
        has: page.locator('svg'),
      })
      .locator('xpath=ancestor::li[1]');

    // Account management buttons
    this.logoutButton = page.getByRole('button', { name: 'Log Out' });
    this.deleteAccountButton = page.getByRole('button', { name: 'Delete Account' });
    this.customerServiceButton = page.getByRole('button', { name: 'Contact Us' });
    this.faqsButton = page.getByRole('button', { name: 'FAQs' });

    // Stuck signed-in message
    this.stuckSignedInMessage = page.getByText('You have been successfully signed in', { exact: false });
    this.stuckSignedInHereLink = page.getByRole('link', { name: 'Click Here' });
  }

  async goto() {
    await this.navigateAndSetup('/my-account');

    console.log("⏳ Waiting for post-login redirects...");

    // Wait for any redirect after login
    await this.page.waitForLoadState('networkidle').catch(() => { });

    // Detect either OIDC callback or final My Account URL
    await Promise.race([
      this.page.waitForURL(/oidc\/callback/, { timeout: 8000 }),
      this.page.waitForURL(/my-account/, { timeout: 8000 })
    ]).catch(() => { });

    await this.forceExitOidcCallback();
  }

  async expectToBeOnPage() {
    await expect(this.page).toHaveURL('/my-account');
    await expect(this.accountHeading).toBeVisible({ timeout: 10000 });
  }

  async handleStuckSignedInMessage() {
    // Some accounts get stuck behind a success message requiring an extra click
    console.log(`✅ Detecting if ['You have been successfully signed in'] message is present.`);
    if (await this.stuckSignedInMessage.isVisible({ timeout: 30000 }).catch(() => false)) {
      console.log(`✅ Detected ['You have been successfully signed in'] message. Will click the ['Click Here'] link to proceed.`);
      await this.stuckSignedInHereLink.click();
    }
  }

  async forceExitOidcCallback() {
    const url = this.page.url();
    // console.log(`✅ Current URL: ${url}`);

    if (url.includes('/oidc/callback')) {
      console.log('⚠️ Detected stuck on OIDC callback. Forcing navigation to /my-account...');
      await this.page.goto('/my-account', { waitUntil: 'networkidle' });
    }
  }

  async expectExistingCardsToBeVisible() {
    // Wait for at least one card to be rendered
    await this.existingCards.first().waitFor({ state: 'visible' });
  }

  getCardLogo(card: Locator): Locator {
    // Get the card logo (SVG) from a card element
    // Uses .nth(1) because cards may have multiple SVGs (e.g., Amex logo in background)
    // and don't use first() to avoid picking up the SVG before the "Wallet" section
    return card.locator('svg').nth(1);
  }

  async waitForCardsToLoad() {
    // Wait for Addresses section to load as a reliable indicator that page DOM is ready
    // This gives the wallet section below time to render its cards
    // NOTE: Addresses appears before Wallet in the page, so when it's visible,
    // the page has had time to initialize all sections
    await this.addressesSection.waitFor({ state: 'visible', timeout: 30000 });

    // Wait for loading indicator to disappear (works even if no cards exist)
    await this.page.locator('text=Loading cards…').waitFor({
      state: 'hidden',
      timeout: 30000,
    }).catch(() => { /* ignore if no cards */ });
  }
}
