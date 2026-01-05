import { test, expect } from '@playwright/test';
import { XingLoginPage } from '../pages/XingLoginPage';

test.describe('Xing Login', () => {
  let loginPage: XingLoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new XingLoginPage(page);
  });

  test('Login to Xing with credentials from .env', async ({ page }) => {
    console.log('🚀 Starting Xing login test...');

    // Perform login
    await loginPage.login();

    // Verify login was successful
    await expect(page).toHaveURL(/xing\.com/);
    console.log('✅ Login test completed');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/xing-logged-in.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');
  });
});
