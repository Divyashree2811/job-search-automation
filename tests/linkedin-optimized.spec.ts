import { test, expect } from '@playwright/test';
import { LinkedInJobPage, LinkedInJobDetails } from '../pages/LinkedInJobPage';
import * as fs from 'fs';
import * as path from 'path';

test.describe('LinkedIn Job Search - OPTIMIZED', () => {
  test('Search and analyze jobs - TWO PHASE (fast data collection, then AI)', async ({ page }) => {
    test.setTimeout(1800000); // 30 minutes

    console.log('🚀 Starting OPTIMIZED LinkedIn job search (2-phase approach)...');
    console.log('📋 Phase 1: Collect raw data (FAST)');
    console.log('🤖 Phase 2: AI analysis (BATCH)');

    const jobPage = new LinkedInJobPage(page);

    // ============================================
    // PHASE 1: COLLECT RAW DATA (FAST!)
    // ============================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 PHASE 1: Collecting raw job data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Go to jobs page
    await jobPage.goToJobsPage();
    console.log('✅ On jobs page');

    const searchQuery = '"QA Engineer" OR "SDET" OR "Test Automation" OR "Quality Assurance Engineer"';
    await jobPage.searchJobs(searchQuery, 'Germany');
    await page.waitForTimeout(3000);

    // Filter to most recent jobs
    await jobPage.applyDatePostedFilter('Past 24 hours');
    await page.waitForTimeout(3000);

    const jobSearchCount = await jobPage.getResultsCount();
    console.log(`📊 Total jobs available: ${jobSearchCount}`);

    let jobCards = await jobPage.getJobCards();
    console.log(`👁️  Visible job cards: ${jobCards.length}`);

    const maxJobsToProcess = Math.min(jobSearchCount, 50);
    console.log(`🎯 Will process up to ${maxJobsToProcess} jobs\n`);

    // Array to hold raw jobs (before AI analysis)
    const rawJobs: LinkedInJobDetails[] = [];
    let skippedAlreadyAnalyzed = 0;
    let currentPage = 1;
    let previousJobCardsLength = 0;

    // PHASE 1: Collect ALL raw job data quickly (no AI yet)
    for (let i = 0; i < maxJobsToProcess; i++) {
      jobCards = await jobPage.getJobCards();

      // Handle pagination/scrolling
      if (i >= jobCards.length) {
        await page.locator('.jobs-search-results-list').evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(2000);
        previousJobCardsLength = jobCards.length;
        jobCards = await jobPage.getJobCards();

        if (jobCards.length === previousJobCardsLength || i >= jobCards.length) {
          const hasNextPage = await jobPage.clickNextPage();
          if (!hasNextPage) break;
          await page.waitForTimeout(3000);
          currentPage = await jobPage.getCurrentPageNumber();
          jobCards = await jobPage.getJobCards();
          if (jobCards.length === 0) break;
        }
      }

      const cardIndex = i % jobCards.length;
      console.log(`📋 [${i + 1}/${maxJobsToProcess}] Extracting job data...`);

      // Check if already analyzed (using card info from left panel)
      const cardInfo = await jobPage.getJobCardInfo(cardIndex);
      if (!cardInfo) {
        console.log(`  ⚠️  Could not get card info, skipping...`);
        continue;
      }

      if (jobPage.isJobAlreadyAnalyzed(cardInfo.title, cardInfo.company, cardInfo.location, cardInfo.date)) {
        console.log(`  ⏭️  Already analyzed: ${cardInfo.title}`);
        skippedAlreadyAnalyzed++;
        continue;
      }

      // Click job card and get RAW details (NO AI ANALYSIS YET!)
      await jobPage.clickJobCard(cardIndex);
      await page.waitForTimeout(1500);

      const rawJobDetails = await jobPage.getJobDetailsRaw();
      if (!rawJobDetails) {
        console.log(`  ⚠️  Could not get job details, skipping...`);
        continue;
      }

      console.log(`  ✅ ${rawJobDetails.jobTitle} - ${rawJobDetails.company}`);
      rawJobs.push(rawJobDetails);
    }

    // Save raw jobs to temp file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, 'temp-jobs-raw.json');
    fs.writeFileSync(tempFilePath, JSON.stringify({ jobs: rawJobs, count: rawJobs.length }, null, 2));

    console.log(`\n💾 Saved ${rawJobs.length} raw jobs to ${tempFilePath}`);
    console.log(`⏭️  Skipped ${skippedAlreadyAnalyzed} already analyzed jobs\n`);

    // ============================================
    // PHASE 2: AI ANALYSIS (BATCH PROCESS)
    // ============================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 PHASE 2: Processing with AI...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let analyzedCount = 0;
    let germanMandatoryCount = 0;
    let importantJobsCount = 0;

    // Process each raw job with AI
    for (let i = 0; i < rawJobs.length; i++) {
      const rawJob = rawJobs[i];
      console.log(`\n🤖 [${i + 1}/${rawJobs.length}] Analyzing: ${rawJob.jobTitle}`);

      // Add AI analysis to the raw job
      const processedJob = await jobPage.processJobWithAI(rawJob);

      // Check if German is mandatory - SKIP if yes
      if (jobPage.shouldSkipJob(processedJob)) {
        console.log(`   ⚠️  German mandatory - SKIPPED`);
        germanMandatoryCount++;
        continue;
      }

      // Check if important
      const isImportant = jobPage.isImportantJob(processedJob);
      if (isImportant) {
        console.log(`   ⭐ IMPORTANT JOB`);
        importantJobsCount++;
      }

      // Display info
      if (processedJob.aiAnalysis) {
        console.log(`   ✅ German Required: ${processedJob.aiAnalysis.germanRequired ? 'YES ⚠️' : 'NO'}`);
        console.log(`   🌍 Languages: ${processedJob.aiAnalysis.languageRequirements.join(', ') || 'Not specified'}`);
        console.log(`   🎯 Skills: ${processedJob.aiAnalysis.requiredSkills.slice(0, 5).join(', ') || 'None'}`);
      }

      // Save to database
      jobPage.saveJobToDatabase(processedJob);
      analyzedCount++;
    }

    // Save important jobs
    jobPage.saveImportantJobs();

    // Display summary
    const stats = jobPage.getDatabaseStats();
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 ANALYSIS SUMMARY`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 Phase 1: Collected ${rawJobs.length} raw jobs`);
    console.log(`🤖 Phase 2: Analyzed ${analyzedCount} jobs with AI`);
    console.log(`⏭️  Skipped (already analyzed): ${skippedAlreadyAnalyzed}`);
    console.log(`⚠️  Skipped (German mandatory): ${germanMandatoryCount}`);
    console.log(`⭐ Important jobs found: ${importantJobsCount}`);
    console.log(`📁 Total jobs in database: ${stats.total}`);
    console.log(`💾 Important jobs saved to: data/linkedin-important-jobs.json`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/linkedin-optimized-complete.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('🗑️  Cleaned up temp file');
    }
  });
});
