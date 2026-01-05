import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportFolder = path.join('test-results', `run-${timestamp}`);

// Determine which storage state to use based on enabled platform
const linkedinStoragePath = process.env.LINKEDIN_STORAGE_PATH || './storageState/linkedinAuth.json';
const xingStoragePath = process.env.XING_STORAGE_PATH || './storageState/xingAuth.json';

// Check which platform auth is enabled
const useLinkedInAuth = process.env.ENABLE_LINKEDIN_AUTH === 'true' &&
                        fs.existsSync(linkedinStoragePath) &&
                        fs.statSync(linkedinStoragePath).size > 0;

const useXingAuth = process.env.ENABLE_XING_AUTH === 'true' &&
                    fs.existsSync(xingStoragePath) &&
                    fs.statSync(xingStoragePath).size > 0;

// Use LinkedIn auth if enabled, otherwise Xing auth
const storageStatePath = useLinkedInAuth ? linkedinStoragePath : (useXingAuth ? xingStoragePath : undefined);
const useStorageState = useLinkedInAuth || useXingAuth;

// Log which auth is being used
if (useLinkedInAuth) {
  console.log('🔗 Using LinkedIn authentication');
} else if (useXingAuth) {
  console.log('🔗 Using Xing authentication');
} else {
  console.log('⚠️  No authentication state found');
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  globalSetup: require.resolve('./auth.setup.ts'),
  reporter: [
    ['html', { outputFolder: reportFolder, open: 'never' }],
    ['junit', { outputFile: path.join(reportFolder, `results-${timestamp}.xml`) }],
    ['json', { outputFile: path.join(reportFolder, `results-${timestamp}.json`) }],
  ],

  use: {
  baseURL: useLinkedInAuth ? 'https://www.linkedin.com' : 'https://www.xing.com',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  locale: useLinkedInAuth ? 'en-US' : 'de-DE',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: useStorageState ? storageStatePath : undefined,
        headless: false,
        screenshot: 'only-on-failure',
        viewport: { width: 1280, height: 800 }
       },
    }
  ],
});
