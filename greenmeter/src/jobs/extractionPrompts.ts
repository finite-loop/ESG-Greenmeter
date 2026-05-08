/**
 * Standard-specific extraction prompts for the LLM pipeline.
 * Each prompt instructs the LLM to extract ESG metrics from OCR text
 * and return structured JSON.
 *
 * The output JSON schemas differ by standard but all share a common
 * envelope: document_info + an array of metric groups.
 */

export type SupportedStandard = 'BRSR' | 'ESRS' | 'GRI';

const BRSR_PROMPT = `You are an ESG metric extraction engine. Extract all SEBI BRSR (Business Responsibility and Sustainability Report) metrics from the following document text.

SEBI mandates reporting on 9 principles under the National Guidelines on Responsible Business Conduct (NGRBC):
- Principle 1: Ethics, Transparency, Accountability
- Principle 2: Sustainable & Safe Goods/Services
- Principle 3: Employee Well-being
- Principle 4: Stakeholder Responsiveness
- Principle 5: Human Rights
- Principle 6: Environment
- Principle 7: Responsible Policy Influence
- Principle 8: Inclusive Growth
- Principle 9: Consumer Value

Extract ALL quantitative metrics including energy, water, emissions, waste, employee stats, safety metrics, governance, CSR spending, and complaints.

Output ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "document_info": {
    "company_name": "string",
    "reporting_period": "string",
    "fiscal_year": "string",
    "sector": "string or null",
    "country": "string or null",
    "currency": "string or null"
  },
  "principles": [
    {
      "principle_number": "string (e.g. P1)",
      "principle_name": "string",
      "essential_indicators": [
        {
          "metric_name": "string",
          "metric_value": "string",
          "unit": "string or null",
          "additional_context": "string or null"
        }
      ],
      "leadership_indicators": [
        {
          "metric_name": "string",
          "metric_value": "string",
          "unit": "string or null",
          "additional_context": "string or null"
        }
      ]
    }
  ]
}`;

const ESRS_PROMPT = `You are an ESG metric extraction engine. Extract all ESRS (European Sustainability Reporting Standards) metrics from the following document text.

The ESRS framework covers 11 standards:
- ESRS 2: General Disclosures
- ESRS E1: Climate Change (GHG, energy, transition plans)
- ESRS E2: Pollution (air, water, soil)
- ESRS E3: Water and Marine Resources
- ESRS E4: Biodiversity and Ecosystems
- ESRS E5: Resource Use and Circular Economy
- ESRS S1: Own Workforce
- ESRS S2: Workers in Value Chain
- ESRS S3: Affected Communities
- ESRS S4: Consumers and End-Users
- ESRS G1: Business Conduct

Extract ALL quantitative metrics including energy, emissions (Scope 1/2/3), water, waste, workforce, safety, diversity, governance, and anti-corruption.

Output ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "document_info": {
    "company_name": "string",
    "reporting_period": "string",
    "fiscal_year": "string",
    "sector": "string or null",
    "country": "string or null",
    "currency": "string or null"
  },
  "standards": [
    {
      "standard_code": "string (e.g. ESRS E1)",
      "standard_name": "string",
      "metrics": [
        {
          "topic": "string",
          "metric_name": "string",
          "metric_value": "string",
          "unit": "string or null",
          "additional_context": "string or null"
        }
      ]
    }
  ]
}`;

const GRI_PROMPT = `You are an ESG metric extraction engine. Extract all GRI (Global Reporting Initiative) Universal Standards 2021 metrics from the following document text.

GRI Standards cover:
- GRI 2: General Disclosures
- GRI 201-206: Economic Standards
- GRI 301-306: Environmental Standards (Materials, Energy, Water, Biodiversity, Emissions, Waste)
- GRI 401-418: Social Standards (Employment, Health & Safety, Training, Diversity, Human Rights, Communities, Suppliers, Customers)

Extract ALL quantitative metrics including economic performance, materials, energy, water, emissions, waste, employment, safety, training, diversity, anti-corruption, and privacy.

Output ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "document_info": {
    "company_name": "string",
    "reporting_period": "string",
    "fiscal_year": "string",
    "sector": "string or null",
    "country": "string or null",
    "currency": "string or null"
  },
  "gri_standards": [
    {
      "gri_series": "string (e.g. GRI 305)",
      "series_name": "string (e.g. Emissions)",
      "disclosures": [
        {
          "gri_code": "string (e.g. 305-1)",
          "disclosure_title": "string",
          "metric_name": "string",
          "metric_value": "string",
          "unit": "string or null",
          "additional_context": "string or null"
        }
      ]
    }
  ]
}`;

const PROMPT_MAP: Record<SupportedStandard, string> = {
  BRSR: BRSR_PROMPT,
  ESRS: ESRS_PROMPT,
  GRI: GRI_PROMPT,
};

/**
 * Returns the extraction system prompt for the given reporting standard.
 * The LLM receives this as the system message, with the OCR text as user input.
 */
export function getExtractionPrompt(standard: SupportedStandard): string {
  const prompt = PROMPT_MAP[standard];
  if (!prompt) {
    throw new Error(`Unsupported extraction standard: ${standard}`);
  }
  return prompt;
}

/**
 * Checks whether a standard string is a supported extraction standard.
 */
export function isSupportedStandard(standard: string): standard is SupportedStandard {
  return standard in PROMPT_MAP;
}
