import { test, expect } from '@playwright/test';
import { LinkedInLoginPage } from '../pages/LinkedInLoginPage';
import { LinkedInJobPage } from '../pages/LinkedInJobPage';

test.describe('LinkedIn Login and Job Search', () => {
  let loginPage: LinkedInLoginPage;
  let jobPage: LinkedInJobPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LinkedInLoginPage(page);
    jobPage = new LinkedInJobPage(page);
  });

  test('Login to LinkedIn and search for jobs', async ({ page }) => {
    test.setTimeout(1800000); // 30 minutes (enough for ~50 jobs)

    console.log('🚀 Starting LinkedIn login test...');

    // Perform login
    // await loginPage.login();

    // Verify login was successful
    await expect(page).toHaveURL(/linkedin\.com/);
    console.log('✅ Login test completed');

    // Click on Jobs link
    await jobPage.clickJobsLink();

    // Verify we're on the jobs page
    await expect(page).toHaveURL(/linkedin\.com\/jobs/);
    console.log('✅ Navigated to jobs page');

    // Search for a test job
    await jobPage.searchJobs('QA Tester', 'North Rhine-Westphalia, Germany');

    // Wait for results to load
    await page.waitForTimeout(2000);

    // Verify search results are displayed
    const jobCards = await jobPage.getJobCards();
    expect(jobCards.length).toBeGreaterThan(0);
    console.log(`✅ Found ${jobCards.length} job results`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/linkedin-job-search.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');
  });

  test('Verify LinkedIn login only', async ({ page }) => {
    console.log('🚀 Starting LinkedIn login verification...');

    // Perform login
    await loginPage.login();

    // Verify login was successful
    await expect(page).toHaveURL(/linkedin\.com/);

    // Check if logged in
    await jobPage.goToJobsPage();
    const isLoggedIn = await jobPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
    console.log('✅ LinkedIn login verified');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/linkedin-logged-in.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');
  });
});
