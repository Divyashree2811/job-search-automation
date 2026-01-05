# Daily Job Application Workflow

## Overview
Your automated job search runs daily and generates a curated list of jobs you should apply to.

## Files Generated Daily

### 1. `data/analyzed-jobs.json`
- **Purpose**: Complete archive of ALL analyzed jobs
- **Use**: Historical reference, don't modify this file
- **Contents**: Full job details with AI analysis and ATS scores

### 2. `data/applyToTheseXing.json` ⭐ YOUR DAILY TODO LIST
- **Purpose**: Curated list of QUALIFIED jobs sorted by match score
- **Use**: Review daily and apply to jobs that interest you
- **Contents**: Only jobs with:
  - ✅ English-only (German NOT required)
  - ✅ ATS Score ≥ 40% (good resume match)
  - ✅ Sorted by highest match score first

## Daily Workflow

### Morning Routine (After Cron Runs)
```bash
# 1. Check if cron ran successfully (look for notification)
# 2. Open the daily apply list
cat data/applyToTheseXing.json | jq '.jobs[] | {jobTitle, company, atsScore, applied}'

# 3. Review jobs in detail
cat data/applyToTheseXing.json | jq '.jobs[0]'  # First job (highest match)
```

### Review Each Job
For each job in `applyToTheseXing.json`, check:
1. **Job Title & Company**: Does it interest you?
2. **ATS Score**: How well do you match? (40-60% = Good, 60-80% = Very Good, 80%+ = Excellent)
3. **Matched Skills**: What you already have
4. **Missing Skills**: What you need to learn (or highlight differently)
5. **Tech Stack**: Technologies used
6. **Benefits**: Perks and benefits offered
7. **Summary**: AI-generated job overview

### Apply to Jobs
1. Apply to the job on XING
2. Update the `applied` field in `applyToTheseXing.json`:
   ```json
   {
     "applied": true  // Change from false to true
   }
   ```

### Quick Commands

**View only unapplied jobs:**
```bash
cat data/applyToTheseXing.json | jq '.jobs[] | select(.applied == false) | {jobTitle, company, atsScore}'
```

**Count unapplied jobs:**
```bash
cat data/applyToTheseXing.json | jq '[.jobs[] | select(.applied == false)] | length'
```

**View top 3 matches:**
```bash
cat data/applyToTheseXing.json | jq '.jobs[0:3] | .[] | {jobTitle, company, atsScore}'
```

**View jobs by specific company:**
```bash
cat data/applyToTheseXing.json | jq '.jobs[] | select(.company | contains("Google")) | {jobTitle, atsScore}'
```

## What Each Field Means

### ATS Score
- **40-50%**: Decent match, worth applying if interested
- **50-65%**: Good match, you meet most requirements
- **65-80%**: Very good match, strong candidate
- **80%+**: Excellent match, you're highly qualified

### Matched Skills
Skills from your resume that match the job requirements

### Missing Skills
Skills mentioned in the job that you don't have (or aren't on your resume)
- **Tip**: Sometimes you have the skill but it's not on your resume - update your resume!

### Tech Stack
Technologies and tools used at the company

### Experience Years
Required years of experience (AI-extracted)

### Benefits
Perks, benefits, and extras offered

### Summary
AI-generated summary of the job posting

## Automation Schedule

Your cron job runs:
- **Frequency**: Daily (check `crontab -l` for exact time)
- **Mode**: Headless (background, no browser window)
- **Jobs Analyzed**: Up to 100 per run
- **Smart Caching**: Skips jobs already in database

## Troubleshooting

### No new jobs in applyToTheseXing.json?
- Check `logs/job-search-*.log` for details
- May not be any new qualified jobs posted in last 24 hours
- Try adjusting filters in `tests/xing-e2e.spec.ts`

### File not updated?
```bash
# Check last update time
cat data/applyToTheseXing.json | jq '.generatedAt'

# Check latest log
ls -lt logs/ | head -2
tail -50 logs/job-search-*.log
```

### Want to change qualification criteria?
Edit `tests/xing-e2e.spec.ts` line 55-59:
```typescript
const qualifiedJobs = jobDetails.filter(job =>
  !job.aiAnalysis?.germanRequired &&
  (job.atsScore?.overallScore || 0) >= 40  // Change threshold here
);
```

## Pro Tips

1. **Review in the morning**: Check right after cron runs
2. **Apply quickly**: Jobs posted in last 24 hours get more visibility
3. **Track applications**: Mark `applied: true` to avoid duplicates
4. **Read summaries first**: AI summary gives quick overview
5. **Don't skip lower scores**: A 45% match with great benefits might still be worth it!

## Example Job Entry
```json
{
  "jobTitle": "Senior QA Automation Engineer",
  "company": "TechCorp GmbH",
  "companyLocation": "Berlin",
  "salaryRange": "€60,000 - €80,000",
  "datePosted": "2025-01-04",
  "atsScore": 67,
  "matchedSkills": ["Playwright", "TypeScript", "CI/CD", "Test Automation"],
  "missingSkills": ["Kubernetes", "AWS"],
  "requiredSkills": ["Playwright", "TypeScript", "CI/CD", "Test Automation", "Kubernetes"],
  "techStack": ["Playwright", "TypeScript", "Jenkins", "Docker"],
  "experienceYears": "3-5 years",
  "benefits": ["Remote work", "Training budget", "Health insurance"],
  "summary": "Looking for experienced QA engineer to lead test automation...",
  "applied": false
}
```

---

**Happy job hunting! 🚀**
