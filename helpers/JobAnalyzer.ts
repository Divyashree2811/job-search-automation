import * as deepl from 'deepl-node';
import { Ollama } from 'ollama';

export interface AIJobAnalysis {
  requiredSkills: string[];
  techStack: string[];
  experienceYears: string;
  benefits: string[];
  summary: string;
  germanRequired: boolean;
  languageRequirements: string[];
  translatedDescription?: string;
  rawDescription?: string;
  jobDomain: 'software' | 'biotech' | 'healthcare' | 'manufacturing' | 'finance' | 'other' | 'unknown';
  descriptionQuality: 'complete' | 'incomplete' | 'generic';
  confidenceLevel: 'high' | 'medium' | 'low';
  warningFlags: string[];
}

export class JobAnalyzer {
  private translator: deepl.Translator | null = null;
  private ollama: Ollama;
  private useDeepL: boolean = false;

  constructor() {
    // Initialize DeepL if API key is available (optional, Ollama is primary)
    const deeplKey = process.env.DEEPL_API_KEY;
    if (deeplKey && deeplKey !== 'your-deepl-api-key-here') {
      this.translator = new deepl.Translator(deeplKey);
      this.useDeepL = true;
      console.log('ℹ️  DeepL available (but using Ollama for translation)');
    }

    // Initialize Ollama for both translation and analysis
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
    console.log('✅ Ollama initialized for translation + analysis');
  }

  async translateToEnglish(text: string, isGerman: boolean): Promise<string> {
    if (!isGerman) {
      return text; // Already in English
    }

    try {
      console.log('🌐 Translating with Ollama...');

      const prompt = `Translate the following German text to English. Return ONLY the English translation, no explanations or additional text.

German text:
${text}`;

      const response = await this.ollama.chat({
        model: 'llama3.2',
        messages: [{ role: 'user', content: prompt }],
        stream: false
      });

      const translatedText = response.message.content.trim();
      console.log('✅ Translation complete');
      return translatedText;
    } catch (error) {
      console.log('⚠️  Translation failed:', error);
      return text;
    }
  }

