import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { JobAnalyzer, AIJobAnalysis } from '../helpers/JobAnalyzer';
import { ResumeAnalyzer, ATSScore } from '../helpers/ResumeAnalyzer';
import { JobDatabase } from '../helpers/JobDatabase';
import * as path from 'path';

export interface JobDetails {
  jobTitle: string;
  company: string;
  companyLocation: string;
  salaryRange: string;
  datePosted: string;
  languages: string[];
  description: string;
  isGerman: boolean;
  aiAnalysis?: AIJobAnalysis;
  translatedDescription?: string;
  atsScore?: ATSScore;
}

export class XingHomePage extends BasePage {
  // Filter configurations
  private readonly filterTypes: Record<string, 'button' | 'slider'> = {
    'Date posted': 'button',
    'Search radius': 'slider',
    'Workplace': 'button',
    'Employment type': 'button',
    'Career level': 'button',
    'Salary': 'slider'
  };

  private jobAnalyzer: JobAnalyzer;
  private resumeAnalyzer: ResumeAnalyzer;
  private jobDatabase: JobDatabase;

  constructor(page: Page) {
    super(page);
    this.jobAnalyzer = new JobAnalyzer();
    this.resumeAnalyzer = new ResumeAnalyzer();
    this.jobDatabase = new JobDatabase();
  }

  async initializeResumeAnalysis() {
    const resumePath = path.join(process.cwd(), 'resume', 'Divyashree_CV_Lebenslauf_Senior_SDET.pdf');
    await this.resumeAnalyzer.loadResumeFromPDF(resumePath);
  }

  async goToHomePage() {
    await this.page.goto('https://www.xing.com/jobs');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(500);
    console.log('✅ Navigated to Xing Jobs page');
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      // Check for user profile/account elements
      const accountMenu = this.page.locator('[data-testid="account-menu"], .user-menu, [aria-label*="profile"], [aria-label*="Profil"]');
      return await accountMenu.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  async acceptCookies() {
    try {
      // Common cookie consent selectors for Xing
      const cookieButton = this.page.locator(
        'button:has-text("Accept"), button:has-text("Accept all"), button:has-text("Akzeptieren"), button:has-text("Alle akzeptieren"), #consent-accept-button'
      );

      if (await cookieButton.isVisible({ timeout: 5000 })) {
        await cookieButton.first().click();
        console.log('✅ Accepted cookies');
        await this.page.waitForTimeout(1000);
      } else {
        console.log('ℹ️  No cookie banner found');
      }
    } catch (error) {
      console.log('ℹ️  Cookie banner not found or already accepted');
    }
  }

  async searchJobs(jobTitle: string, location: string = 'Germany') {
    console.log(`🔍 Searching for: ${jobTitle} in ${location || 'all locations'}`);

    try {
      // Wait for page to be ready
      await this.page.waitForLoadState('domcontentloaded');
      // await this.page.waitForTimeout(2000);

      // Look for the main search input
      const searchInput = this.page.locator('input[data-testid="search-bar-fake-input"]').first();

      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.click();
        console.log('✅ Entered search term');
        const searchTextInput = this.page.locator('textarea[data-xds="InputBar"]').first();
        await searchTextInput.fill(jobTitle);
        const locationInput = this.page.locator('input[placeholder="Location"]').first();
        await locationInput.fill(location);
        const searchButton = this.page.locator('button[type="submit"]').first();
        // await this.page.press('Enter');
      
        await searchButton.click();
        // await this.page.waitForLoadState('networkidle');
        console.log('✅ Search completed');
      } else {
        console.log('⚠️  Search input not found');
      }
    } catch (error) {
      console.log('⚠️  Search failed:', error);
    }
  }

  async applyFilter(filterName: string, option: string) {
    console.log(`🔧 Applying filter: ${filterName} = ${option}`);

    try {
      // Get filter type
      const filterType = this.filterTypes[filterName];

      if (!filterType) {
        console.log(`⚠️  Unknown filter: ${filterName}`);
        return;
      }

      // Find and click the filter section
      // const filterSection = this.page.locator(`text="${filterName}"`).first();
      // await filterSection.scrollIntoViewIfNeeded();

      // if (!(await filterSection.isVisible({ timeout: 5000 }))) {
      //   console.log(`⚠️  Filter section "${filterName}" not found`);
      //   return;
      // }

      // Apply filter based on type
      if (filterType === 'button') {
        await this.applyButtonFilter(filterName, option);
      } else if (filterType === 'slider') {
        await this.applySliderFilter(filterName, option);
      }

      console.log(`✅ Applied filter: ${filterName} = ${option}`);

    } catch (error) {
      console.log('⚠️  Applying filter failed:', error);
    }
  }

