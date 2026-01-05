# Job Search Automation with Playwright

Automated job search and analysis tool for LinkedIn and Xing using Playwright, with AI-powered job description analysis using Ollama.

## Features

- **Multi-Platform Support**: Search jobs on LinkedIn and Xing
- **Authentication Persistence**: Save and reuse login sessions (7-day expiry)
- **AI-Powered Analysis**:
  - Extract skills, tech stack, and requirements
  - Detect and translate German job descriptions
  - Identify mandatory language requirements
  - Classify job domain and quality
- **Smart Filtering**:
  - Skip jobs with mandatory German requirements
  - Prioritize jobs with key skills (Playwright, Python, TypeScript)
  - Avoid re-analyzing previously processed jobs
- **Database Management**:
  - Track all analyzed jobs
  - Export important jobs to separate files
  - Deduplication across test runs

## Prerequisites

- Node.js (v16 or higher)
- [Ollama](https://ollama.ai/) running locally with `llama3.2` model
- LinkedIn and/or Xing account

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd playwright-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install
   ```

4. **Install and start Ollama**
   ```bash
   # Install Ollama from https://ollama.ai/

   # Pull the llama3.2 model
   ollama pull llama3.2

   # Start Ollama server
   ollama serve
   ```

5. **Configure environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env

   # Edit .env and add your credentials
   nano .env
   ```

## Configuration

Edit `.env` file with your settings:

```env
# Your login credentials
USER_EMAIL=your-email@example.com
USER_PASSWORD=your-password

# Platform selection
ENABLE_LINKEDIN_AUTH=true
ENABLE_XING_AUTH=false

# Skip initial auth (set to true after first successful login)
SKIP_AUTH=false

# Optional: DeepL API for translation (Ollama is used by default)
DEEPL_API_KEY=your-deepl-api-key
```

## Usage

### First Time Setup (Authentication)

1. **LinkedIn Authentication**
   ```bash
   npm run test:linkedin:auth
   ```
   - This will open a browser and save your session to `storageState/linkedinAuth.json`
   - Set `SKIP_AUTH=true` in `.env` after successful login

2. **Xing Authentication** (if needed)
   ```bash
   npm run test:xing:auth
   ```

### Search and Analyze Jobs

**LinkedIn Job Search**
```bash
npm run test:linkedin
```

**Xing Job Search**
```bash
npm run test:xing
```

### What Happens During Analysis

1. Searches for jobs based on your query (e.g., "QA Engineer", "SDET")
2. Applies filters (date posted, location)
3. For each job:
   - Checks if already analyzed (skip if yes)
   - Extracts job details
   - Detects language (German/English)
   - Translates German descriptions to English (using Ollama)
   - Analyzes with AI to extract:
     - Required skills
     - Tech stack
     - Experience requirements
     - Language requirements (with proficiency levels)
     - Benefits
   - Filters out jobs with mandatory German requirement
   - Saves to database
4. Exports important jobs (with Playwright/Python/TypeScript skills) to separate file

## Project Structure

```
playwright-project/
├── pages/               # Page Object Models
│   ├── BasePage.ts
│   ├── LinkedInJobPage.ts
│   ├── LinkedInLoginPage.ts
│   └── XingHomePage.ts
├── helpers/            # Utility classes
│   ├── JobAnalyzer.ts  # AI-powered job analysis
│   └── JobDatabase.ts  # Job storage and deduplication
├── tests/              # Test files
│   ├── linkedin-saved-auth.spec.ts
│   └── xing-job-search.spec.ts
├── auth.setup.ts       # Authentication setup
├── playwright.config.ts
└── .env.example        # Environment template

Generated during runtime:
├── storageState/       # Saved authentication sessions
├── data/              # Analyzed jobs database
└── test-results/      # Screenshots and reports
```

## Database Files

- `data/linkedin-analyzed-jobs.json` - All analyzed LinkedIn jobs
- `data/linkedin-important-jobs.json` - LinkedIn jobs with key skills
- `data/xing-analyzed-jobs.json` - All analyzed Xing jobs
- `data/xing-important-jobs.json` - Xing jobs with key skills

## Key Skills Filter

Jobs are marked as "important" if they mention:
- Playwright
- Python
- TypeScript

You can modify this in `helpers/JobDatabase.ts` line 285.

## Language Analysis

The AI extracts all language requirements with proficiency levels:
- Example: `["English (B1+, required)", "Russian (required)", "German (optional)"]`
- Jobs with mandatory German are automatically filtered out
- Configurable in `LinkedInJobPage.ts` and `XingHomePage.ts`

## Customization

### Change Search Query
Edit `tests/linkedin-saved-auth.spec.ts` line 48:
```typescript
const searchQuery = '"QA Engineer" OR "SDET" OR "Test Automation"';
```

### Change Date Filter
Edit line 55:
```typescript
await jobPage.applyDatePostedFilter('Past 24 hours');
// Options: 'Past 24 hours' | 'Past Week' | 'Past Month' | 'Any Time'
```

### Change Job Limit
Edit line 72:
```typescript
const maxJobsToProcess = Math.min(jobSearchCount, 50); // Process up to 50 jobs
```

## Troubleshooting

### Ollama Connection Error
```
❌ AI analysis failed: Cannot connect to Ollama
```
**Solution**: Make sure Ollama is running
```bash
ollama serve
```

### Authentication Failed
- Clear `storageState/` directory
- Set `SKIP_AUTH=false` in `.env`
- Run authentication setup again

### Language Detection Issues
- Check console output for `Languages: ...` to see extracted requirements
- Verify AI response in logs if parsing fails

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Disclaimer

This tool is for personal job search automation. Please ensure you comply with LinkedIn and Xing's Terms of Service. Use responsibly and avoid excessive requests that might be considered scraping.
