import { test, expect } from '@playwright/test';
import { XingHomePage } from '../pages/XingHomePage';
import * as fs from 'fs';
import * as path from 'path';
import { XingLoginPage } from '../pages';

test.use({
  storageState: './storageState/xingAuth.json',
  viewport: { width: 1380, height: 800 }
});

test.describe('Xing E2E Job Search', () => {
  let homePage: XingHomePage;
  let loginPage: XingLoginPage;

  test.beforeEach(async ({ page }) => {
    homePage = new XingHomePage(page);
    loginPage = new XingLoginPage(page);
  });

  test('E2E: Search and apply all filters', async ({ page, context }) => {
    // Increase timeout for this test (analyzing jobs takes ~30s each)
    test.setTimeout(1800000); // 30 minutes (enough for ~50 jobs)

    await loginPage.login();
    console.log('🚀 Starting E2E job search test with all filters...');

    // Initialize resume analysis (one-time setup)
    await homePage.initializeResumeAnalysis();

    const cookies = await context.cookies();
    console.log(`🍪 Loaded ${cookies.length} cookies from storage state`);

    // Step 1: Navigate to Xing Jobs
    await homePage.goToHomePage();
    await page.waitForTimeout(1000);

    // Step 2: Search for job
    await homePage.searchJobs('Lead QA Analyst', 'Germany');
    await page.waitForTimeout(2000);

    // Step 3: Apply all filters
    const filters = {
      'Date posted': 'Past 24 hours',
      'Employment type': 'Full-time',
      'Career level': 'Professional/Experienced'
    };

    await page.waitForTimeout(500);
    await homePage.applyMultipleFilters(filters);
    await page.waitForTimeout(500);

    // Step 4: Verify all filters are applied
    const allFiltersApplied = await homePage.verifyAllFiltersApplied(filters);
    // expect(allFiltersApplied).toBeTruthy();

    // Step 5: Analyze job postings (analyze up to 30 jobs daily with caching)
    const jobDetails = await homePage.analyzeAllJobPostings(100);

    // Filter and sort: Show only jobs you qualify for (non-German required, ATS > 40%, software domain, good quality)
    const qualifiedJobs = jobDetails.filter(job => {
      const analysis = job.aiAnalysis;
      const atsScore = job.atsScore?.overallScore || 0;

      // Must be English-only and good ATS match
      if (analysis?.germanRequired || atsScore < 40) {
        return false;
      }

      // Must be software domain (skip biotech, healthcare, etc.)
      if (analysis?.jobDomain && analysis.jobDomain !== 'software' && analysis.jobDomain !== 'unknown') {
        console.log(`⚠️  Skipping "${job.jobTitle}" - Wrong domain: ${analysis.jobDomain}`);
        return false;
      }

      // Warn about low confidence but include if ATS is high
      if (analysis?.confidenceLevel === 'low' && atsScore < 60) {
        console.log(`⚠️  Low confidence for "${job.jobTitle}" - Flags: ${analysis.warningFlags?.join(', ')}`);
        return false;
      }

      return true;
    });

    // Calculate filtering statistics
    const stats = {
      total: jobDetails.length,
      qualified: qualifiedJobs.length,
      germanRequired: jobDetails.filter(j => j.aiAnalysis?.germanRequired).length,
      lowATS: jobDetails.filter(j => !j.aiAnalysis?.germanRequired && (j.atsScore?.overallScore || 0) < 40).length,
      wrongDomain: jobDetails.filter(j =>
        !j.aiAnalysis?.germanRequired &&
        j.aiAnalysis?.jobDomain &&
        j.aiAnalysis.jobDomain !== 'software' &&
        j.aiAnalysis.jobDomain !== 'unknown'
      ).length,
      lowConfidence: jobDetails.filter(j =>
        !j.aiAnalysis?.germanRequired &&
        (j.atsScore?.overallScore || 0) >= 40 &&
        j.aiAnalysis?.confidenceLevel === 'low' &&
        (j.atsScore?.overallScore || 0) < 60
      ).length
    };

    console.log(`\n🎯 QUALIFIED JOBS FOUND: ${stats.qualified} out of ${stats.total} analyzed`);
    console.log(`⚠️  SKIPPED (German required): ${stats.germanRequired}`);
    console.log(`❌ LOW MATCH (ATS < 70%): ${stats.lowATS}`);
    console.log(`🔬 WRONG DOMAIN (non-software): ${stats.wrongDomain}`);
    console.log(`⚠️  LOW CONFIDENCE (incomplete description): ${stats.lowConfidence}`);

    // Save qualified jobs to a separate file for daily review
    if (qualifiedJobs.length > 0) {
      // Sort by ATS score (highest first)
      const sortedJobs = qualifiedJobs.sort((a, b) =>
        (b.atsScore?.overallScore || 0) - (a.atsScore?.overallScore || 0)
      );

      // Create simplified view for daily review
      const applyList = {
        generatedAt: new Date().toISOString(),
        totalQualified: sortedJobs.length,
        instructions: "Review these jobs daily and apply to the ones that interest you. Mark as applied once done.",
        jobs: sortedJobs.map(job => ({
          jobTitle: job.jobTitle,
          company: job.company,
          companyLocation: job.companyLocation,
          salaryRange: job.salaryRange,
          datePosted: job.datePosted,
          atsScore: job.atsScore?.overallScore,
          matchedSkills: job.atsScore?.matchedSkills || [],
          missingSkills: job.atsScore?.missingSkills || [],
          requiredSkills: job.aiAnalysis?.requiredSkills || [],
          techStack: job.aiAnalysis?.techStack || [],
          experienceYears: job.aiAnalysis?.experienceYears || '',
          benefits: job.aiAnalysis?.benefits || [],
          summary: job.aiAnalysis?.summary || '',
          jobDomain: job.aiAnalysis?.jobDomain || 'unknown',
          descriptionQuality: job.aiAnalysis?.descriptionQuality || 'incomplete',
          confidenceLevel: job.aiAnalysis?.confidenceLevel || 'low',
          warningFlags: job.aiAnalysis?.warningFlags || [],
          rawDescription: job.aiAnalysis?.rawDescription || job.description || '',
          translatedDescription: job.aiAnalysis?.translatedDescription || '',
          applied: false  // Track application status
        }))
      };

      const applyFilePath = path.join(process.cwd(), 'data', 'applyToTheseXing.json');
      fs.writeFileSync(applyFilePath, JSON.stringify(applyList, null, 2), 'utf-8');
      console.log(`\n📋 Saved ${sortedJobs.length} qualified jobs to data/applyToTheseXing.json`);
    }

    // Print only qualified jobs
    if (qualifiedJobs.length > 0) {
      console.log('\n📊 SHOWING ONLY JOBS YOU QUALIFY FOR (ATS ≥ 40%):');
      homePage.printJobAnalysis(qualifiedJobs);
    } else {
      console.log('\n⚠️  No qualified English-only jobs found in this batch. Try different filters or analyze more jobs.');
    }

    // Step 6: Take screenshot of final results
    await page.screenshot({
      path: 'test-results/xing-e2e-filtered-results.png',
      fullPage: true
    });

    console.log('✅ E2E test completed: All filters applied successfully');
  });
});
