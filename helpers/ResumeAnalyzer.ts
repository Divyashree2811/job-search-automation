import { Ollama } from 'ollama';
import * as fs from 'fs';
import * as path from 'path';

export interface ResumeProfile {
  skills: string[];
  techStack: string[];
  experienceYears: number;
  languages: string[];
  domains: string[];
}

export interface ATSScore {
  overallScore: number;
  skillsMatch: number;
  techStackMatch: number;
  experienceMatch: boolean;
  languageMatch: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: string;
}

export class ResumeAnalyzer {
  private ollama: Ollama;
  private resumeProfile: ResumeProfile | null = null;

  constructor() {
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
  }

  async loadResumeFromPDF(pdfPath: string): Promise<void> {
    console.log('📄 Analyzing resume PDF...');

    // For now, we'll use the extracted data from the PDF you provided
    // In production, you could use a PDF parser library
    this.resumeProfile = {
      skills: [
        'Test Automation',
        'QA Leadership',
        'Selenium',
        'Playwright',
        'Appium',
        'Robot Framework',
        'Pytest',
        'TestNG',
        'API Testing',
        'CI/CD',
        'Mentoring',
        'Code Review',
        'Agile',
        'Scrum'
      ],
      techStack: [
        'Playwright',
        'Selenium WebDriver',
        'Python',
        'JavaScript',
        'TypeScript',
        'Java',
        'Appium',
        'Robot Framework',
        'Pytest',
        'TestNG',
        'Postman',
        'REST API',
        'JMeter',
        'SQL',
        'Jenkins',
        'Git',
        'Docker'
      ],
      experienceYears: 10,
      languages: ['English'],  // Learning German, but not fluent
      domains: [
        'Edge Computing',
        'CDN',
        'Security',
        'IoT',
        'Smart Buildings',
        'eCommerce',
        'Retail',
        'Supply Chain'
      ]
    };

    console.log('✅ Resume profile loaded successfully');
    console.log(`   Skills: ${this.resumeProfile.skills.length} identified`);
    console.log(`   Tech Stack: ${this.resumeProfile.techStack.length} technologies`);
    console.log(`   Experience: ${this.resumeProfile.experienceYears}+ years`);
  }

  calculateATSScore(
    jobSkills: string[],
    jobTechStack: string[],
    jobExperienceYears: string,
    jobLanguages: string[],
    germanRequired: boolean
  ): ATSScore {
    // Skip scoring if German is required and user doesn't speak German
    if (germanRequired) {
      return {
        overallScore: 0,
        skillsMatch: 0,
        techStackMatch: 0,
        experienceMatch: false,
        languageMatch: false,
        matchedSkills: [],
        missingSkills: [],
        recommendation: '⚠️ SKIP - German language required (you are learning German)'
      };
    }

    if (!this.resumeProfile) {
      throw new Error('Resume profile not loaded. Call loadResumeFromPDF first.');
    }

    // Calculate skills match
    const matchedSkills = this.findMatches(this.resumeProfile.skills, jobSkills);
    const skillsMatchPercent = jobSkills.length > 0
      ? (matchedSkills.length / jobSkills.length) * 100
      : 0;

    // Calculate tech stack match
    const matchedTech = this.findMatches(this.resumeProfile.techStack, jobTechStack);
    const techMatchPercent = jobTechStack.length > 0
      ? (matchedTech.length / jobTechStack.length) * 100
      : 0;

    // Check experience match
    const requiredYears = this.parseExperienceYears(jobExperienceYears);
    const experienceMatch = requiredYears === 0 || this.resumeProfile.experienceYears >= requiredYears;

    // Check language match
    const languageMatch = this.checkLanguageMatch(jobLanguages);

    // Calculate overall score (weighted)
    const overallScore = Math.round(
      (skillsMatchPercent * 0.4) +      // 40% weight on skills
      (techMatchPercent * 0.4) +         // 40% weight on tech stack
      (experienceMatch ? 20 : 0) +       // 20% weight on experience
      (languageMatch ? 0 : -10)          // Penalty if language doesn't match
    );

    // Find missing skills
    const missingSkills = jobSkills.filter(
      skill => !matchedSkills.some(ms => this.similarityMatch(skill, ms))
    );

    // Generate recommendation
    let recommendation = '';
    if (overallScore >= 75) {
      recommendation = '🟢 EXCELLENT MATCH - Apply immediately!';
    } else if (overallScore >= 60) {
      recommendation = '🟡 GOOD MATCH - Worth applying';
    } else if (overallScore >= 40) {
      recommendation = '🟠 MODERATE MATCH - Consider if interested';
    } else {
      recommendation = '🔴 LOW MATCH - May not be suitable';
    }

    return {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      skillsMatch: Math.round(skillsMatchPercent),
      techStackMatch: Math.round(techMatchPercent),
      experienceMatch,
      languageMatch,
      matchedSkills,
      missingSkills,
      recommendation
    };
  }

  private findMatches(resumeItems: string[], jobItems: string[]): string[] {
    const matches: string[] = [];

    for (const jobItem of jobItems) {
      for (const resumeItem of resumeItems) {
        if (this.similarityMatch(jobItem.toLowerCase(), resumeItem.toLowerCase())) {
          matches.push(resumeItem);
          break;
        }
      }
    }

    return matches;
  }

  private similarityMatch(str1: string, str2: string): boolean {
    // Simple similarity check - can be enhanced with fuzzy matching
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return true;

    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return true;

    // Word overlap
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1.length > 3 && w2.length > 3 && (w1.includes(w2) || w2.includes(w1))) {
          return true;
        }
      }
    }

    return false;
  }

  private parseExperienceYears(expString: string): number {
    // Extract numbers from strings like "3-5 years", "5+ years", "Not specified"
    if (expString.toLowerCase().includes('not specified')) return 0;

    const match = expString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private checkLanguageMatch(jobLanguages: string[]): boolean {
    if (!this.resumeProfile || jobLanguages.length === 0) return true;

    // Check if user's languages match any required languages
    for (const jobLang of jobLanguages) {
      const langLower = jobLang.toLowerCase();

      // Skip German check (handled separately by germanRequired flag)
      if (langLower.includes('german') || langLower.includes('deutsch')) {
        continue;
      }

      // Check if user knows this language
      const hasLang = this.resumeProfile.languages.some(
        userLang => langLower.includes(userLang.toLowerCase())
      );

      if (hasLang) return true;
    }

    // If no specific match found, assume English is okay
    return true;
  }

  getResumeProfile(): ResumeProfile | null {
    return this.resumeProfile;
  }
}
