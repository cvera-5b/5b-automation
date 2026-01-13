import { test as base, Page } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * ⚠️ CURRENTLY UNUSED - Read Below Before Using
 * 
 * This fixture provides manual authentication functionality that is NOT currently used
 * in the project. All tests now use centralized authentication via global-setup.ts.
 * 
 * CURRENT ARCHITECTURE (Recommended):
 * =====================================
 * - global-setup.ts: Runs ONCE per test execution
 *   → Handles Netlify password + OIDC login
 *   → Saves authenticated session to storageState.json
 *   → All tests automatically reuse this single authenticated session
 * 
 * BENEFITS:
 * ✅ One login (~50s) for 100+ tests
 * ✅ Faster execution (tests run 5-10s each, not 45-50s)
 * ✅ Cleaner test code (no auth boilerplate needed)
 * ✅ Centralized credential management
 * ✅ Session is context-aware (detects chromium/firefox/webkit)
 * 
 * HOW TO RE-ENABLE PER-SPEC-FILE AUTHENTICATION (Not Recommended, except on purpose / for debugging):
 * ======================================================================================================
 * 
 * If you need one login per spec file instead of one global login, follow these steps:
 * 
 * 1. In your .spec.ts file, REPLACE this:
 *    ```typescript
 *    import { test, expect } from '@playwright/test';
 *    ```
 *    WITH this:
 *    ```typescript
 *    import { test, expect, authenticateUser } from '@fixtures/auth.fixture';
 *    ```
 * 
 * 2. In your test.describe block, ADD these lines AFTER the let myPageVar declaration:
 *    ```typescript
 *    let authenticatedPage: Page;
 *    
 *    test.beforeAll(async ({ browser }) => {
 *      test.setTimeout(90_000); // Extend timeout for authentication
 *      const context = await browser.newContext();
 *      authenticatedPage = await context.newPage();
 *      await authenticateUser(authenticatedPage);
 *    });
 *    
 *    test.describe.configure({ mode: 'serial' }); // Ensure sequential execution
 *    ```
 * 
 * 3. In your test.beforeEach, REPLACE this:
 *    ```typescript
 *    test.beforeEach(async ({ page }) => {
 *      myAccountPage = new MyAccountPage(page);
 *    });
 *    ```
 *    WITH this:
 *    ```typescript
 *    test.beforeEach(async () => {
 *      authenticatedPage.on('dialog', async (dialog: any) => {
 *        await dialog.accept();
 *      });
 *      myAccountPage = new MyAccountPage(authenticatedPage);
 *    });
 *    ```
 * 
 * 4. Disable global-setup in playwright.config.ts:
 *    COMMENT OUT this line:
 *    ```typescript
 *    globalSetup: require.resolve('./global-setup.ts'),
 *    ```
 *    And COMMENT OUT this line:
 *    ```typescript
 *    storageState: 'storageState.json',
 *    ```
 * 
 * PERFORMANCE COMPARISON:
 * =======================
 * Current (Global Setup):     ~50s login + ~50s tests = ~100s total
 * Per-Spec (This Fixture):    ~50s login × 8 specs = ~400s overhead
 * Per-Test (Old):             ~50s login × 100 tests = ~5000s overhead
 * 
 * RECOMMENDATION:
 * Keep using global-setup.ts unless you have a specific reason to test per-spec authentication.
 * 
 * Auth Fixture with Netlify Password Protection Handling
 * 
 * This fixture handles the complete authentication flow:
 * 1. Handles Netlify password-protected site (if needed)
 * 2. Logs in with email and password via OIDC
 * 
 * RECOMMENDED USAGE (ONE LOGIN PER DESCRIBE BLOCK):
 * ```
 * import { test, expect, authenticateUser } from '@fixtures/auth.fixture';
 * 
 * test.describe('My Feature', () => {
 *   let authenticatedPage: Page;
 * 
 *   test.beforeAll(async ({ browser }) => {
 *     test.setTimeout(90_000);
 *     const context = await browser.newContext();
 *     authenticatedPage = await context.newPage();
 *     await authenticateUser(authenticatedPage);
 *   });
 * 
 *   test('my test 1', async () => {
 *     await authenticatedPage.goto('/my-account');
 *     // No auth overhead, already logged in
 *   });
 *
 *   test('my test 2', async () => {
 *     await authenticatedPage.goto('/other-page');
 *     // Reuses same session from beforeAll
 *   });
 * });
 * ```
 * 
 * LEGACY USAGE (ONE LOGIN PER TEST - not recommended):
 * ```
 * import { test, expect } from '@fixtures/auth.fixture';
 * 
 * test('my test', async ({ authenticatedPage }) => {
 *   // authenticatedPage already logged in
 *   await authenticatedPage.goto('/my-account');
 * });
 * ```
 */

export type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Run authentication before each test
    await authenticateUser(page);
    
    // Use the authenticated page in the test
    await use(page);
    
    // Cleanup after test (if needed)
    // Can add logout or additional cleanup here
  },
});

