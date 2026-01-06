import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { JobAnalyzer, AIJobAnalysis } from '../helpers/JobAnalyzer';
import { JobDatabase } from '../helpers/JobDatabase';

export interface LinkedInJobDetails {
  jobTitle: string;
  company: string;
  location: string;
  datePosted: string;
  description: string;
  rawDescription?: string;
  translatedDescription?: string;
  isGerman: boolean;
  aiAnalysis?: AIJobAnalysis;
}

export class LinkedInJobPage extends BasePage {
  private jobAnalyzer: JobAnalyzer;
  private jobDatabase: JobDatabase;

  constructor(page: Page) {
    super(page);
    this.jobAnalyzer = new JobAnalyzer();
    this.jobDatabase = new JobDatabase('data/linkedin-analyzed-jobs.json');
  }

  /**
   * Navigate to LinkedIn Jobs page
   */
  async goToJobsPage() {
    await this.page.goto('https://www.linkedin.com/jobs/');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(500);
    console.log('✅ Navigated to LinkedIn Jobs page');
  }

  /**
   * Click on Jobs link from any LinkedIn page
   */
  async clickJobsLink() {
    try {
      const jobsLink = this.page.locator('[type="job"]').first();
      if (await jobsLink.isVisible({ timeout: 5000 })) {
        await jobsLink.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(500);
        console.log('✅ Clicked Jobs link');
      }
    } catch (error) {
      console.log('ℹ️  Jobs link not found, navigating directly');
      await this.goToJobsPage();
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Check for "Me" dropdown button or navigation items that only appear when logged in
      const meButton = this.page.locator('button:has-text("Me")').first();
      const profileNav = this.page.locator('[data-test-global-nav-me-dropdown], [aria-label*="Me"]').first();
      const myNetworkLink = this.page.locator('a[href*="/mynetwork/"]').first();

      // Check if any of these elements are visible
      const meVisible = await meButton.isVisible({ timeout: 3000 }).catch(() => false);
      const profileVisible = await profileNav.isVisible({ timeout: 1000 }).catch(() => false);
      const networkVisible = await myNetworkLink.isVisible({ timeout: 1000 }).catch(() => false);

      return meVisible || profileVisible || networkVisible;
    } catch {
      return false;
    }
  }