  private async applyButtonFilter(filterName: string, option: string) {
    try {
      // Close any blocking modals/popups first
      const closeModalButton = this.page.locator('button[aria-label="Close"], button:has-text("×")').first();
      if (await closeModalButton.isVisible({ timeout: 1000 })) {
        await closeModalButton.click();
        await this.page.waitForTimeout(500);
      }
    } catch {
      // Modal not found, continue
    }

    // Wait for the filter sidebar to be loaded
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);

    // Try to find the button directly and click it
    const button = this.page.locator(`button:has-text("${option}")`).first();

    try {
      // Wait for button to exist
      await button.waitFor({ state: 'attached', timeout: 5000 });

      // Scroll into view and click
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await this.page.waitForTimeout(500);
      console.log(`✅ Clicked filter option: ${option}`);
      return;
    } catch (error) {
      console.log(`⚠️  Option "${option}" not found for filter "${filterName}"`);
    }
  }

  private async applySliderFilter(filterName: string, value: string) {
    // Handle slider-type filters (e.g., radius, salary)
    console.log(`🎚️  Setting slider for ${filterName} to ${value}`);

    // Find the slider input
    const sliderInput = this.page.locator(`input[type="range"], input[type="number"]`).first();

    if (await sliderInput.isVisible({ timeout: 3000 })) {
      await sliderInput.fill(value);
      await this.page.waitForTimeout(500);
    } else {
      console.log(`⚠️  Slider not found for "${filterName}"`);
    }
  }

  async applyMultipleFilters(filters: Record<string, string>) {
    console.log('🔧 Applying multiple filters...');

    for (const [filterName, option] of Object.entries(filters)) {
      await this.applyFilter(filterName, option);
      // await this.page.waitForTimeout(500); // Small delay between filters
    }

    console.log('✅ All filters applied');
  }

  async verifyFilterApplied(filterText: string): Promise<boolean> {
    try {
      // Check if filter appears in applied filters nav
      const appliedFiltersNav = this.page.locator('//div[contains(@class,"results-styles")]/nav[@data-testid="applied-filters"]');
      const filterElement = appliedFiltersNav.locator(`button div span:has-text("${filterText}")`);

      const isVisible = await filterElement.isVisible({ timeout: 3000 });

      if (isVisible) {
        console.log(`✅ Filter verified: "${filterText}" is applied`);
        return true;
      } else {
        console.log(`❌ Filter not found: "${filterText}" is not in applied filters`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Failed to verify filter: "${filterText}"`, error);
      return false;
    }
  }

  async verifyAllFiltersApplied(filters: Record<string, string>): Promise<boolean> {
    console.log('🔍 Verifying all applied filters...');
    let allVerified = true;

    for (const [filterName, option] of Object.entries(filters)) {
      const isApplied = await this.verifyFilterApplied(option);
      if (!isApplied) {
        allVerified = false;
      }
    }

    if (allVerified) {
      console.log('✅ All filters verified successfully');
    } else {
      console.log('⚠️  Some filters were not applied');
    }

    return allVerified;
  }

  async getJobPostingsCount(): Promise<number> {
    // Wait for job cards to load
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);

    const jobCards = this.page.locator('article[data-xds="Card"]');
    const count = await jobCards.count();
    console.log(`📋 Found ${count} job postings`);
    return count;
  }

  async clickJobPosting(index: number): Promise<Page> {
    console.log(`🖱️  Clicking job posting #${index + 1}`);

    const jobCards = this.page.locator('article[data-xds="Card"]');
    const jobCard = jobCards.nth(index);

    await jobCard.scrollIntoViewIfNeeded();

    // Wait for new tab to open
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      jobCard.click()
    ]);

    // Wait for new tab to load
    await newPage.waitForLoadState('domcontentloaded');
    // await newPage.waitForTimeout(1000);

    console.log(`✅ Opened job in new tab`);
    return newPage;
  }

  async extractJobDetails(jobPage: Page): Promise<JobDetails> {
    console.log('📝 Extracting job details from new tab...');

    // Wait for page to be fully loaded
    await jobPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await jobPage.waitForTimeout(9500); // Wait for "similar jobs" pop-up to appear

    // Close "Want to hear about similar jobs?" pop-up
    try {
      const popupSelectors = [
        'button:has-text("No thanks")',
        'button:has-text("Nein danke")',
        'button:has-text("Close")',
        'button:has-text("Schließen")',
        '[aria-label*="close" i]',
        '[data-testid*="close"]'
      ];

      for (const selector of popupSelectors) {
        try {
          const button = jobPage.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            await button.click();
            console.log('✅ Closed "similar jobs" pop-up');
            await jobPage.waitForTimeout(500);
            break;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // No pop-up or already closed
    }

    // Extract job title
    let jobTitle = 'N/A';
    try {
      jobTitle = await jobPage.locator('h1').first().textContent({ timeout: 5000 }) || 'N/A';
    } catch {
      console.log('⚠️  Could not find job title');
    }

    // Extract company name - try multiple selectors
    let company = 'N/A';
    const companySelectors = [
      'div[class*="job-intro__CompanyInfo"] p',  // Specific XING selector
      '[data-testid="company-name"]',
      'a[href*="/companies/"]',
      'h2',
      'span:has-text("Company"), span:has-text("Unternehmen")'
    ];

    for (const selector of companySelectors) {
      try {
        // For the CompanyInfo section, get all p elements and join them
        if (selector === 'div[class*="job-intro__CompanyInfo"] p') {
          const paragraphs = await jobPage.locator(selector).allTextContents();
          if (paragraphs && paragraphs.length > 0) {
            company = paragraphs.map(p => p.trim()).filter(p => p.length > 0).join(' | ');
            if (company.length > 0) break;
          }
        } else {
          const text = await jobPage.locator(selector).first().textContent({ timeout: 2000 });
          if (text && text.trim().length > 0) {
            company = text;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    // Extract salary range
    let salaryRange = 'N/A';
    try {
      const salaryElement = jobPage.locator('text=/€|CHF|salary|Gehalt/i').first();
      if (await salaryElement.isVisible({ timeout: 2000 })) {
        salaryRange = await salaryElement.textContent() || 'N/A';
      }
    } catch {
      // Salary not found
    }

    // Extract date posted
    let datePosted = 'N/A';
    try {
      const dateElement = jobPage.locator('text=/ago|day|week|month|vor/i').first();
      if (await dateElement.isVisible({ timeout: 2000 })) {
        datePosted = await dateElement.textContent() || 'N/A';
      }
    } catch {
      // Date not found
    }

    // Close any pop-ups or overlays first
    try {
      // Try to close "Similar jobs" or other pop-ups
      const closeButtons = [
        'button[aria-label*="close" i]',
        'button[aria-label*="schließen" i]',
        '[data-testid="close-button"]',
        'button:has-text("Close")',
        'button:has-text("Schließen")',
        '.modal-close',
        '[class*="close"]'
      ];

      for (const selector of closeButtons) {
        try {
          const closeBtn = jobPage.locator(selector).first();
          if (await closeBtn.isVisible({ timeout: 1000 })) {
            await closeBtn.click();
            console.log('✅ Closed pop-up');
            await jobPage.waitForTimeout(500);
            break;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // No pop-up to close
    }

    // Scroll down to ensure all content is loaded
    try {
      await jobPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await jobPage.waitForTimeout(1000);
    } catch {
      // Scroll failed, continue
    }

    // Detect if this is an external job redirect
    const currentUrl = jobPage.url();
    const isExternalJob = !currentUrl.includes('xing.com');
    if (isExternalJob) {
      console.log(`🔗 External job detected: ${new URL(currentUrl).hostname}`);
    }

    // Extract full page text as description using more specific selectors
    let description = 'N/A';
    let descriptionQuality: 'complete' | 'incomplete' | 'generic' = 'incomplete';

    try {
      // Try multiple selectors for the main job description area (excluding sidebars/similar jobs)
      const contentSelectors = isExternalJob ? [
        // External job sites - try to get full content
        'main',
        '[role="main"]',
        'article',
        '[class*="job-description"]',
        '[class*="job-detail"]',
        '[id*="job-description"]',
        '[id*="job-detail"]',
        'body'  // Last resort
      ] : [
        // XING native jobs - use specific description container (excludes Similar jobs section)
        '[class*="description__DescriptionContainer"] main',  // Primary: excludes footer/similar jobs
        '[class*="description__DescriptionContainer"]',        // Fallback without main
        '[class*="JobDetail"] main',                          // Older XING layout
        'main'  // Last resort
      ];

      for (const selector of contentSelectors) {
        try {
          const element = jobPage.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            // Use innerText for better dynamic content handling
            let content = await element.innerText({ timeout: 2000 });

            if (content && content.trim().length > 100) {
              description = content;
              console.log(`✅ Extracted content using selector: ${selector}`);
              break;
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      console.log('⚠️  Could not extract page content');
    }

    description = description.trim();

    // Clean up: Remove everything after "Similar jobs" section or other footer markers
    const endMarkers = [
      'Similar jobs',
      'Ähnliche Jobs',
      'Ähnliche Stellenangebote',
      'More jobs like this',
      'Want to hear about similar jobs',
      'Möchten Sie über ähnliche Jobs',
      'Save this job',
      'Speichern Sie diese Stelle',
      'Share job',
      'Stelle teilen',
      'Apply now',  // Only if it appears near the end as a button section
      'Jetzt bewerben'
    ];

    let cleanedDescription = description;
    let foundMarkerAt = -1;

    for (const marker of endMarkers) {
      const markerIndex = description.indexOf(marker);
      // Only cut if marker is found after substantial content (> 500 chars)
      if (markerIndex > 500 && (foundMarkerAt === -1 || markerIndex < foundMarkerAt)) {
        foundMarkerAt = markerIndex;
      }
    }

    if (foundMarkerAt > 500) {
      cleanedDescription = description.substring(0, foundMarkerAt).trim();
      console.log(`✅ Cleaned description (removed content after position ${foundMarkerAt})`);
    }

    description = cleanedDescription;

    // Validate description quality
    const hasRequirements = /requirement|qualification|must have|skills|experience|education/i.test(description);
    const hasResponsibilities = /responsibilit|duties|you will|role involves/i.test(description);
    const isGeneric = description.length < 300 || /equal opportunity|privacy policy|sign up|subscribe/i.test(description);

    if (hasRequirements && hasResponsibilities && !isGeneric) {
      descriptionQuality = 'complete';
    } else if (isGeneric) {
      descriptionQuality = 'generic';
      console.log('⚠️  Description appears to be generic/incomplete');
    } else {
      descriptionQuality = 'incomplete';
      console.log('⚠️  Description missing key sections (requirements or responsibilities)');
    }

    // Detect if description is in German and extract language requirements
    const isGerman = this.detectGerman(description);
    const languages = this.extractLanguages(description);

    // Analyze job with AI (translation + extraction)
    let aiAnalysis;
    let translatedDescription;

    try {
      const analysis = await this.jobAnalyzer.analyzeJob(description, isGerman);
      aiAnalysis = analysis;
      translatedDescription = analysis.translatedDescription;
    } catch (error) {
      console.log('⚠️  AI analysis skipped:', error);
    }

    // Calculate ATS Score
    let atsScore;
    if (aiAnalysis) {
      try {
        console.log('📊 Calculating ATS score...');
        atsScore = this.resumeAnalyzer.calculateATSScore(
          aiAnalysis.requiredSkills || [],
          aiAnalysis.techStack || [],
          aiAnalysis.experienceYears || 'Not specified',
          aiAnalysis.languageRequirements || [],
          aiAnalysis.germanRequired || false
        );
        console.log(`✅ ATS Score: ${atsScore.overallScore}%`);
      } catch (error) {
        console.log('⚠️  ATS scoring skipped:', error);
      }
    }

    const jobDetails: JobDetails = {
      jobTitle: jobTitle.trim(),
      company: company.trim(),
      companyLocation: 'N/A', // Will be overridden with job card value
      salaryRange: salaryRange.trim(),
      datePosted: datePosted.trim(),
      languages,
      description: description.substring(0, 5000), // Limit description length
      isGerman,
      aiAnalysis,
      translatedDescription,
      atsScore
    };

    console.log(`✅ Extracted: ${jobDetails.jobTitle} at ${jobDetails.company}`);
    return jobDetails;
  }

  private detectGerman(text: string): boolean {
    // Common German words and patterns
    const germanIndicators = [
      /\b(der|die|das|ein|eine|und|oder|mit|für|von|zu|im|am|auf|bei)\b/gi,
      /\b(Sie|Ihre|Unser|Wir|Deine|Ihr)\b/g,
      /\b(Kenntnisse|Erfahrung|Aufgaben|Anforderungen|Qualifikationen)\b/gi
    ];

    let germanMatches = 0;
    germanIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) germanMatches += matches.length;
    });

    return germanMatches > 10;
  }

  private extractLanguages(text: string): string[] {
    const languages: Set<string> = new Set();
    const languagePatterns = [
      /\b(German|Deutsch|Deutsche)\b/gi,
      /\b(English|Englisch)\b/gi
    ];

    languagePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const normalized = match.toLowerCase();
          if (normalized.includes('german') || normalized.includes('deutsch')) {
            languages.add('German');
          } else if (normalized.includes('english') || normalized.includes('englisch')) {
            languages.add('English');
          }
        });
      }
    });

    return Array.from(languages);
  }

  async analyzeAllJobPostings(maxJobs: number = 10): Promise<JobDetails[]> {
    console.log(`🔍 Starting analysis of job postings (max: ${maxJobs})...`);

    const jobDetails: JobDetails[] = [];
    let newJobsAnalyzed = 0;
    let skippedFromCache = 0;

    // Analyze in batches, clicking "Show more" when needed
    let currentJobCount = await this.getJobPostingsCount();
    console.log(`📋 Found ${currentJobCount} job postings`);

    for (let i = 0; i < maxJobs; i++) {
      // Check if we need to load more jobs
      if (i >= currentJobCount) {
        const loadedMore = await this.clickShowMore();
        if (loadedMore) {
          currentJobCount = await this.getJobPostingsCount();
          console.log(`📋 Loaded more jobs - now showing ${currentJobCount}`);
        } else {
          console.log('⚠️  No more jobs available');
          break;
        }
      }
      let newPage: Page | null = null;

      try {
        console.log(`\n📌 Analyzing job ${i + 1} of ${maxJobs}...`);

        // Get basic info before opening to check cache
        const basicInfo = await this.getBasicJobInfo(i);

        // Skip external job ads
        if (basicInfo.title.toLowerCase().includes('external job ad') ||
            basicInfo.title.toLowerCase().includes('externe stellenanzeige')) {
          console.log('⏭️  Skipping external job ad');
          continue;
        }

        // Check if already analyzed (using basic info from job card)
        if (this.jobDatabase.isJobAnalyzed(basicInfo.title, basicInfo.company, basicInfo.companyLocation, basicInfo.datePosted)) {
          console.log(`💾 Already in database: "${basicInfo.title}" at ${basicInfo.company} (${basicInfo.companyLocation})`);
          const cached = this.jobDatabase.getJob(basicInfo.title, basicInfo.company, basicInfo.companyLocation, basicInfo.datePosted);
          if (cached && cached.platform === 'xing') {
            jobDetails.push(cached.jobDetails as JobDetails);
            skippedFromCache++;
            continue;
          }
        }

        console.log(`🆕 New job found: "${basicInfo.title}" at ${basicInfo.company} (${basicInfo.companyLocation}) - opening...`);

        // Click job posting - opens in new tab
        newPage = await this.clickJobPosting(i);

        // Extract details from the new tab
        const details = await this.extractJobDetails(newPage);

        // CRITICAL: Use basic info from job card for database consistency
        // Override extracted title/company/companyLocation/date with card values to ensure matching
        details.jobTitle = basicInfo.title;
        details.company = basicInfo.company;
        details.companyLocation = basicInfo.companyLocation;
        details.datePosted = basicInfo.datePosted;

        jobDetails.push(details);

        // Save to database (using consistent basic info)
        this.jobDatabase.addJob(details);
        newJobsAnalyzed++;

        // Close the new tab
        await newPage.close();
        console.log('✅ Closed job tab');

      } catch (error) {
        console.log(`⚠️  Failed to analyze job ${i + 1}:`, error);

        // Make sure to close the tab if it's still open
        if (newPage && !newPage.isClosed()) {
          await newPage.close();
        }
      }
    }

    console.log(`\n✅ Analysis complete!`);
    console.log(`   📊 Total jobs: ${jobDetails.length}`);
    console.log(`   🆕 Newly analyzed: ${newJobsAnalyzed}`);
    console.log(`   💾 Loaded from cache: ${skippedFromCache}`);

    // Show database stats
    const stats = this.jobDatabase.getStats();
    console.log(`\n📁 DATABASE STATS:`);
    console.log(`   Total jobs in database: ${stats.total}`);
    console.log(`   Analyzed today: ${stats.analyzedToday}`);
    console.log(`   German required: ${stats.germanRequired}`);
    console.log(`   Qualified (ATS ≥ 40%): ${stats.qualified}`);

    return jobDetails;
  }

  private async clickShowMore(): Promise<boolean> {
    try {
      // Look for "Show more" button with various possible selectors
      const showMoreSelectors = [
        'button:has-text("Show more")',
        'button:has-text("Mehr anzeigen")',
        '[data-testid="show-more"]',
        'button[class*="show-more"]',
        'button:has-text("Load more")',
        'button:has-text("Weitere")'
      ];

      for (const selector of showMoreSelectors) {
        try {
          const button = this.page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            console.log('🔄 Clicking "Show more" to load additional jobs...');
            await button.click();
            await this.page.waitForTimeout(2000); // Wait for jobs to load
            return true;
          }
        } catch {
          continue;
        }
      }

      return false; // No show more button found
    } catch (error) {
      console.log('⚠️  Could not click show more:', error);
      return false;
    }
  }

  private async getBasicJobInfo(index: number): Promise<{ title: string; company: string; companyLocation: string; datePosted: string }> {
    try {
      // Try multiple selectors for job cards
      const jobCardSelectors = [
        '[data-testid="job-card"]',
        '[class*="job-card"]',
        'article',
        '[data-qa="job-card"]'
      ];

      let jobCard = null;
      for (const selector of jobCardSelectors) {
        try {
          const card = this.page.locator(selector).nth(index);
          if (await card.isVisible({ timeout: 1000 })) {
            jobCard = card;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!jobCard) {
        console.log('⚠️  Could not find job card, using fallback');
        return { title: `Job ${index + 1}`, company: 'Unknown', companyLocation: 'Unknown', datePosted: 'Unknown' };
      }

      // Check for "External job ad" marker
      try {
        const externalMarker = jobCard.locator('span[data-xds="Marker"][role="status"]').first();
        if (await externalMarker.isVisible({ timeout: 500 })) {
          const markerText = await externalMarker.textContent();
          if (markerText && (markerText.toLowerCase().includes('external') || markerText.toLowerCase().includes('externe'))) {
            return { title: 'External job ad', company: 'N/A', companyLocation: 'N/A', datePosted: '' };
          }
        }
      } catch {
        // No external marker, continue
      }

      // Try multiple selectors for title
      let title = 'N/A';
      const titleSelectors = ['h2', '[data-xds="Headline"]', 'h3', '[class*="title"]', 'a[class*="job"]'];
      for (const selector of titleSelectors) {
        try {
          const text = await jobCard.locator(selector).first().textContent({ timeout: 1000 });
          if (text && text.trim().length > 0) {
            title = text.trim();
            break;
          }
        } catch {
          continue;
        }
      }

      // Try multiple selectors for company
      let company = 'N/A';
      const companySelectors = ['[class*="Company"]', 'a[href*="/companies/"]', '[data-xds="BodyCopy"]'];
      for (const selector of companySelectors) {
        try {
          const text = await jobCard.locator(selector).first().textContent({ timeout: 1000 });
          if (text && text.trim().length > 0) {
            company = text.trim();
            break;
          }
        } catch {
          continue;
        }
      }

      let companyLocation = 'N/A';
      const companyLocationSelectors = ['div [class*="multi-location"] p', '[class*="location"]', '[data-xds="BodyCopy"]:has-text("·")'];
      for (const selector of companyLocationSelectors) {
        try {
          const text = await jobCard.locator(selector).first().textContent({ timeout: 1000 });
          if (text && text.trim().length > 0) {
            companyLocation = text.trim();
            break;
          }
        } catch {
          continue;
        }
      }

      // Try to find date posted
      let datePosted = 'N/A';
      try {
        const dateText = await jobCard.locator('text=/ago|day|week|month|vor|tag|woche/i').first().textContent({ timeout: 1000 });
        if (dateText) datePosted = dateText.trim();
      } catch {
        // Date not critical, continue
      }

      return {
        title,
        company,
        companyLocation,
        datePosted
      };
    } catch (error) {
      console.log('⚠️  Error getting basic job info:', error);
      return { title: `Job ${index + 1}`, company: 'Unknown', companyLocation: 'Unknown', datePosted: 'Unknown' };
    }
  }

  printJobAnalysis(jobDetails: JobDetails[]) {
    console.log('\n📊 JOB ANALYSIS SUMMARY\n' + '='.repeat(80));

    jobDetails.forEach((job, index) => {
      console.log(`\n[${index + 1}] ${job.jobTitle}`);
      console.log(`    Company: ${job.company}`);
      console.log(`    Salary: ${job.salaryRange}`);
      console.log(`    Posted: ${job.datePosted}`);
      console.log(`    Languages: ${job.languages.length > 0 ? job.languages.join(', ') : 'Not specified'}`);
      console.log(`    Description Language: ${job.isGerman ? '🇩🇪 German' : '🇬🇧 English'}`);

      // ATS Score (if available)
      if (job.atsScore) {
        console.log(`\n    📊 ATS MATCH SCORE: ${job.atsScore.overallScore}%`);
        console.log(`       ${job.atsScore.recommendation}`);
        console.log(`       Skills Match: ${job.atsScore.skillsMatch}%`);
        console.log(`       Tech Stack Match: ${job.atsScore.techStackMatch}%`);
        console.log(`       Experience Match: ${job.atsScore.experienceMatch ? '✅ Yes' : '❌ No'}`);

        if (job.atsScore.matchedSkills.length > 0) {
          console.log(`       ✅ Matched Skills: ${job.atsScore.matchedSkills.slice(0, 5).join(', ')}${job.atsScore.matchedSkills.length > 5 ? '...' : ''}`);
        }
        if (job.atsScore.missingSkills.length > 0) {
          console.log(`       ⚠️  Missing Skills: ${job.atsScore.missingSkills.slice(0, 5).join(', ')}${job.atsScore.missingSkills.length > 5 ? '...' : ''}`);
        }
      }

      // AI Analysis Results
      if (job.aiAnalysis) {
        console.log(`\n    🤖 AI ANALYSIS:`);
        console.log(`       Summary: ${job.aiAnalysis.summary || 'Not available'}`);

        // Highlight German language requirement prominently
        const germanFlag = job.aiAnalysis.germanRequired ? '⚠️ 🇩🇪 GERMAN REQUIRED' : '✅ German NOT required';
        console.log(`       Language: ${germanFlag}`);
        if (job.aiAnalysis.languageRequirements && job.aiAnalysis.languageRequirements.length > 0) {
          console.log(`       All Languages: ${job.aiAnalysis.languageRequirements.join(', ')}`);
        }

        console.log(`       Experience: ${job.aiAnalysis.experienceYears || 'Not specified'}`);
        console.log(`       Skills: ${job.aiAnalysis.requiredSkills?.join(', ') || 'None found'}`);
        console.log(`       Tech Stack: ${job.aiAnalysis.techStack?.join(', ') || 'None found'}`);
        console.log(`       Benefits: ${job.aiAnalysis.benefits?.join(', ') || 'None found'}`);
      }

      if (job.translatedDescription) {
        console.log(`\n    🌐 TRANSLATED (First 200 chars):`);
        console.log(`       ${job.translatedDescription.substring(0, 200)}...`);
      } else {
        console.log(`\n    📝 Description Preview: ${job.description.substring(0, 150)}...`);
      }

      console.log('-'.repeat(80));
    });
  }
}
