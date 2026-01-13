import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '@pages/five-below/base.page';

export class OrderHistoryPage extends BasePage {
  readonly historyHeading: Locator;
  readonly ordersSection: Locator;
  readonly breadcrumb: Locator;
  readonly orderList: Locator;
  readonly firstOrder: Locator;
  readonly viewOrderButtons: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);
    
    // Main page elements
    this.historyHeading = page.getByText('Order History', { exact: true }).first();
    this.ordersSection = page.locator('article').filter({ has: this.historyHeading });
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    this.loadingIndicator = page.getByText('Loading orders...');
    
    // Order list and order elements
    // Target the container that has all orders
    this.orderList = this.ordersSection
      .locator('div.border-b.border-gray-200')
      .filter({ has: page.getByText(/\$\d+\.\d{2} \| \d+ Items?/) })
      .first();
    this.firstOrder = this.ordersSection
      .locator('div.border-b.border-gray-200')
      .filter({ has: page.getByText(/\$\d+\.\d{2} \| \d+ Items?/) })
      .first();
    this.viewOrderButtons = page.getByRole('button', { name: 'View Order' });
  }

  async goto() {
    await this.navigateAndSetup('/my-account/order-history');
  }

  async expectToBeOnPage() {
    await expect(this.page).toHaveURL('/my-account/order-history');
    // Wait for loading indicator to disappear
    await this.loadingIndicator.waitFor({ state: 'hidden' });
    // Verify at least one View Order button is visible
    await this.viewOrderButtons.first().waitFor({ state: 'visible' });
    await expect(this.historyHeading).toBeVisible();
    await expect(this.breadcrumb).toBeVisible();
  }

  async expectOrderListToBeVisible() {
    // Wait for loading indicator to disappear
    await this.loadingIndicator.waitFor({ state: 'hidden' });
    // Verify at least one View Order button is visible
    await this.viewOrderButtons.first().waitFor({ state: 'visible' });
    // Verify order list elements
    await expect(this.orderList).toBeVisible();
    await expect(this.firstOrder).toBeVisible();
  }

  async getFirstOrderDetails(): Promise<{
    date: string;
    total: string;
    orderType: string;
  }> {
    // Locate the first order container
    const firstOrderInfo = this.firstOrder.locator('div').filter({ 
      has: this.page.getByRole('button', { name: 'View Order' })
    }).first();

    // Get order details
    
    const dateText = await firstOrderInfo
      .getByText(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)
      .textContent();

    const totalText = await firstOrderInfo
      .getByText(/\$\d+\.\d{2} \| \d+ Items?/)
      .textContent();

    const orderType = await firstOrderInfo
      .getByText(/^(Ship to Home|Store Pickup)$/)
      .textContent();
      
    return { 
      date: dateText || '', 
      total: totalText || '', 
      orderType: orderType || ''
    };
  }

  async clickViewOrder() {
    await this.viewOrderButtons.first().click();
  }
}
