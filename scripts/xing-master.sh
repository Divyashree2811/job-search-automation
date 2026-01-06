#!/bin/bash

# XING Job Search Master Script with Retry Logic
# Runs daily via cron in headless mode

set -e  # Exit on error (but we'll handle retries)

# Configuration
PROJECT_DIR="/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project"
LOG_DIR="$PROJECT_DIR/logs/cron"
MAX_RETRIES=5
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/xing_${TIMESTAMP}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to run the XING test
run_xing_test() {
    cd "$PROJECT_DIR"

    # Ensure Ollama is running
    if ! pgrep -x "ollama" > /dev/null; then
        log "⚠️  Ollama not running, attempting to start..."
        ollama serve > /dev/null 2>&1 &
        sleep 5
    fi

    # Run the XING test in headless mode
    log "🚀 Starting XING job search..."
    HEADLESS=true npx playwright test tests/master-xing-e2e.spec.ts --project=chromium --reporter=list 2>&1 | tee -a "$LOG_FILE"

    return ${PIPESTATUS[0]}
}

# Main execution with retry logic
log "======================================"
log "XING Job Search - Daily Run"
log "======================================"
log "Max retries: $MAX_RETRIES"
log "Headless mode: ENABLED"
log ""

attempt=1
success=false

while [ $attempt -le $MAX_RETRIES ]; do
    log "📌 Attempt $attempt of $MAX_RETRIES"

    if run_xing_test; then
        log "✅ XING job search completed successfully!"
        success=true
        break
    else
        exit_code=$?
        log "❌ Attempt $attempt failed with exit code: $exit_code"

        if [ $attempt -lt $MAX_RETRIES ]; then
            wait_time=$((attempt * 60))  # Exponential backoff: 60s, 120s, 180s, etc.
            log "⏳ Waiting ${wait_time}s before retry..."
            sleep $wait_time
        fi
    fi

    attempt=$((attempt + 1))
done

# Final status
log ""
log "======================================"
if [ "$success" = true ]; then
    log "✅ Job completed successfully on attempt $(($attempt))"

    # Display database stats
    log ""
    log "📊 Database Summary:"
    if [ -f "$PROJECT_DIR/data/analyzed-jobs.json" ]; then
        total_jobs=$(cat "$PROJECT_DIR/data/analyzed-jobs.json" | jq -r '.totalJobs // "N/A"' 2>/dev/null || echo "N/A")
        last_updated=$(cat "$PROJECT_DIR/data/analyzed-jobs.json" | jq -r '.lastUpdated // "N/A"' 2>/dev/null || echo "N/A")
        log "   Total jobs: $total_jobs"
        log "   Last updated: $last_updated"
    fi

    log "======================================"

    # Clean up old logs (keep last 30 days)
    find "$LOG_DIR" -name "xing_*.log" -mtime +30 -delete 2>/dev/null || true

    exit 0
else
    log "❌ Job failed after $MAX_RETRIES attempts"
    log "======================================"

    # Send failure notification (optional - uncomment to enable)
    # echo "XING job search failed after $MAX_RETRIES attempts. Check logs: $LOG_FILE" | mail -s "XING Job Search Failed" your-email@example.com

    exit 1
fi
