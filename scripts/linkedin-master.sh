#!/bin/bash

# LinkedIn Job Search Master Script with Retry Logic
# Runs daily at 6am via cron in headless mode

set -e  # Exit on error (but we'll handle retries)

# Configuration
PROJECT_DIR="/Users/divyashree/Documents/Interview Prep Docs/JobSearch/playwright-project"
LOG_DIR="$PROJECT_DIR/logs/cron"
MAX_RETRIES=5
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/linkedin_${TIMESTAMP}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to run the LinkedIn test
run_linkedin_test() {
    cd "$PROJECT_DIR"

    # Ensure Ollama is running
    if ! pgrep -x "ollama" > /dev/null; then
        log "⚠️  Ollama not running, attempting to start..."
        ollama serve > /dev/null 2>&1 &
        sleep 5
    fi

    # Run the OPTIMIZED test in headless mode (2-phase: fast data collection, then AI)
    log "🚀 Starting OPTIMIZED LinkedIn job search (2-phase approach)..."
    log "📋 Phase 1: Collect raw data (FAST)"
    log "🤖 Phase 2: AI analysis (BATCH)"
    HEADLESS=true npx playwright test tests/linkedin-optimized.spec.ts --project=chromium --reporter=list 2>&1 | tee -a "$LOG_FILE"

    return ${PIPESTATUS[0]}
}

# Main execution with retry logic
log "======================================"
log "LinkedIn Job Search - Daily Run"
log "======================================"
log "Max retries: $MAX_RETRIES"
log "Headless mode: ENABLED"
log ""

attempt=1
success=false

while [ $attempt -le $MAX_RETRIES ]; do
    log "📌 Attempt $attempt of $MAX_RETRIES"

    if run_linkedin_test; then
        log "✅ LinkedIn job search completed successfully!"
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
    log "======================================"
    exit 0
else
    log "❌ Job failed after $MAX_RETRIES attempts"
    log "======================================"

    # Send failure notification (optional - uncomment to enable)
    # echo "LinkedIn job search failed after $MAX_RETRIES attempts. Check logs: $LOG_FILE" | mail -s "LinkedIn Job Search Failed" your-email@example.com

    exit 1
fi
