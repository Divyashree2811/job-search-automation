# LinkedIn Job Search - Cron Job Setup Guide

Automated daily LinkedIn job search at 6:00 AM with retry logic and headless mode.

## Overview

- **Schedule**: Daily at 6:00 AM
- **Mode**: Headless (no browser UI)
- **Retry Logic**: 5 attempts with exponential backoff
- **Logging**: Detailed logs saved to `logs/cron/`

## Prerequisites

1. ✅ **Ollama running** (or auto-start on boot)
2. ✅ **LinkedIn auth saved** in `storageState/linkedinAuth.json`
3. ✅ **Environment configured** in `.env` file

## Quick Setup

### 1. Make Script Executable

```bash
chmod +x scripts/linkedin-master.sh
```

### 2. Test Manually

```bash
./scripts/linkedin-master.sh
```

Check log: `logs/cron/linkedin_YYYYMMDD_HHMMSS.log`

### 3. Setup Cron Job

```bash
crontab -e
```

Add this line:

```cron
# LinkedIn Job Search - Daily at 6:00 AM
0 6 * * * /bin/bash "/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project/scripts/linkedin-master.sh" >> "/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project/logs/cron/cron_output.log" 2>&1
```

### 4. Verify

```bash
crontab -l
```

## macOS Permissions

Grant Full Disk Access to cron:

1. **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **Full Disk Access**
3. Click lock icon → Click **+**
4. Add `/usr/sbin/cron`

## Alternative: Using launchd (macOS)

Create file: `~/Library/LaunchAgents/com.jobsearch.linkedin.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jobsearch.linkedin</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project/scripts/linkedin-master.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project/logs/cron/launchd_output.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project/logs/cron/launchd_error.log</string>
</dict>
</plist>
```

Load the job:

```bash
launchctl load ~/Library/LaunchAgents/com.jobsearch.linkedin.plist
launchctl start com.jobsearch.linkedin
launchctl list | grep jobsearch
```

## Retry Logic

Built-in retry with exponential backoff:

1. **Attempt 1**: Immediate
2. **Attempt 2**: Wait 60s
3. **Attempt 3**: Wait 120s
4. **Attempt 4**: Wait 180s
5. **Attempt 5**: Wait 240s

Max total time: ~10 min + execution

## Custom Schedules

```cron
# Every weekday (Mon-Fri) at 6 AM
0 6 * * 1-5 /path/to/script

# Twice daily (6 AM and 6 PM)
0 6,18 * * * /path/to/script

# Every 6 hours
0 */6 * * * /path/to/script
```

## Monitoring

### View Latest Log

```bash
ls -t logs/cron/linkedin_*.log | head -1 | xargs cat
```

### Follow Log Real-time

```bash
tail -f logs/cron/linkedin_*.log
```

### Check Failures

```bash
grep "❌ Job failed" logs/cron/linkedin_*.log
```

## Troubleshooting

### Cron Not Running

```bash
# Check if cron is running
ps aux | grep cron

# Restart cron (macOS)
sudo launchctl stop com.vix.cron
sudo launchctl start com.vix.cron
```

### Test Headless Mode

```bash
HEADLESS=true npx playwright test tests/linkedin-saved-auth.spec.ts
```

### View Cron Logs

```bash
# macOS
log show --predicate 'process == "cron"' --last 1h

# Linux
grep CRON /var/log/syslog
```

## Disable Cron Job

```bash
crontab -e
# Comment out or delete the line
```

For launchd:

```bash
launchctl unload ~/Library/LaunchAgents/com.jobsearch.linkedin.plist
```

## Summary

✅ Script: `scripts/linkedin-master.sh`
✅ Retries: 5 attempts with backoff
✅ Headless: Enabled
✅ Logs: `logs/cron/`
✅ Schedule: Daily at 6:00 AM

Your LinkedIn job search will now run automatically! 🎉
