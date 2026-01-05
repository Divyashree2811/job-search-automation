# Free AI Setup Guide (Ollama Only)

This guide will help you set up **completely free** AI-powered job analysis with translation using only Ollama.

## 🎯 What You'll Get

- **Ollama Translation**: German → English translation (100% FREE, unlimited, local)
- **Ollama AI Analysis**: Extract skills, tech stack, benefits, etc. (100% FREE, unlimited, local)

---

## Step 1: Install Ollama (10 minutes)

### On macOS:
```bash
# Download and install
brew install ollama

# Or download from: https://ollama.com/download
```

### On Linux:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### On Windows:
Download installer from: https://ollama.com/download

---

## Step 2: Start Ollama and Download AI Model

### Start Ollama service:
```bash
ollama serve
```

Keep this terminal open. Open a new terminal and run:

### Download the AI model (llama3.2 - ~2GB):
```bash
ollama pull llama3.2
```

This will download the free AI model to your computer. Takes 5-10 minutes depending on your internet speed.

### Verify installation:
```bash
ollama list
```

You should see `llama3.2` in the list.

---

## Step 3: Run Your Job Analysis Test

Now you're ready! Run the E2E test:

```bash
npm run test:e2e
```

---

## 📊 What Happens During the Test

For each job posting, the system will:

1. ✅ **Extract** job details (title, company, salary, date)
2. 🇩🇪 **Detect** if description is in German
3. 🌐 **Translate** German → English using Ollama (if German detected)
4. 🤖 **Analyze** with Ollama AI to extract:
   - Required skills
   - Tech stack/tools
   - Years of experience
   - Benefits offered
   - Job summary

---

## 💰 Cost Breakdown

| Service | Cost | Limit |
|---------|------|-------|
| **Ollama Translation** | $0 | Unlimited (runs locally) |
| **Ollama Analysis** | $0 | Unlimited (runs locally) |
| **Total** | **$0** | **100% FREE, UNLIMITED** |

---

## 🔧 Troubleshooting

### "Ollama is not running"
**Solution**: Make sure Ollama is running:
```bash
ollama serve
```

### Ollama is slow
**Solution**: This is normal for local AI. First run takes longer as the model loads into memory, then it speeds up.

### Translation quality concerns
**Solution**: Ollama's translation quality is good for technical job descriptions. If you need professional-grade translation, you can optionally add DeepL API key to `.env` (though it won't be used by default)

---

## 📝 Sample Output

```
📌 Analyzing job 1 of 3...
🖱️  Clicking job posting #1
✅ Opened job in new tab
📝 Extracting job details from new tab...
🌐 Translating with Ollama...
✅ Translation complete
🤖 Analyzing job with Ollama AI...
✅ AI analysis complete
✅ Extracted: QA Tester at TechCompany GmbH

📊 JOB ANALYSIS SUMMARY
================================================================================

[1] QA Tester
    Company: TechCompany GmbH
    Salary: €50,000 - €70,000
    Posted: 2 days ago
    Languages: German, English
    Description Language: 🇩🇪 German

    🤖 AI ANALYSIS:
       Summary: Looking for an experienced QA Tester to join their agile team...
       Experience: 3-5 years
       Skills: Test Automation, Selenium, Java, Agile, CI/CD
       Tech Stack: Selenium, Jenkins, JIRA, Git
       Benefits: Remote work, Flexible hours, Health insurance

    🌐 TRANSLATED (First 200 chars):
       We are looking for an experienced QA Tester to strengthen our team.
       You will be responsible for automated testing...
```

---

## ⚡ Quick Start Commands

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Run tests
npm run test:e2e
```

---

## 🎉 You're All Set!

You now have a completely free AI-powered job analysis system that:
- Translates German job descriptions to English with Ollama
- Extracts structured information automatically
- Runs 100% locally (no data sent to any external services)
- No API keys needed
- No rate limits or usage caps
