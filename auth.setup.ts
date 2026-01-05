import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import linkedinAuthSetup from './linkedin.auth.setup';

dotenv.config();

async function globalSetup(config: FullConfig) {
  // Skip auth if SKIP_AUTH is true in .env
  if (process.env.SKIP_AUTH === 'true') {
    console.log('⏭️  Skipping authentication setup (SKIP_AUTH=true)\n');
    return;
  }

  console.log('🚀 Starting global authentication setup...\n');

  // Run LinkedIn auth first if enabled
  await linkedinAuthSetup();

  // Then run Xing auth if enabled
  if (process.env.ENABLE_XING_AUTH !== 'true') {
    console.log('⏭️  Skipping Xing authentication (ENABLE_XING_AUTH is not true)\n');
    return;
  }

  const storageStatePath = process.env.XING_STORAGE_PATH || './storageState/xingAuth.json';

  // Skip if auth file exists and is less than 7 days old
  if (fs.existsSync(storageStatePath)) {
    const stats = fs.statSync(storageStatePath);
    const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) {
      console.log(`✅ Using existing Xing auth (${ageInDays.toFixed(1)} days old)\n`);
      return;
    } else {
      console.log(`⚠️  Xing auth file is ${ageInDays.toFixed(1)} days old, refreshing...\n`);
    }
  }

  console.log('🔐 Starting Xing authentication setup...\n');

  // Launch browser
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'de-DE',
  });

  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('📍 Navigating to Xing login...');
    await page.goto('https://login.xing.com/');

    // Fill credentials
    const email = process.env.USER_EMAIL;
    const password = process.env.USER_PASSWORD;

    if (!email || !password) {
      throw new Error('USER_EMAIL and USER_PASSWORD must be set in .env file');
    }

    console.log('✏️  Filling credentials...');
    await page.locator('input[name="username"]').fill(email);
    await page.locator('input[name="password"]').fill(password);

    console.log('🔘 Clicking login button...');
    await page.locator('button[type = submit]').click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.locator('button[data-testid = uc-accept-all-button]').click();
    console.log('✅ Xing login successful!');

    // Save storage state
    await context.storageState({ path: storageStatePath });
    console.log(`💾 Xing authentication state saved to: ${storageStatePath}\n`);

  } catch (error) {
    console.error('❌ Xing authentication setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ All authentication setups completed!\n');
}

export default globalSetup;
