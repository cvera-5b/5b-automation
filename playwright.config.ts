import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Determine base URL from CLI flag or environment variable
 *
 * Supported keys:
 * - staging-ct (default): https://coolstuffstaging-ct.fivebelow.com
 * - dev-ct:              https://coolstuffdev-ct.fivebelow.com
 * - staging:             https://coolstuffstaging.netlify.app (legacy)
 *
 * Priority:
 * 1. CLI flag: --base-url=xxx   (parsed once, persisted to env)
 * 2. ENV var: BASE_URL=xxx
 * 3. Default: staging-ct
 */
export const getBaseURL = (): string => {
  const urlMap: Record<string, string> = {
    'staging-ct': 'https://coolstuffstaging-ct.fivebelow.com/',
    'dev-ct': 'https://coolstuffdev-ct.fivebelow.com/',
    'staging': 'https://coolstuffstaging.netlify.app/',
  };

  /**
   * STEP 1 — Parse CLI flag ONCE and persist it
   * This is critical so workers & tests can see it
   */
  if (!process.env.BASE_URL) {
    const cliArg = process.argv.find(arg => arg.startsWith('--base-url='));
    if (cliArg) {
      const key = cliArg.replace('--base-url=', '');
      if (urlMap[key]) {
        process.env.BASE_URL = key;
      }
    }
  }

  /**
   * STEP 2 — Resolve final base URL from env
   */
  const resolvedKey = process.env.BASE_URL;

  if (resolvedKey && urlMap[resolvedKey]) {
    console.log(`📍 Using base URL: \x1b[1m${resolvedKey}\x1b[0m`);
    return urlMap[resolvedKey];
  }

  /**
   * STEP 3 — Fallback (safe default)
   */
  console.log(`📍 Using default base URL: \x1b[1mstaging-ct\x1b[0m`);
  return urlMap['staging-ct'];
};


// Cache the base URL to avoid multiple function calls and duplicate logging
const CACHED_BASE_URL = getBaseURL();

/**
 * Get environment-specific storage state filename
 * Each environment has its own storageState file to prevent cookie/token mismatches
 */
const getStorageStateFile = (): string => {
  if (CACHED_BASE_URL.includes('dev-ct')) {
    return 'storageState-dev-ct.json';
  } else if (CACHED_BASE_URL.includes('staging-ct')) {
    return 'storageState-staging-ct.json';
  } else if (CACHED_BASE_URL.includes('staging')) {
    return 'storageState-staging.json';
  }

  return 'storageState-staging-ct.json'; // default
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  // Exclude unstable / flaky test suites from default runs and metrics.
  // These tests are explicitly tagged and can be executed on-demand using:
  //   npx playwright test --grep @unstable
  // Tracked as temporary technical debt (see related MACH tickets).
  grepInvert: /@unstable/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Number of retries for failed tests */
  retries: process.env.CI ? 2 : 1, // Retry once locally, twice on CI
  /* Opt out of parallel tests on CI / Maximize parallelization by grouping test files / Configure workers based on available CPU cores */
  workers: process.env.CI ? 1 : '90%',
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: CACHED_BASE_URL,

    /* Extended timeouts for staging environment */
    navigationTimeout: 45000,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Use saved storage state to bypass password-protected page / auth */
    /* Each environment has its own storageState file to prevent cookie/token mismatches */
    storageState: getStorageStateFile(),
  },

  /* Global setup script executed once before all tests */
  globalSetup: require.resolve('./global-setup.ts'), // Handles Netlify password + OIDC login, saves to storageState.json

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chrome-real',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
      }
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
