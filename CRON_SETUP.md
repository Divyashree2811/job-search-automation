# Daily Job Search Automation Setup

## Overview
Run automated job search daily at a scheduled time in headless mode (no browser window).

## Features
- ✅ Runs in headless mode (background)
- ✅ Saves results to database
- ✅ Logs all output
- ✅ Sends macOS notification when complete
- ✅ Auto-cleans old logs (30 days)

## Setup Instructions

### 1. Test the Script First
```bash
cd "/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project"
./daily-job-search.sh
```

Check the log file in `./logs/job-search-YYYY-MM-DD_HH-MM-SS.log`

### 2. Set Up Cron Job (macOS)

#### Option A: Run at 9 AM every day
```bash
# Open crontab editor
crontab -e

# Add this line (press 'i' to insert, then paste):
0 9 * * * /Users/divyashree/Documents/Interview\ Prep\ Docs/JobSearch/playwright-project/daily-job-search.sh

# Save and exit (press ESC, then type :wq and press ENTER)
```

#### Option B: Run at 6 PM every weekday (Mon-Fri)
```bash
0 18 * * 1-5 /Users/divyashree/Documents/Interview\ Prep\ Docs/JobSearch/playwright-project/daily-job-search.sh
```

#### Option C: Run twice daily (9 AM and 6 PM)
```bash
0 9,18 * * * /Users/divyashree/Documents/Interview\ Prep\ Docs/JobSearch/playwright-project/daily-job-search.sh
```

### 3. Verify Cron Job
```bash
# List all cron jobs
crontab -l
```

### 4. Grant Permissions (macOS)
If cron doesn't run, grant Full Disk Access to `cron`:
1. System Preferences → Security & Privacy → Privacy
2. Select "Full Disk Access"
3. Click the lock icon and authenticate
4. Click "+" and add `/usr/sbin/cron`

## Cron Schedule Format
```
* * * * * command
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

## Examples
- `0 9 * * *` - Every day at 9:00 AM
- `30 18 * * 1-5` - Weekdays at 6:30 PM
- `0 */6 * * *` - Every 6 hours
- `0 9,14,18 * * *` - At 9 AM, 2 PM, and 6 PM daily

## View Results

### Check Latest Log
```bash
tail -100 logs/job-search-*.log | tail -1
```

### View Database Stats
```bash
cat data/analyzed-jobs.json | jq '.totalJobs, .lastUpdated, .jobs | length'
```

### Query Qualified Jobs
```bash
cat data/analyzed-jobs.json | jq '.jobs[] | select(.jobDetails.atsScore.overallScore >= 40 and .jobDetails.aiAnalysis.germanRequired == false) | {title: .title, company: .company, score: .jobDetails.atsScore.overallScore}'
```

## Troubleshooting

### Cron job not running?
1. Check cron logs: `log show --predicate 'process == "cron"' --last 1h`
2. Verify script permissions: `ls -la daily-job-search.sh`
3. Check if Ollama is running: `pgrep ollama`

### Script fails?
1. Run manually to see errors: `./daily-job-search.sh`
2. Check log file: `tail -100 logs/job-search-*.log`
3. Verify Playwright browsers installed: `npx playwright install`

## Manual Run Options

### Run with custom job count
Edit `tests/xing-e2e.spec.ts` and change line 52:
```typescript
const jobDetails = await homePage.analyzeAllJobPostings(20); // Change from 10 to 20
```

### Run with headed mode (show browser)
```bash
npx playwright test tests/xing-e2e.spec.ts --headed
```

### Run and show live output
```bash
./daily-job-search.sh | tee /dev/tty
```

## Disable Cron Job
```bash
# Edit crontab
crontab -e

# Comment out the line by adding # at the beginning
# 0 9 * * * /Users/divyashree/Documents/Interview\ Prep\ Docs/JobSearch/playwright-project/daily-job-search.sh

# Or remove it completely
```

## Notes
- **Headless mode**: Browser runs in background (no window)
- **Database**: Automatically skips jobs already analyzed
- **Logs**: Saved for 30 days, then auto-deleted
- **Notifications**: macOS notifications when job completes
- **Results**: Check `data/analyzed-jobs.json` for all analyzed jobs
