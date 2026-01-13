import { test, expect } from '@playwright/test';
import { OrderHistoryPage } from '@pages/five-below/my-account/order-history/order-history.page';

/**
 * Order History Tests
 *
 * Uses global-setup.ts authentication:
 * - globalSetup runs ONCE before all tests (one login per test run)
 * - Saves session to storageState.json
 * - All tests reuse that session automatically
 * - NO manual auth needed in tests
 *
 * Do NOT run with:
 *  npx playwright test this-file.spec.ts --no-global-setup
 */

// Affected by MACH-8464 - Order History tests require re-authentication
test.describe('Order History (authenticated)', () => {
  // 90s kept intentionally:
  // order history can be slow due to backend aggregation / async data sources
  test.setTimeout(90_000);

  let orderHistoryPage: OrderHistoryPage;

  test.beforeEach(async ({ page }) => {
    // Handle any dialogs automatically
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    orderHistoryPage = new OrderHistoryPage(page);
  });

  test('should navigate to Order History page and verify structure', async () => {
    await orderHistoryPage.goto();
    await orderHistoryPage.expectOrderListToBeVisible();
  });

  test('should display order details correctly', async () => {
    await orderHistoryPage.goto();

    // Get and verify first order details
    const orderDetails = await orderHistoryPage.getFirstOrderDetails();

    expect(orderDetails.date).toBeTruthy();
    expect(orderDetails.total).toMatch(/\$\d+\.\d{2} \| \d+ Items?/);
    expect(orderDetails.orderType).toMatch(/^(Ship to Home|Store Pickup)$/);
  });

  test('should have clickable View Order buttons', async () => {
    await orderHistoryPage.goto();
    await expect(orderHistoryPage.viewOrderButtons.first()).toBeEnabled();
  });
});
