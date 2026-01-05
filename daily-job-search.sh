#!/bin/bash

# Daily Job Search Script
# Runs Playwright test in headless mode and saves results

# Change to project directory
cd "/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project"

# Set date for log file
DATE=$(date +%Y-%m-%d_%H-%M-%S)
LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/job-search-$DATE.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Make sure Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "Starting Ollama..." >> "$LOG_FILE"
    ollama serve >> "$LOG_FILE" 2>&1 &
    sleep 5
fi

echo "========================================" >> "$LOG_FILE"
echo "Job Search Started: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Run the test in headless mode (no browser UI)
npx playwright test tests/xing-e2e.spec.ts --reporter=list >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

echo "========================================" >> "$LOG_FILE"
echo "Job Search Completed: $(date)" >> "$LOG_FILE"
echo "Exit Code: $EXIT_CODE" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Check database stats
echo "" >> "$LOG_FILE"
echo "Database Summary:" >> "$LOG_FILE"
cat data/analyzed-jobs.json | jq -r '.totalJobs, .lastUpdated' >> "$LOG_FILE" 2>&1

# Keep only last 30 days of logs
find "$LOG_DIR" -name "job-search-*.log" -mtime +30 -delete

# Send notification (optional - macOS only)
if [ $EXIT_CODE -eq 0 ]; then
    osascript -e 'display notification "Daily job search completed successfully! Check database for new matches." with title "Job Search Complete"'
else
    osascript -e 'display notification "Job search failed. Check logs for details." with title "Job Search Failed"'
fi

exit $EXIT_CODE
