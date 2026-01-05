import { test, expect } from '@playwright/test';
import { XingHomePage } from '../pages/XingHomePage';
import { XingLoginPage } from '../pages/XingLoginPage';

test.use({
  storageState: "storageState/xingAuth.json",
  viewport: { width: 1700, height: 870 }
});

test.describe('Xing Job Search Automation', () => {
  let homePage: XingHomePage;
  let loginPage: XingLoginPage;

  test.beforeEach(async ({ page }) => {
    homePage = new XingHomePage(page);
    loginPage = new XingLoginPage(page);
  });

  test('Navigate to Xing and verify page loads', async ({ page }) => {
    console.log('🚀 Starting Xing navigation test...');

    await loginPage.login();

    // Accept cookies if present
    await homePage.acceptCookies();

    



  });

});
