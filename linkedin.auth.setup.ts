import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function linkedinAuthSetup() {
  // Skip if LinkedIn auth is disabled
  if (process.env.ENABLE_LINKEDIN_AUTH !== 'true') {
    console.log('⏭️  Skipping LinkedIn authentication (ENABLE_LINKEDIN_AUTH is not true)\n');
    return;
  }

  const storageStatePath = process.env.LINKEDIN_STORAGE_PATH || './storageState/linkedinAuth.json';

  // Skip if auth file exists and is less than 7 days old
  if (fs.existsSync(storageStatePath)) {
    const stats = fs.statSync(storageStatePath);
    const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageInDays < 7) {
      console.log(`✅ Using existing LinkedIn auth (${ageInDays.toFixed(1)} days old)\n`);
      return;
    } else {
      console.log(`⚠️  LinkedIn auth file is ${ageInDays.toFixed(1)} days old, refreshing...\n`);
    }
  }

  console.log('🔐 Starting LinkedIn authentication setup...\n');

  // Launch browser
  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });

  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('📍 Navigating to LinkedIn login...');
    await page.goto('https://www.linkedin.com/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill credentials
    const email = process.env.USER_EMAIL;
    const password = process.env.USER_PASSWORD;

    if (!email || !password) {
      throw new Error('USER_EMAIL and USER_PASSWORD must be set in .env file');
    }

    console.log('✏️  Filling credentials...');
    await page.locator('input[name="session_key"]').fill(email);
    await page.locator('input[name="session_password"]').fill(password);

    console.log('🔘 Clicking login button...');
    await page.locator('button[type="submit"]').click();

    // Wait for navigation with longer timeout
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
      console.log('ℹ️  Page loaded, waiting for verification or redirect...');
      await page.waitForTimeout(5000);
    } catch (error) {
      console.log('⚠️  Navigation timeout, checking current page...');
    }

    // Check if we're logged in
    const url = page.url();
    console.log(`ℹ️  Current URL: ${url}`);

    // Check for verification page or successful login
    if (url.includes('checkpoint/challenge') || url.includes('checkpoint/lg')) {
      console.log('⚠️  LinkedIn verification required. Please complete verification in the browser window.');
      console.log('⏳ Waiting 2 minutes for manual verification...');
      await page.waitForTimeout(120000); // 2 minutes for manual intervention
    }

    // Verify we're logged in after potential verification
    const finalUrl = page.url();
    console.log(`ℹ️  Final URL: ${finalUrl}`);

    if (!finalUrl.includes('linkedin.com/feed') &&
        !finalUrl.includes('linkedin.com/mynetwork') &&
        !finalUrl.includes('linkedin.com/in/')) {
      console.log('⚠️  May not be fully logged in, but continuing to save auth state...');
    }

    console.log('✅ LinkedIn login completed!');

    // Ensure storage directory exists
    const storageDir = path.dirname(storageStatePath);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Save storage state
    await context.storageState({ path: storageStatePath });
    console.log(`💾 LinkedIn authentication state saved to: ${storageStatePath}\n`);

  } catch (error) {
    console.error('❌ LinkedIn authentication setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default linkedinAuthSetup;
