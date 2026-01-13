// global-setup.ts
/**
 * Global Setup - Runs ONCE before all tests
 * 
 * This script:
 * 1. Handles Netlify password protection (if needed)
 * 2. Performs complete OIDC authentication (email + password login)
 * 3. Saves authenticated session to storageState.json
 * 4. All tests then reuse this single authenticated session
 * 
 * Benefits:
 * - ONE login for all tests (~50s total)
 * - Tests reuse cookies/tokens from storageState.json
 * - Each test runs fast (5-10s instead of 45-50s)
 * - ~45% faster overall execution time
 * - Single source of truth for authentication
 */
import { chromium, firefox, FullConfig, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper: Get environment name from URL
function getEnvironmentName(baseURL: string): string {
  if (baseURL.includes('dev-ct')) return 'dev-ct';
  if (baseURL.includes('staging-ct')) return 'staging-ct';
  if (baseURL.includes('staging')) return 'staging';
  return 'staging-ct'; // default
}

// Define storage state path based on environment
// Each environment has its own storageState to avoid cookie/token mismatches
function getStoragePath(baseURL: string): string {
  const envName = getEnvironmentName(baseURL);
  const filename = `storageState-${envName}.json`;
  return path.resolve(__dirname, filename);
}

const DEBUG_SETUP = process.argv.includes('--global-setup-debug'); // Enable debug mode with --global-setup-debug

// NEW: fresh session detection (env var OR flag)
const USE_FRESH_SESSION =
  process.env.FRESH_SESSION === '1' ||
  process.argv.includes('--fresh-session');

// Helper: check required environment variables
function checkRequiredEnvVars() {
  const required = ['NETLIFY_PASSWORD', 'TEST_USER_EMAIL', 'TEST_USER_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('\n⚠️  Environment Setup Error ⚠️');
    console.log('-----------------------------');
    console.log(`Missing environment variables: ${missing.join(', ')}`);
    console.log('\nTo fix this, create a .env file with:');
    console.log('   NETLIFY_PASSWORD=netlify_password_here');
    console.log('   TEST_USER_EMAIL=user@example.com');
    console.log('   TEST_USER_PASSWORD=your_password_here');
    console.log('-----------------------------\n');
    
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

// Helper: check if storage file contains valid authenticated session (does storage file look like "logged in"?)
// Now not being used anymore but keeeping it if we want to reuse existing sessions later (e.g., skip login if valid session already exists) (*1)
function storageLooksLoggedIn(storageFilePath: string): boolean {
  if (!fs.existsSync(storageFilePath)) return false;

  try {
    const raw = fs.readFileSync(storageFilePath, 'utf-8');
    const obj = JSON.parse(raw);

    // Check cookies for common auth names
    if (Array.isArray(obj.cookies)) {
      for (const c of obj.cookies) {
        const name = String(c.name || '').toLowerCase();
        if (name.includes('token') || name.includes('session') || name.includes('auth') || name.includes('id')) {
          return true;
        }
      }
    }

    // Check localStorage for auth tokens
    if (Array.isArray(obj.origins)) {
      for (const origin of obj.origins) {
        const ls = origin.localStorage;
        if (Array.isArray(ls)) {
          for (const item of ls) {
            const key = String(item.name || '').toLowerCase();
            if (key.includes('id_token') || key.includes('access_token') || key.includes('auth') || key.includes('session')) {
              return true;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ Warning: unable to parse existing storage state:', e);
    return false;
  }

  return false;
}

/**
 * Helper: Detects if we are still on Strivacity password screen
 */
const isPasswordStepVisible = async (page: Page): Promise<boolean> => {
  return page
    .locator('input[name="password"]')
    .isVisible({ timeout: 3000 })
    .catch(() => false);
};

/**
 * Helper: Retry password step once if Strivacity re-prompts it
 */
export const retryPasswordIfNeeded = async (page: Page): Promise<boolean> => {
  console.log('🔍 Checking if password step is still required...');

  const needsPassword = await isPasswordStepVisible(page);
  if (!needsPassword) {
    console.log('✅ No password retry needed');
    return false;
  }

  // MACH-9915 - Sometimes re-prompt for password unexpectedly (with more reason Dev)
  console.log('⚠️🪲 Password screen detected again — retrying password step (once)');

  const password = process.env.TEST_USER_PASSWORD || '';

  await page.waitForTimeout(1000);
  await page.fill('input[name="password"]', password);

  console.log('➡️ Clicking Continue button (password retry)...');
  await page.locator('[data-button="submit"]').click();

  console.log('⏳ Waiting after password retry...');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(5000);

  return true;
};

async function globalSetup(config: FullConfig) {
  // Get base URL from Playwright config (determined in playwright.config.ts)
  const baseURL = config.projects[0].use.baseURL || 'https://coolstuffstaging-ct.fivebelow.com/';
  const STORAGE_PATH = getStoragePath(baseURL);
  const envName = getEnvironmentName(baseURL);

  console.log('\n🔐 Starting global authentication setup...\n');

  if (USE_FRESH_SESSION) { // NEW: fresh-session logic
    if (fs.existsSync(STORAGE_PATH)) {
      console.log(`🗑️  FRESH_SESSION enabled → Removing storageState at ${STORAGE_PATH}`);
      fs.unlinkSync(STORAGE_PATH);
      console.log('   (forcing fresh authentication)\n');
    } else {
      console.log('🆕 FRESH_SESSION enabled but no existing storageState found — starting fresh.\n');
    }
  } else {
    console.log('♻️  Reusing existing storageState (fresh session NOT requested)\n');

    if (fs.existsSync(STORAGE_PATH) && storageLooksLoggedIn(STORAGE_PATH)) {
      console.log(`✅ Detected valid existing session for ${envName} — global-setup will NOT re-authenticate.\n`);
      return;
    }

    if (fs.existsSync(STORAGE_PATH)) {
      console.log(`⚠️ Existing storage for ${envName} found but NOT valid — performing full login flow.\n`);
    } else {
      console.log(`⚠️ No storageState for ${envName} found — performing full login flow.\n`);
    }
  }

  // Check for required environment variables
  console.log('📋 Checking environment variables...');
  checkRequiredEnvVars();
  console.log('✅ All required environment variables found\n');

  // Proceed with authentication
  const maxSetupAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxSetupAttempts; attempt++) {
    // Run the global setup in headed mode as well if specified in the execution command. eg., npx playwright test  --headed -- --global-setup-debug
    const isHeaded = config.projects[0].use.headless === false;

    // Use Firefox for global setup to avoid potential Chromium profile issues with Strivacity / Re-authentication
    //const browser = await chromium.launch({
    const browser = await firefox.launch({
      headless: !isHeaded,
    });
    const page = await browser.newPage();

    console.log(`🌐 Using browser for global-setup: \x1b[1m${browser.browserType().name().toUpperCase()}\x1b[0m\n`);
    
    try {
      console.log(`🚀 Global setup attempt ${attempt}/${maxSetupAttempts}`);

      // baseURL already defined above (used for storage path and environment name)

      // Step 1: Go to base URL
      console.log('📍 Navigating to base URL...');
      await page.goto(baseURL, {
        timeout: 45000,
        waitUntil: 'domcontentloaded', // More permissive than 'networkidle'
      });

      // Step 1.5: Set ForwardToCT cookie for CT environments (staging-ct and dev-ct)
      // This is required for both CT environments - see: https://fivebelow.slack.com/archives/C05LXHQ3VQN/p1734813693878020
      if (baseURL.includes('-ct')) {
        const domain = new URL(baseURL).hostname;
        console.log(`🍪 Setting ForwardToCT cookie for ${domain}...`);
        await page.context().addCookies([
          {
            name: 'ForwardToCT',
            value: 'true',
            domain: domain,
            path: '/',
            expires: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
            httpOnly: false,
            secure: true,
            sameSite: 'Lax',
          }
        ]);
        console.log('✅ ForwardToCT cookie set\n');
        
        // Reload page to apply cookie
        console.log('🔄 Reloading page to apply cookie...');
        await page.goto(baseURL, {
          timeout: 45000,
          waitUntil: 'domcontentloaded',
        });
      }

      // Step 2: Handle Netlify password protection if present
      console.log('🔍 Checking for Netlify password protection...');
      const isPasswordProtected = await page
        .locator('text=Password protected site')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (isPasswordProtected) {
        console.log('🔓 Password protection detected, submitting credentials...');
        const netlifyPassword = process.env.NETLIFY_PASSWORD || '';
        
        await page.waitForTimeout(1000);
        await page.fill('input[name="password"]', netlifyPassword);
        await page.click('button:has-text("Submit")');

        // Wait for navigation away from password page
        console.log('⏳ Waiting for password validation...');
        await Promise.race([
          page.waitForLoadState('networkidle', { timeout: 45000 }),
          page.waitForLoadState('domcontentloaded', { timeout: 45000 }),
          page.waitForURL(url => !url.toString().toLowerCase().includes('password'), { timeout: 45000 })
        ]);

        const stillOnPasswordPage = await page
          .locator('text=Password protected site')
          .isVisible()
          .catch(() => false);

        if (stillOnPasswordPage) {
          throw new Error('Still on password page after submission');
        }

        console.log('✅ Successfully passed Netlify password protection\n');
        
        // After Netlify password, wait for page to be fully ready
        console.log('⏳ Waiting for page to stabilize after password gate...');
        await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
        await page.waitForTimeout(2000); // Extra buffer to ensure the page is fully ready
      } else {
        console.log('⚠️ No Netlify password gate detected\n');
      }

      // Step 3: Navigate to /my-account to trigger OIDC login flow
      console.log('📍 Navigating to /my-account (triggers login flow)...');
      const fullURL = baseURL.endsWith('/') 
        ? baseURL + 'my-account' 
        : baseURL + '/my-account';
      
      await page.goto(fullURL, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });

      // Step 4: Wait for email input and fill it
      console.log('⏳ Waiting for email input field...');
      const emailInput = page.locator('input[name="identifier"]');
      await emailInput.waitFor({ state: 'visible', timeout: 30000 });

      const email = process.env.TEST_USER_EMAIL || '';
      console.log(`✉️  Entering email: ${email}`);
      await page.waitForTimeout(1000);
      await emailInput.fill(email);

      // Step 5: Click Continue (email submit)
      console.log('➡️ Clicking Continue button (email)...');
      await page.locator('[data-button="submit"]').click();

      // Step 6: Wait for password input and fill it
      console.log('⏳ Waiting for password input field...');
      const passwordInput = page.locator('input[name="password"]');
      await passwordInput.waitFor({ state: 'visible', timeout: 30000 });

      const password = process.env.TEST_USER_PASSWORD || '';
      console.log('🔒 Entering password...');
      await page.waitForTimeout(1000);
      await passwordInput.fill(password);

      // Step 7: Click Continue (password submit)
      console.log('➡️ Clicking Continue button (password)...');
      await page.locator('[data-button="submit"]').click();

      // Step 8: Wait for OIDC callback and redirect
      console.log('⏳ Waiting for OIDC authentication to complete...');
      
      try {
        // Wait for the callback URL first (indicates successful auth)
        console.log('📍 Waiting for /oidc/callback URL...');
        await page.waitForURL(url => url.toString().includes('/oidc/callback'), { timeout: 45000 });
        console.log('✅ Reached /oidc/callback');
        
        // Try to wait for redirect away from callback, but don't fail if it times out
        // (The redirect might happen in the background)
        console.log('📍 Waiting for redirect from /oidc/callback...');
        await page.waitForURL(url => !url.toString().includes('/oidc/callback'), { timeout: 30000 }).catch(() => {
          console.log('⚠️ Callback redirect timeout, but continuing (auth likely successful)');
        });
      } catch (callbackError) {
        console.log('⚠️ OIDC callback wait failed, continuing anyway:', (callbackError as any).message);
      }

      // Wait for page to stabilize regardless of callback outcome
      console.log('⏳ Waiting for page to stabilize...');
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000); // Extra buffer to ensure the page is fully ready

      // Step 9: Final navigation to my-account to ensure we're logged in
      console.log('📍 Final navigation to /my-account...');
      const finalURL = baseURL.endsWith('/') 
        ? baseURL + 'my-account' 
        : baseURL + '/my-account';
      
      await page.goto(finalURL, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      // 🔁 STEP 9.5 — PASSWORD RETRY (DEV FIX)
      const retried = await retryPasswordIfNeeded(page);

      if (retried) {
        console.log('🔁 Password retry executed, reloading /my-account...');
        await page.goto(finalURL, { timeout: 60000, waitUntil: 'networkidle' });
      }

      // Take screenshot for verification if in debug mode (--global-setup-debug)
      if (DEBUG_SETUP) {
        const verifyScreenshot = `global-setup-verified-${Date.now()}.png`;
        await page.screenshot({ path: verifyScreenshot }).catch(() => { });
        console.log(`📸 Screenshot saved: ${verifyScreenshot}`);
      }

      // Verify we're logged in
      await page.locator('h3').first().waitFor({ state: 'visible', timeout: 30000 });

      // Step 10: Save storage state
      const storageFilename = path.basename(STORAGE_PATH);
      console.log(`💾 Saving authenticated session to ${storageFilename}...`);
      await page.context().storageState({ path: STORAGE_PATH });

      console.log('✅ Global authentication setup completed successfully!\n'); // and ✅ Storage state saved at ${STORAGE_PATH}
      await browser.close();
      return; // Exit retry loop on success
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      // Take screenshot for debugging if in debug mode (--global-setup-debug)
      try {
        if (DEBUG_SETUP && !page.isClosed()) {
          const errorScreenshot = `global-setup-error-attempt-${attempt}-${Date.now()}.png`;
          await page.screenshot({ path: errorScreenshot });
          console.log(`📸 Error screenshot saved: ${errorScreenshot}`);
        }
      } catch (screenshotError) {
        console.error('Could not capture error screenshot:', screenshotError);
      }

      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }

      if (attempt === maxSetupAttempts) {
        console.error(`\n❌ Global setup failed after ${maxSetupAttempts} attempts.`);
        console.error(`Last error: ${lastError?.message}\n`);
        throw new Error(`Global setup failed after ${maxSetupAttempts} attempts. Last error: ${lastError?.message}`);
      }

      // Wait before retrying
      console.log(`⏳ Waiting 3s before retry...\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

export default globalSetup;
