import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { JobDetails } from '../pages/XingHomePage';
import { LinkedInJobDetails } from '../pages/LinkedInJobPage';

export type AnyJobDetails = JobDetails | LinkedInJobDetails;

export interface StoredJob {
  id: string;
  title: string;
  company: string;
  postedDate: string;  // Actual date, not relative
  analyzedAt: string;
  jobDetails: AnyJobDetails;
  platform: 'xing' | 'linkedin';
}

export class JobDatabase {
  private dbPath: string;
  private jobs: Map<string, StoredJob>;

  constructor(dbPath: string = 'data/analyzed-jobs.json') {
    this.dbPath = path.join(process.cwd(), dbPath);
    this.jobs = new Map();
    this.loadDatabase();
  }

  /**
   * Generate unique ID for a job based on title, company, company location, and posted date
   */
  private generateJobId(title: string, company: string, companyLocation: string, postedDate: string): string {
    const normalized = `${title.toLowerCase().trim()}_${company.toLowerCase().trim()}_${companyLocation.toLowerCase().trim()}_${postedDate}`;
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Convert relative date (e.g., "2 days ago") to actual date
   */
  parseRelativeDate(relativeDate: string): string {
    const now = new Date();
    const lowerDate = relativeDate.toLowerCase();

    // Handle "today", "yesterday"
    if (lowerDate.includes('today') || lowerDate.includes('hour')) {
      return now.toISOString().split('T')[0];
    }
    if (lowerDate.includes('yesterday')) {
      now.setDate(now.getDate() - 1);
      return now.toISOString().split('T')[0];
    }

    // Handle "X days ago"
    const daysMatch = lowerDate.match(/(\d+)\s*day/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      now.setDate(now.getDate() - days);
      return now.toISOString().split('T')[0];
    }

    // Handle "X weeks ago"
    const weeksMatch = lowerDate.match(/(\d+)\s*week/);
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1]);
      now.setDate(now.getDate() - (weeks * 7));
      return now.toISOString().split('T')[0];
    }

    // Handle "X months ago"
    const monthsMatch = lowerDate.match(/(\d+)\s*month/);
    if (monthsMatch) {
      const months = parseInt(monthsMatch[1]);
      now.setMonth(now.getMonth() - months);
      return now.toISOString().split('T')[0];
    }

    // Handle German dates (e.g., "vor 2 Tagen")
    if (lowerDate.includes('vor')) {
      const tageMatch = lowerDate.match(/vor\s*(\d+)\s*tag/);
      if (tageMatch) {
        const days = parseInt(tageMatch[1]);
        now.setDate(now.getDate() - days);
        return now.toISOString().split('T')[0];
      }

      const wochenMatch = lowerDate.match(/vor\s*(\d+)\s*woche/);
      if (wochenMatch) {
        const weeks = parseInt(wochenMatch[1]);
        now.setDate(now.getDate() - (weeks * 7));
        return now.toISOString().split('T')[0];
      }
    }

    // Default: return today's date if can't parse
    return now.toISOString().split('T')[0];
  }

  /**
   * Check if a job has already been analyzed
   */
  isJobAnalyzed(title: string, company: string, companyLocation: string, postedDate: string = ''): boolean {
    // Use date if available, otherwise just title + company
    const actualDate = postedDate ? this.parseRelativeDate(postedDate) : '';
    const jobId = this.generateJobId(title, company, companyLocation, actualDate);
    return this.jobs.has(jobId);
  }

  /**
   * Add a job to the database
   */
  addJob(jobDetails: AnyJobDetails, platform: 'xing' | 'linkedin' = 'xing'): string {
    // Get fields based on platform
    const title = 'jobTitle' in jobDetails ? jobDetails.jobTitle : '';
    const company = jobDetails.company;
    const location = 'companyLocation' in jobDetails ? jobDetails.companyLocation : jobDetails.location;
    const datePosted = jobDetails.datePosted;

    const actualDate = this.parseRelativeDate(datePosted);
    const jobId = this.generateJobId(title, company, location, actualDate);

    const storedJob: StoredJob = {
      id: jobId,
      title: title,
      company: company,
      postedDate: actualDate,
      analyzedAt: new Date().toISOString(),
      jobDetails,
      platform
    };

    this.jobs.set(jobId, storedJob);
    this.saveDatabase();
    console.log(`💾 Saved to database (${platform}) - Total: ${this.jobs.size} jobs`);

    return jobId;
  }

  /**
   * Get a stored job by ID
   */
  getJob(title: string, company: string, companyLocation: string, postedDate: string): StoredJob | null {
    const actualDate = this.parseRelativeDate(postedDate);
    const jobId = this.generateJobId(title, company, companyLocation, actualDate);
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all stored jobs
   */
  getAllJobs(): StoredJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs analyzed today
   */
  getJobsAnalyzedToday(): StoredJob[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getAllJobs().filter(job =>
      job.analyzedAt.startsWith(today)
    );
  }

  /**
   * Load database from JSON file
   */
  private loadDatabase(): void {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Load existing database
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(data);

        this.jobs = new Map();
        if (parsed.jobs && Array.isArray(parsed.jobs)) {
          parsed.jobs.forEach((job: StoredJob) => {
            this.jobs.set(job.id, job);
          });
        }

        console.log(`📁 Loaded ${this.jobs.size} previously analyzed jobs from database`);
      } else {
        console.log('📁 No existing database found - creating new one');
      }
    } catch (error) {
      console.log('⚠️  Error loading database:', error);
      this.jobs = new Map();
    }
  }

  /**
   * Save database to JSON file
   */
  private saveDatabase(): void {
    try {
      const data = {
        lastUpdated: new Date().toISOString(),
        totalJobs: this.jobs.size,
        jobs: Array.from(this.jobs.values())
      };

      fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.log('⚠️  Error saving database:', error);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    analyzedToday: number;
    germanRequired: number;
    qualified: number;
  } {
    const all = this.getAllJobs();
    const today = this.getJobsAnalyzedToday();
    const germanRequired = all.filter(j => j.jobDetails.aiAnalysis?.germanRequired).length;
    const qualified = all.filter(j =>
      !j.jobDetails.aiAnalysis?.germanRequired &&
      (j.jobDetails.atsScore?.overallScore || 0) >= 70
    ).length;

    return {
      total: all.length,
      analyzedToday: today.length,
      germanRequired,
      qualified
    };
  }

  /**
   * Clear old jobs (older than 30 days)
   */
  clearOldJobs(daysToKeep: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let removedCount = 0;
    for (const [id, job] of this.jobs.entries()) {
      const analyzedDate = new Date(job.analyzedAt);
      if (analyzedDate < cutoffDate) {
        this.jobs.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.saveDatabase();
      console.log(`🗑️  Removed ${removedCount} jobs older than ${daysToKeep} days`);
    }

    return removedCount;
  }

  /**
   * Check if job should be filtered out (German mandatory)
   */
  shouldSkipJob(jobDetails: AnyJobDetails): boolean {
    // Skip if German is mandatory
    if (jobDetails.aiAnalysis?.germanRequired) {
      console.log(`⏭️  Skipping job (German is mandatory)`);
      return true;
    }
    return false;
  }

  /**
   * Check if job is important (has key skills: playwright, python, typescript)
   */
  isImportantJob(jobDetails: AnyJobDetails): boolean {
    if (!jobDetails.aiAnalysis) return false;

    const skills = jobDetails.aiAnalysis.requiredSkills.map(s => s.toLowerCase());
    const techStack = jobDetails.aiAnalysis.techStack.map(t => t.toLowerCase());
    const allSkills = [...skills, ...techStack];

    const keySkills = ['playwright', 'python', 'typescript'];
    const hasKeySkill = keySkills.some(skill =>
      allSkills.some(s => s.includes(skill))
    );

    if (hasKeySkill) {
      console.log(`⭐ IMPORTANT JOB - Has key skills: ${keySkills.filter(k => allSkills.some(s => s.includes(k))).join(', ')}`);
    }

    return hasKeySkill;
  }

  /**
   * Get all important jobs (not German mandatory, has key skills)
   */
  getImportantJobs(): StoredJob[] {
    return this.getAllJobs().filter(job => {
      const notGermanMandatory = !job.jobDetails.aiAnalysis?.germanRequired;
      const hasKeySkills = this.isImportantJob(job.jobDetails);
      return notGermanMandatory && hasKeySkills;
    });
  }

  /**
   * Save important jobs to a separate JSON file
   */
  saveImportantJobsToFile(filePath: string = 'data/important-jobs.json'): void {
    try {
      const importantJobs = this.getImportantJobs();
      const fullPath = path.join(process.cwd(), filePath);

      const data = {
        lastUpdated: new Date().toISOString(),
        totalImportantJobs: importantJobs.length,
        jobs: importantJobs
      };

      // Create directory if it doesn't exist
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`💾 Saved ${importantJobs.length} important jobs to ${filePath}`);
    } catch (error) {
      console.log('⚠️  Error saving important jobs:', error);
    }
  }
}