export { expect } from '@playwright/test';

/**
 * Authenticate the user by:
 * 1. Handle Netlify password protection (if present)
 * 2. Navigate to my-account page (triggers login flow)
 * 3. Fill in email (from .env)
 * 4. Click Continue
 * 5. Fill in password (from .env)
 * 6. Click Continue (login button)
 * 7. Wait for redirect to my-account
 * 
 * This function is exported so it can be used in beforeAll hooks
 * for more efficient test execution (one login per file instead of per test)
 */
export async function authenticateUser(page: Page): Promise<void> {
  const netlifyPassword = process.env.NETLIFY_PASSWORD || '';
  const email = process.env.TEST_USER_EMAIL || 'Carlos.Vera@fivebelow.com';
  const password = process.env.TEST_USER_PASSWORD || '';

  if (!password) {
    throw new Error('TEST_USER_PASSWORD environment variable is not set in .env');
  }

  try {
    console.log('🔐 Starting authentication flow...');
    // await page.pause(); // 🔍 ENABLE this line for real time debugging. e.g. login debug

    // Step 0: Go to base URL to potentially hit the Netlify password gate
    console.log('📍 Navigating to base URL...');
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    // Step 1: Check if Netlify password protection is present
    console.log('🔍 Checking for Netlify password protection...');
    const isPasswordProtected = await page
      .locator('text=Password protected site')
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isPasswordProtected) {
      console.log('🔓 Netlify password protection detected, submitting credentials...');
      
      if (!netlifyPassword) {
        throw new Error('NETLIFY_PASSWORD environment variable is not set in .env');
      }

      // Fill in password and submit
      console.log('⏳ Waiting 3s before typing netlifyPassword...');
      await page.waitForTimeout(3000);
      await page.fill('input[name="password"]', netlifyPassword);
      await page.click('button:has-text("Submit")');

      // Wait for navigation away from password page
      console.log('⏳ Waiting for Netlify password validation...');
      await Promise.race([
        page.waitForLoadState('networkidle', { timeout: 45000 }),
        page.waitForLoadState('domcontentloaded', { timeout: 45000 }),
        page.waitForURL(url => !url.toString().toLowerCase().includes('password'), { timeout: 45000 })
      ]);

      // Verify we left the password page
      const stillOnPasswordPage = await page
        .locator('text=Password protected site')
        .isVisible()
        .catch(() => false);

      if (stillOnPasswordPage) {
        throw new Error('Still on password page after submission');
      }

      console.log('✅ Successfully passed Netlify password protection');
    } else {
      console.log('⚠️ No Netlify password gate detected');
    }

    // Step 2: Navigate to my-account (this will trigger the login flow)
    console.log('📍 Navigating to /my-account...');
    await page.goto('/my-account', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    // Step 3: Check if we're at the email identifier screen
    // Wait for the email input field with a longer timeout
    console.log('⏳ Waiting for email input field...');
    const emailInput = page.locator('input[name="identifier"]');
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });

    // Step 4: Fill email
    console.log('⏳ Waiting 3s before typing email...');
    await page.waitForTimeout(3000);
    console.log(`✉️  Entering email: ${email}`);
    await emailInput.fill(email);

    // Step 5: Click Continue button
    console.log('➡️ Clicking Continue button (email)...');
    await page.locator('[data-button="submit"]').click();

    // Step 6: Wait for password field to appear
    // The password field has name="password"
    console.log('⏳ Waiting for password input field...');
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 30000 });

    // Step 7: Fill password
    console.log('⏳ Waiting 3s before typing password...');
    await page.waitForTimeout(3000);
    console.log('🔒 Entering password...');
    await passwordInput.fill(password);

    // Step 8: Click Continue button (submit password)
    console.log('➡️ Clicking Continue button (password)...');
    await page.locator('[data-button="submit"]').click();

    // Step 9: Wait for OIDC callback redirect to finish
    console.log('⏳ Waiting for OIDC authentication to complete...');

    await page.waitForURL(
      url =>
        !url.toString().includes('oidc') &&
        !url.toString().includes('callback') &&
        !url.toString().includes('login'),
      { timeout: 60000 }
    );

    // Ensure all requests finished
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    console.log('📍 Finalizing authentication, navigating to /my-account...');
    await page.goto('/my-account', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Verify My Account rendered
    await page.locator('h3').first().waitFor({ state: 'visible', timeout: 30000 });

    console.log('✅ Authentication successful!');
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.message);
    
    // Take a screenshot for debugging (only if page is still valid)
    try {
      if (!page.isClosed()) {
        await page.screenshot({ path: `auth-error-${Date.now()}.png` });
      }
    } catch (screenshotError) {
      console.error('Could not capture screenshot:', screenshotError);
    }
    
    throw new Error(`Authentication failed: ${error.message}`);
  }
}