  async analyzeWithAI(description: string): Promise<AIJobAnalysis> {
    try {
      console.log('🤖 Analyzing job with Ollama AI...');

      const prompt = `You are analyzing a job description. Your task is to extract ONLY information that is EXPLICITLY stated in the text. DO NOT make assumptions or fill in missing information.

Analyze this job description and return a JSON object with these fields:
{
  "requiredSkills": ["skill1", "skill2", ...],
  "techStack": ["technology1", "technology2", ...],
  "experienceYears": "X years" or "Not specified",
  "benefits": ["benefit1", "benefit2", ...],
  "summary": "Brief 2-3 sentence summary",
  "germanRequired": true or false,
  "languageRequirements": ["language1", "language2", ...],
  "jobDomain": "software" or "biotech" or "healthcare" or "manufacturing" or "finance" or "other" or "unknown",
  "descriptionQuality": "complete" or "incomplete" or "generic",
  "confidenceLevel": "high" or "medium" or "low",
  "warningFlags": ["flag1", "flag2", ...]
}

CRITICAL ANTI-HALLUCINATION RULES:
❌ DO NOT invent skills that are not explicitly mentioned
❌ DO NOT assume technologies based on job title
❌ DO NOT fill in missing information with guesses
✅ ONLY extract information that is clearly stated in the text
✅ Return EMPTY ARRAYS if information is not found
✅ Add warning flags for any uncertainties

FIELD EXTRACTION RULES:

1. requiredSkills: Extract ONLY skills explicitly mentioned in requirements/qualifications section
   - Must be stated in text (e.g., "Python", "Agile", "API testing")
   - DO NOT infer from job title (e.g., don't assume "QA Lead" means "test automation")
   - Return [] if requirements section is missing

2. techStack: Extract ONLY specific tools/technologies explicitly named
   - Must be actual tool names (e.g., "Jenkins", "Docker", "AWS")
   - DO NOT add generic categories (e.g., "test automation framework" is NOT a tech)
   - Return [] if no technologies are mentioned

3. jobDomain: Determine the industry/field based on keywords:
   - "software" if: software development, QA automation, DevOps, web/mobile apps
   - "biotech" if: biologics, pharmaceuticals, drug development, clinical trials
   - "healthcare" if: medical, patient care, hospital, clinical (non-research)
   - "manufacturing" if: production, assembly, factory, industrial
   - "finance" if: banking, trading, insurance, accounting
   - "unknown" if: description is too generic or incomplete to determine

4. descriptionQuality:
   - "complete": Contains detailed requirements, qualifications, responsibilities
   - "incomplete": Missing key sections (requirements OR qualifications OR responsibilities)
   - "generic": Only marketing text, no specific job details

5. confidenceLevel:
   - "high": Description is detailed, clear domain, specific requirements
   - "medium": Some details but missing key sections
   - "low": Generic text or unclear role

6. warningFlags: Add warnings for issues like:
   - "missing_requirements" - No requirements/qualifications section
   - "generic_description" - Only marketing/company info
   - "unclear_domain" - Can't determine if software, biotech, etc.
   - "domain_mismatch" - Job title suggests one domain but description suggests another
   - "external_redirect" - Might be external job link with incomplete scraping

7. germanRequired:
   - TRUE if: German is MANDATORY/REQUIRED in requirements with proficiency levels (A1-C2, fließend, etc.)
   - FALSE if: German not mentioned OR explicitly optional OR just "nice to have"

8. languageRequirements: Extract ALL language requirements with details
   - Format: ["English (B2+)", "German (fluent)", "Spanish (conversational)"]
   - Include proficiency levels if mentioned (A1-C2, B1+, fluent, native, conversational, etc.)
   - Extract from requirements/qualifications section
   - Mark as REQUIRED or OPTIONAL based on context
   - Examples:
     * "Good level of English (B1+) and Russian" → ["English (B1+, required)", "Russian (required)"]
     * "German fluent, English nice to have" → ["German (fluent, required)", "English (optional)"]
     * "Native English speaker" → ["English (native, required)"]
   - Return [] if no language requirements mentioned

Job Description:
${description}

Return ONLY valid JSON, no explanations.`;

      const response = await this.ollama.chat({
        model: 'llama3.2',
        messages: [{ role: 'user', content: prompt }],
        stream: false
      });

      const content = response.message.content;
      console.log('📄 AI Response received, parsing...');

      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysis = JSON.parse(jsonMatch[0]);
          console.log('✅ AI analysis complete');
          console.log(`   Languages: ${analysis.languageRequirements.join(', ') || 'None specified'}`);
          console.log(`   German Required: ${analysis.germanRequired ? 'YES' : 'NO'}`);
          return analysis;
        } catch (parseError) {
          console.error('⚠️  JSON parsing error. Raw JSON:');
          console.error(jsonMatch[0].substring(0, 500) + '...');
          throw parseError;
        }
      }

      console.error('⚠️  No JSON found in AI response. First 200 chars:');
      console.error(content.substring(0, 200));
      throw new Error('Could not parse AI response - no JSON found in output');

    } catch (error) {
      // Enhanced error logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ AI analysis failed:');
      console.error(`   Error: ${errorMessage}`);
      if (error instanceof SyntaxError) {
        console.error('   Issue: JSON parsing error - AI response was not valid JSON');
      } else if (errorMessage.includes('ECONNREFUSED')) {
        console.error('   Issue: Cannot connect to Ollama - is it running?');
        console.error('   Run: ollama serve');
      }

      // Return default structure
      return {
        requiredSkills: [],
        techStack: [],
        experienceYears: 'Not specified',
        benefits: [],
        summary: 'AI analysis not available',
        germanRequired: false,
        languageRequirements: [],
        jobDomain: 'unknown',
        descriptionQuality: 'incomplete',
        confidenceLevel: 'low',
        warningFlags: ['ai_analysis_failed', errorMessage.substring(0, 50)]
      };
    }
  }

  async analyzeJob(description: string, isGerman: boolean): Promise<AIJobAnalysis> {
    // Step 1: Translate if needed
    let workingDescription = description;
    let translatedDescription: string | undefined;

    if (isGerman) {
      translatedDescription = await this.translateToEnglish(description, isGerman);
      workingDescription = translatedDescription;
    }

    // Step 2: Analyze with AI
    const analysis = await this.analyzeWithAI(workingDescription);

    // Add raw and translated descriptions to result
    analysis.rawDescription = description;
    if (translatedDescription) {
      analysis.translatedDescription = translatedDescription;
    }

    return analysis;
  }

  async checkOllamaStatus(): Promise<boolean> {
    try {
      await this.ollama.list();
      console.log('✅ Ollama is running');
      return true;
    } catch (error) {
      console.log('❌ Ollama is not running. Please start Ollama first.');
      console.log('   Run: ollama serve');
      return false;
    }
  }
}
