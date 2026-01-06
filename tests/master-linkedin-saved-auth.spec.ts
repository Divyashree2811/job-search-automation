import { test, expect } from '@playwright/test';
import { LinkedInJobPage } from '../pages/LinkedInJobPage';

test.describe('LinkedIn with Saved Auth', () => {
  test('Verify saved auth works - access jobs page directly', async ({ page }) => {
    console.log('🚀 Testing LinkedIn with saved authentication...');

    const jobPage = new LinkedInJobPage(page);

    // Navigate directly to jobs page (auth should be loaded from storage)
    await jobPage.goToJobsPage();

    // Verify we're on the jobs page and logged in
    await expect(page).toHaveURL(/linkedin\.com\/jobs/);
    console.log('✅ Navigated to jobs page successfully');

    // Check if we're logged in
    const isLoggedIn = await jobPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
    console.log('✅ Verified we are logged in using saved auth');

    // Search for jobs to verify functionality
    // await jobPage.searchJobs('Software Tester', 'Germany');

    // Wait for results
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/linkedin-saved-auth-success.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');
    console.log('✅ Saved authentication working perfectly!');
  });

  test('Search and analyze jobs with filtering and database', async ({ page }) => {
    test.setTimeout(1800000); // 30 minutes

    console.log('🚀 Starting LinkedIn job analysis with filtering...');

    const jobPage = new LinkedInJobPage(page);

    // Go to jobs page
    await jobPage.goToJobsPage();
    console.log('✅ On jobs page');

    const searchQuery = '"QA Engineer" OR "SDET" OR "Test Automation" OR "Quality Assurance Engineer"';
    console.log(`🔍 Search query: ${searchQuery}`);
    await jobPage.searchJobs(searchQuery, 'Germany');
    await page.waitForTimeout(3000);


    // Filter to most recent jobs (Past 24 hours)
    await jobPage.applyDatePostedFilter('Past week');
    await page.waitForTimeout(3000);

    const jobSearchCount = await jobPage.getResultsCount();
    console.log(`📊 Total jobs available: ${jobSearchCount}`);

    // Get initial visible job cards
    let jobCards = await jobPage.getJobCards();
    console.log(`👁️  Visible job cards: ${jobCards.length}`);
    expect(jobCards.length).toBeGreaterThan(0);

    let analyzedCount = 0;
    let skippedCount = 0;
    let germanMandatoryCount = 0;
    let importantJobsCount = 0;

    // Loop through all available jobs (not just visible ones)
    const maxJobsToProcess = Math.min(jobSearchCount, 50); // Process up to 50 jobs
    console.log(`🎯 Will process up to ${maxJobsToProcess} jobs\n`);

    let currentPage = 1;
    let previousJobCardsLength = 0;

    for (let i = 0; i < maxJobsToProcess; i++) {
      // Refresh job cards list to get newly loaded cards
      jobCards = await jobPage.getJobCards();

      // If we've processed all visible cards, try scrolling or pagination
      if (i >= jobCards.length) {
        console.log(`📜 Scrolling to load more jobs... (current visible: ${jobCards.length})`);

        // Scroll down in the job list container to load more cards
        await page.locator('.scaffold-layout__list').evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });

        await page.waitForTimeout(2000); // Wait for new cards to load
        previousJobCardsLength = jobCards.length;
        jobCards = await jobPage.getJobCards();
        console.log(`👁️  Visible job cards after scroll: ${jobCards.length}`);

        // If no new cards loaded after scroll, try pagination
        if (jobCards.length === previousJobCardsLength || i >= jobCards.length) {
          console.log(`📄 Attempting to go to next page (current page: ${currentPage})...`);

          const hasNextPage = await jobPage.clickNextPage();
          if (!hasNextPage) {
            console.log(`⚠️  No more pages available. Reached end of results.`);
            break;
          }

          // Wait for new page to load
          await page.waitForTimeout(3000);
          currentPage = await jobPage.getCurrentPageNumber();
          console.log(`✅ Now on page ${currentPage}`);

          // Reset to start processing from first card on new page
          jobCards = await jobPage.getJobCards();
          console.log(`👁️  Visible job cards on page ${currentPage}: ${jobCards.length}`);

          if (jobCards.length === 0) {
            console.log(`⚠️  No job cards found on new page. Ending.`);
            break;
          }
        }
      }

      const cardIndex = i % jobCards.length; // Use modulo to cycle through visible cards
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📌 Processing job ${i + 1} of ${maxJobsToProcess} (Card index: ${cardIndex})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Get job card info from left panel BEFORE clicking
      const cardInfo = await jobPage.getJobCardInfo(cardIndex);
      if (!cardInfo) {
        console.log(`⚠️  Could not get job card info, skipping...`);
        skippedCount++;
        continue;
      }

      console.log(`📋 ${cardInfo.title}`);
      console.log(`🏢 ${cardInfo.company}`);

      // Check if already analyzed (using card info from left panel)
      if (jobPage.isJobAlreadyAnalyzed(cardInfo.title, cardInfo.company, cardInfo.location, cardInfo.date)) {
        console.log(`⏭️  SKIPPED - Already analyzed in previous run`);
        skippedCount++;
        continue; // Skip without clicking - more efficient!
      }

      // Click on job card to get full details
      await jobPage.clickJobCard(cardIndex);
      await page.waitForTimeout(2000);

      // Get full job details from right panel
      const jobDetails = await jobPage.getJobDetails();
      if (!jobDetails) {
        console.log(`⚠️  Could not get job details, skipping...`);
        skippedCount++;
        continue;
      }

      // Check if German is mandatory - SKIP if yes
      if (jobPage.shouldSkipJob(jobDetails)) {
        germanMandatoryCount++;
        skippedCount++;
        continue; // Don't save to database
      }

      // Check if important (has key skills)
      const isImportant = jobPage.isImportantJob(jobDetails);
      if (isImportant) {
        importantJobsCount++;
      }

      // Display job details
      console.log(`📍 Location: ${jobDetails.location}`);
      console.log(`📅 Date: ${jobDetails.datePosted}`);
      console.log(`🌍 German: ${jobDetails.isGerman ? 'Yes' : 'No'}`);

      if (jobDetails.aiAnalysis) {
        console.log(`✅ German Required: ${jobDetails.aiAnalysis.germanRequired ? 'YES ⚠️' : 'NO'}`);
        console.log(`🌍 Languages: ${jobDetails.aiAnalysis.languageRequirements.join(', ') || 'Not specified'}`);
        console.log(`🎯 Skills: ${jobDetails.aiAnalysis.requiredSkills.slice(0, 5).join(', ') || 'None'}`);
        console.log(`🔧 Tech: ${jobDetails.aiAnalysis.techStack.slice(0, 5).join(', ') || 'None'}`);
      }

      // Save to database
      jobPage.saveJobToDatabase(jobDetails);
      analyzedCount++;
    }

    // Save important jobs to JSON file
    jobPage.saveImportantJobs();

    // Display summary
    const stats = jobPage.getDatabaseStats();
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 ANALYSIS SUMMARY`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Analyzed in this run: ${analyzedCount}`);
    console.log(`⏭️  Skipped (already analyzed or no data): ${skippedCount}`);
    console.log(`⚠️  Skipped (German mandatory): ${germanMandatoryCount}`);
    console.log(`⭐ Important jobs found: ${importantJobsCount}`);
    console.log(`📁 Total jobs in database: ${stats.total}`);
    console.log(`💾 Important jobs saved to: data/linkedin-important-jobs.json`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/linkedin-job-analysis-complete.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');
  });
});