  /**
   * Search for jobs by title and location
   */
  async searchJobs(jobTitle: string, location: string = '') {
    console.log(`🔍 Searching for: ${jobTitle} in ${location || 'all locations'}`);

    try {
      // Wait for page to be ready
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1000);

      // Search by job title
      const jobTitleInput = this.page.locator('[placeholder="Title, skill or Company"]').first();
      if (await jobTitleInput.isVisible({ timeout: 5000 })) {
        await jobTitleInput.click();
        await jobTitleInput.fill(jobTitle);
        console.log('✅ Entered job title');
        await this.page.waitForTimeout(500);
      }

      // Search by location if provided
      if (location) {
        const locationInput = this.page.locator('[placeholder="City, state, or zip code"]').first();
        if (await locationInput.isVisible({ timeout: 3000 })) {
          await locationInput.click();
          await locationInput.fill(location);
          console.log('✅ Entered location');
          await this.page.waitForTimeout(500);
        }
      }

      // Press Enter to search or click search button
      await this.page.keyboard.press('Enter');

      // Wait for search results to load (use domcontentloaded instead of networkidle)
      try {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        await this.page.waitForTimeout(2000); // Extra wait for results to render
      } catch {
        console.log('ℹ️  Page load timeout, but continuing...');
      }

      console.log('✅ Search executed');

    } catch (error) {
      console.error('❌ Error searching jobs:', error);
      throw error;
    }
  }
  async getResultsCount(): Promise<number> {
    const rawResultText = await this.page.locator('[class*=jobs-search-results-list__title-heading]').first().textContent();
    const match = rawResultText?.match(/[\d,]+/);
    const count = match ? parseInt(match[0].replace(/,/g, '')) : 0;
    console.log(`ℹ️  Total job results found: ${count}`);
    return count;
  }

  /**
   * Get the count of job results
   */
  async getJobResultsCount(): Promise<number> {
    try {
      // LinkedIn shows job count in results header
      const resultsText = await this.page.locator('.jobs-search-results-list__subtitle').first().textContent();
      if (resultsText) {
        const match = resultsText.match(/[\d,]+/);
        if (match) {
          return parseInt(match[0].replace(/,/g, ''));
        }
      }
      return 0;
    } catch (error) {
      console.log('ℹ️  Could not get job results count');
      return 0;
    }
  }

  /**
   * Get job cards from the results list
   */
  async getJobCards() {
    return this.page.locator('//div[@class="scaffold-layout__list "]//div[contains(@class,"job-card-container--clickable")]').all();
  }

  /**
   * Get job info from card (before clicking) to check if already analyzed
   */
  async getJobCardInfo(index: number): Promise<{title: string, company: string, location: string, date: string} | null> {
    try {
      const jobCards = await this.getJobCards();
      if (jobCards.length <= index) return null;

      const jobCard = jobCards[index];

      // Get title from entity-lockup__title - try to get from a or span first, then clean
      let title = '';
      const titleElement = jobCard.locator('div[class*="entity-lockup__title"] a, div[class*="entity-lockup__title"] span').first();
      if (await titleElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        title = await titleElement.innerText() || '';
      } else {
        // Fallback: get from div and clean it
        const titleRaw = await jobCard.locator('div[class*="entity-lockup__title"]').innerText() || '';
        const lines = titleRaw.split('\n').map(line => line.trim()).filter(line => line && !line.match(/^\d+$/));
        title = lines[0] || '';
      }
      title = title.trim();

      // Get company from entity-lockup__subtitle (use innerText for cleaner text)
      const companyRaw = await jobCard.locator('div[class*="entity-lockup__subtitle"]').innerText() || '';
      const company = companyRaw.split('\n')[0].trim();

      // Get location from entity-lockup__caption (use innerText for cleaner text)
      const locationRaw = await jobCard.locator('div[class*="entity-lockup__caption"]').innerText() || '';
      const location = locationRaw.split('\n')[0].trim();

      // Date is not available in the job card list
      const date = '';

      return {
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        date: date
      };
    } catch (error) {
      console.log('⚠️  Could not get job card info:', error);
      return null;
    }
  }

  /**
   * Check if job was already analyzed
   */
  isJobAlreadyAnalyzed(title: string, company: string, location: string, date: string): boolean {
    return this.jobDatabase.isJobAnalyzed(title, company, location, date);
  }

  /**
   * Click on a job card by index
   */
  async clickJobCard(index: number = 0) {
    const jobCards = await this.getJobCards();
    if (jobCards.length > index) {
      await jobCards[index].click();
      await this.page.waitForTimeout(1000);
      console.log(`✅ Clicked job card at index ${index}`);
    } else {
      console.log(`⚠️  No job card found at index ${index}`);
    }
  }

  /**
   * Get job details from the currently selected job (RAW - without AI analysis)
   * This is FAST - just extracts text from page
   */
  async getJobDetailsRaw(): Promise<LinkedInJobDetails | null> {
    try {
      const jobTitle = await this.page.locator('.job-details-jobs-unified-top-card__job-title').first().textContent() || '';
      const company = await this.page.locator('.job-details-jobs-unified-top-card__company-name').first().textContent() || '';

      // Get tertiary description container which has location, date, and other info
      const tertiaryContainer = this.page.locator('//div[contains(@class,"job-details-jobs-unified-top-card__tertiary-description-container")]').first();
      const tertiaryText = await tertiaryContainer.textContent() || '';

      // Parse location and date from the combined text
      let location = '';
      let datePosted = '';

      if (tertiaryText) {
        const parts = tertiaryText.split('·').map(part => part.trim());
        if (parts.length > 0) {
          location = parts[0];
          datePosted = parts[1];
        }
      }

      // Get description - NO AI ANALYSIS YET
      let description = '';
      try {
        description = await this.page.locator('.jobs-description-content__text, .jobs-description__content').first().textContent({ timeout: 5000 }) || '';
      } catch {
        console.log('ℹ️  Description not available or still loading');
      }

      description = description.trim();

      // Detect if description is in German (quick check, no translation)
      const isGerman = this.detectGerman(description);

      return {
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        location: location.trim(),
        datePosted: datePosted.trim(),
        description: description,
        rawDescription: description,
        isGerman: isGerman
      };
    } catch (error) {
      console.error('❌ Error getting raw job details:', error);
      return null;
    }
  }

  /**
   * Get job details from the currently selected job (WITH AI analysis)
   * This is SLOW - includes translation and AI extraction
   */
  async getJobDetails(): Promise<LinkedInJobDetails | null> {
    try {
      const jobTitle = await this.page.locator('.job-details-jobs-unified-top-card__job-title').first().textContent() || '';
      const company = await this.page.locator('.job-details-jobs-unified-top-card__company-name').first().textContent() || '';

      // Get tertiary description container which has location, date, and other info
      const tertiaryContainer = this.page.locator('//div[contains(@class,"job-details-jobs-unified-top-card__tertiary-description-container")]').first();
      const tertiaryText = await tertiaryContainer.textContent() || '';

      // Parse location and date from the combined text
      // Format: "Bonn, North Rhine-Westphalia, Germany · Reposted 1 week ago · 75 people clicked"
      let location = '';
      let datePosted = '';

      if (tertiaryText) {
        const parts = tertiaryText.split('·').map(part => part.trim());

        // First part is usually the location
        if (parts.length > 0) {
          location = parts[0];
          datePosted = parts[1];
        }
      }

      // Get description with timeout (may not always be available immediately)
      let description = '';
      try {
        description = await this.page.locator('.jobs-description-content__text, .jobs-description__content').first().textContent({ timeout: 5000 }) || '';
      } catch {
        console.log('ℹ️  Description not available or still loading');
      }

      description = description.trim();

      // Detect if description is in German
      const isGerman = this.detectGerman(description);
      console.log(`ℹ️  Description language: ${isGerman ? 'German' : 'English'}`);

      // Analyze job with AI (translation + extraction if German)
      let aiAnalysis: AIJobAnalysis | undefined;
      let translatedDescription: string | undefined;

      if (description.length > 100) {
        try {
          console.log('🤖 Analyzing job description...');
          const analysis = await this.jobAnalyzer.analyzeJob(description, isGerman);
          aiAnalysis = analysis;
          translatedDescription = analysis.translatedDescription;

          if (aiAnalysis.germanRequired) {
            console.log('⚠️  German language is MANDATORY for this job');
          }
        } catch (error) {
          console.log('⚠️  AI analysis skipped:', error);
        }
      }

      return {
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        location: location.trim(),
        datePosted: datePosted.trim(),
        description: description,
        rawDescription: description,
        translatedDescription: translatedDescription,
        isGerman: isGerman,
        aiAnalysis: aiAnalysis
      };
    } catch (error) {
      console.error('❌ Error getting job details:', error);
      return null;
    }
  }

  /**
   * Process a raw job with AI analysis
   * This adds AI analysis to a job that was previously extracted raw
   */
  async processJobWithAI(rawJob: LinkedInJobDetails): Promise<LinkedInJobDetails> {
    let aiAnalysis: AIJobAnalysis | undefined;
    let translatedDescription: string | undefined;

    if (rawJob.description.length > 100) {
      try {
        const analysis = await this.jobAnalyzer.analyzeJob(rawJob.description, rawJob.isGerman);
        aiAnalysis = analysis;
        translatedDescription = analysis.translatedDescription;
      } catch (error) {
        console.log(`⚠️  AI analysis failed for ${rawJob.jobTitle}:`, error);
      }
    }

    return {
      ...rawJob,
      aiAnalysis,
      translatedDescription
    };
  }

  /**
   * Save job to database
   */
  saveJobToDatabase(jobDetails: LinkedInJobDetails): string {
    return this.jobDatabase.addJob(jobDetails, 'linkedin');
  }

  /**
   * Check if job should be skipped (German mandatory)
   */
  shouldSkipJob(jobDetails: LinkedInJobDetails): boolean {
    return this.jobDatabase.shouldSkipJob(jobDetails);
  }

  /**
   * Check if job is important (has key skills)
   */
  isImportantJob(jobDetails: LinkedInJobDetails): boolean {
    return this.jobDatabase.isImportantJob(jobDetails);
  }

  /**
   * Save important jobs to JSON file
   */
  saveImportantJobs(): void {
    this.jobDatabase.saveImportantJobsToFile('data/linkedin-important-jobs.json');
  }

  /**
   * Get database statistics
   */
  getDatabaseStats() {
    return this.jobDatabase.getStats();
  }

  /**
   * Detect if text is in German
   */
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

  /**
   * Apply filters to job search
   */
  async applyDatePostedFilter(filter: 'Past 24 hours' | 'Past week' | 'Past Month' | 'Any Time') {
    try {
      const dateFilterButton = this.page.locator('button:has-text("Date posted")').first();
      await dateFilterButton.click();
      await this.page.waitForTimeout(500);

      const filterOption = this.page.locator(`label:has-text("${filter}")`).first();
      await filterOption.click();
      await this.page.waitForTimeout(1000);
      console.log(`✅ Applied date filter: ${filter}`);
      await this.page.locator('button:has-text("Show")').first().click();
    } catch (error) {
      console.error('❌ Error applying date filter:', error);
    }
  }

  /**
   * Click next page button for pagination
   * @returns true if next button was clicked, false if no more pages
   */
  async clickNextPage(): Promise<boolean> {
    try {
      const nextButton = this.page.locator('button[aria-label="View next page"]').first();

      // Check if next button exists and is enabled
      const isVisible = await nextButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) {
        console.log('ℹ️  No more pages - next button not found');
        return false;
      }

      const isDisabled = await nextButton.isDisabled().catch(() => true);
      if (isDisabled) {
        console.log('ℹ️  No more pages - next button is disabled');
        return false;
      }

      // Click next button
      await nextButton.click();
      await this.page.waitForTimeout(2000);
      console.log('✅ Clicked next page button');
      return true;
    } catch (error) {
      console.log('ℹ️  Could not click next page:', error);
      return false;
    }
  }

  /**
   * Get current page number from pagination
   */
  async getCurrentPageNumber(): Promise<number> {
    try {
      const activeButton = this.page.locator('button.jobs-search-pagination__indicator-button--active').first();
      const pageText = await activeButton.textContent({ timeout: 2000 });
      return parseInt(pageText?.trim() || '1');
    } catch {
      return 1;
    }
  }
}
