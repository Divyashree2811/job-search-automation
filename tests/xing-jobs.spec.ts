import { test, expect } from '@playwright/test';
import { XingHomePage } from '../pages/XingHomePage';

test.describe('Xing Jobs - Using Saved Auth', () => {
  let homePage: XingHomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new XingHomePage(page);
  });

  test('Access Xing Jobs while logged in', async ({ page }) => {
    console.log('🚀 Testing Xing Jobs with saved auth state...');

    // Navigate to Xing Jobs
    await homePage.goToHomePage();

    // Accept cookies if needed
    await homePage.acceptCookies();

    // Verify we're logged in
    const isLoggedIn = await homePage.isLoggedIn();
    console.log(`🔐 Login status: ${isLoggedIn ? 'Logged in' : 'Not logged in'}`);

    // Verify URL
    await expect(page).toHaveURL(/xing\.com/);
    console.log('✅ Successfully accessed Xing Jobs while logged in');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/xing-jobs-logged-in.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');
  });

  test('Search for jobs while logged in', async ({ page }) => {
    console.log('🚀 Testing job search with saved auth state...');

    // Navigate to Xing Jobs
    await homePage.goToHomePage();
    await homePage.acceptCookies();

    // Perform search
    await homePage.searchJobs('Software Engineer', 'Berlin');

    // Take screenshot of search results
    await page.screenshot({
      path: 'test-results/xing-search-logged-in.png',
      fullPage: true
    });
    console.log('✅ Job search completed while logged in');
  });
});
