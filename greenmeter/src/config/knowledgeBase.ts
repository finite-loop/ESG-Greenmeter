/**
 * Static knowledge base content for ESG standards, methodologies, and regulations.
 * Organized by framework -> category -> entries.
 *
 * v1: Static content only (no admin editing — deferred to v2 per decisions-log).
 */

export type Framework = "BRSR" | "ESRS" | "GRI" | "IFRS_S2" | "SASB" | "TCFD";
export type Pillar = "E" | "S" | "G";
export type ContentType = "standard" | "regulation" | "methodology" | "guide";

export interface KnowledgeEntry {
  /** Unique slug for deep-linking (framework-category-title derived) */
  id: string;
  framework: Framework;
  pillar: Pillar;
  category: string;
  title: string;
  contentType: ContentType;
  definition: string;
  methodology: string;
  interventions: string[];
  regulatoryContext?: string;
  /** Parameter codes this entry relates to (for bidirectional linking) */
  relatedParamCodes: string[];
  tags: string[];
  updatedAt: string;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  pillar: Pillar;
  description: string;
}

export interface FrameworkMetadata {
  id: Framework;
  name: string;
  fullName: string;
  description: string;
}

export const FRAMEWORKS: FrameworkMetadata[] = [
  {
    id: "BRSR",
    name: "BRSR",
    fullName: "Business Responsibility and Sustainability Report",
    description:
      "SEBI-mandated sustainability disclosure framework for top 1,000 listed companies in India. Covers 9 principles across E, S, G pillars.",
  },
  {
    id: "ESRS",
    name: "ESRS",
    fullName: "European Sustainability Reporting Standards",
    description:
      "EU Corporate Sustainability Reporting Directive (CSRD) standards. Mandatory double-materiality reporting for in-scope companies.",
  },
  {
    id: "GRI",
    name: "GRI",
    fullName: "Global Reporting Initiative Standards",
    description:
      "International standards for sustainability reporting used by 10,000+ organizations globally. Modular, topic-specific approach.",
  },
  {
    id: "IFRS_S2",
    name: "IFRS S2",
    fullName: "IFRS S2 Climate-related Disclosures",
    description:
      "ISSB climate disclosure standard focused on Scope 1, 2, 3 GHG emissions, climate risks, and scenario analysis.",
  },
  {
    id: "SASB",
    name: "SASB",
    fullName: "Sustainability Accounting Standards Board",
    description:
      "Industry-specific sustainability accounting standards designed for investor decision-making. Covers 77 industries across 11 sectors with financially material ESG topics.",
  },
  {
    id: "TCFD",
    name: "TCFD",
    fullName: "Task Force on Climate-related Financial Disclosures",
    description:
      "Climate risk disclosure framework organized around Governance, Strategy, Risk Management, and Metrics & Targets. Widely adopted by financial institutions and corporates.",
  },
];

export const CATEGORIES: KnowledgeCategory[] = [
  // Environment
  { id: "ghg-emissions", name: "GHG Emissions", pillar: "E", description: "Scope 1, 2, and 3 greenhouse gas emissions accounting and reduction" },
  { id: "energy", name: "Energy", pillar: "E", description: "Energy consumption, renewable energy, and energy efficiency" },
  { id: "water", name: "Water & Effluents", pillar: "E", description: "Water withdrawal, consumption, discharge, and recycling" },
  { id: "waste", name: "Waste Management", pillar: "E", description: "Waste generation, disposal methods, and circular economy" },
  { id: "biodiversity", name: "Biodiversity", pillar: "E", description: "Impact on ecosystems, land use, and species conservation" },
  // Social
  { id: "workforce", name: "Workforce & Labour", pillar: "S", description: "Employment practices, diversity, training, and labour rights" },
  { id: "health-safety", name: "Health & Safety", pillar: "S", description: "Occupational health, injury rates, and safety management" },
  { id: "community", name: "Community Impact", pillar: "S", description: "CSR spending, local community engagement, and social investments" },
  { id: "human-rights", name: "Human Rights", pillar: "S", description: "Human rights due diligence, forced labour, and child labour" },
  // Governance
  { id: "board-governance", name: "Board & Governance", pillar: "G", description: "Board composition, independence, diversity, and oversight" },
  { id: "ethics", name: "Ethics & Compliance", pillar: "G", description: "Anti-corruption, whistleblower mechanisms, and ethical conduct" },
  { id: "transparency", name: "Transparency & Disclosure", pillar: "G", description: "Reporting practices, stakeholder engagement, and materiality" },
];

/**
 * Static knowledge base entries. Each entry belongs to a framework and category.
 * Content is real ESG reference material for common metrics.
 */
export const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  // --- BRSR Environment ---
  {
    id: "brsr-ghg-scope1-direct",
    framework: "BRSR",
    pillar: "E",
    category: "ghg-emissions",
    title: "Direct GHG Emissions (Scope 1)",
    contentType: "standard",
    definition:
      "Scope 1 emissions are direct greenhouse gas emissions from sources owned or controlled by the company. This includes combustion of fuels in company-owned vehicles and facilities, process emissions from manufacturing, and fugitive emissions (e.g., refrigerant leaks).",
    methodology:
      "Calculate using: Activity Data × Emission Factor. Activity data includes fuel consumption (litres/kg), process output, and refrigerant top-up logs. Use IPCC or national emission factors. Report in metric tonnes of CO₂ equivalent (tCO₂e). Apply GWP values from IPCC AR5 for non-CO₂ gases (CH₄, N₂O, HFCs).",
    interventions: [
      "Switch to renewable energy for on-site power generation",
      "Electrify vehicle fleet",
      "Improve combustion efficiency in boilers/furnaces",
      "Implement fugitive emissions detection and repair (LDAR) programs",
      "Optimize manufacturing processes to reduce process emissions",
    ],
    regulatoryContext:
      "BRSR Core Principle 6, Question 7(a). Mandatory for top 1,000 listed companies. SEBI requires year-on-year comparison and intensity metrics.",
    relatedParamCodes: ["P6-Q7a-S1", "P6-GHG-S1"],
    tags: ["GHG", "Scope 1", "Direct emissions", "CO₂e"],
    updatedAt: "2024-01",
  },
  {
    id: "brsr-ghg-scope2-indirect",
    framework: "BRSR",
    pillar: "E",
    category: "ghg-emissions",
    title: "Indirect GHG Emissions (Scope 2)",
    contentType: "standard",
    definition:
      "Scope 2 emissions are indirect GHG emissions from the generation of purchased electricity, steam, heat, or cooling consumed by the company. These occur at the utility's generation facility, not at the company's own operations.",
    methodology:
      "Calculate using purchased electricity (kWh) × grid emission factor. India's Central Electricity Authority publishes grid emission factors annually. Dual reporting is recommended: location-based (grid average) and market-based (contractual instruments like RECs/PPAs).",
    interventions: [
      "Procure renewable energy through Power Purchase Agreements (PPAs)",
      "Install on-site solar or wind generation",
      "Purchase Renewable Energy Certificates (RECs)",
      "Improve energy efficiency to reduce total electricity demand",
      "Implement energy management systems (ISO 50001)",
    ],
    regulatoryContext:
      "BRSR Core Principle 6, Question 7(a). Must report alongside Scope 1. SEBI expects trending data over 3 years.",
    relatedParamCodes: ["P6-Q7a-S2", "P6-GHG-S2"],
    tags: ["GHG", "Scope 2", "Electricity", "Indirect emissions"],
    updatedAt: "2024-01",
  },
  {
    id: "brsr-energy-consumption",
    framework: "BRSR",
    pillar: "E",
    category: "energy",
    title: "Total Energy Consumption",
    contentType: "standard",
    definition:
      "Total energy consumed from all sources: fuel, electricity, heating, cooling, and steam. Includes both renewable and non-renewable sources. Reported in standard energy units (GJ or MWh).",
    methodology:
      "Sum all energy inputs: (Fuel consumed × calorific value) + (Electricity purchased × conversion factor) + (Renewable energy generated and consumed). Convert all units to GJ using standard conversion factors. Calculate energy intensity as GJ per unit of revenue or production.",
    interventions: [
      "Conduct energy audits to identify efficiency opportunities",
      "Install LED lighting and efficient HVAC systems",
      "Implement process heat recovery systems",
      "Deploy building energy management systems (BEMS)",
      "Set science-based energy reduction targets",
    ],
    regulatoryContext:
      "BRSR Core Principle 6, Question 7(b). Must disclose total energy consumed and energy intensity ratio. BEE compliance may overlap.",
    relatedParamCodes: ["P6-Q7b-ENERGY", "P6-ENERGY-TOTAL"],
    tags: ["Energy", "Consumption", "Intensity", "GJ"],
    updatedAt: "2024-02",
  },
  {
    id: "brsr-water-withdrawal",
    framework: "BRSR",
    pillar: "E",
    category: "water",
    title: "Water Withdrawal & Consumption",
    contentType: "standard",
    definition:
      "Total water withdrawn from all sources (surface water, groundwater, municipal supply, rainwater, others) and total water consumed (withdrawn minus discharged). Water stress areas require enhanced disclosure.",
    methodology:
      "Track water meters at all intake points. Categorize by source type. Water consumption = Total withdrawal − Total discharge. Identify operations in water-stressed areas using WRI Aqueduct or similar tools. Calculate water intensity (KL per unit revenue or production).",
    interventions: [
      "Install water recycling and recirculation systems",
      "Implement rainwater harvesting",
      "Deploy zero liquid discharge (ZLD) systems",
      "Reduce water use in cooling processes",
      "Set facility-level water reduction targets",
    ],
    regulatoryContext:
      "BRSR Core Principle 6, Question 7(c). Must disclose withdrawal by source, consumption, discharge quality, and operations in water stress areas.",
    relatedParamCodes: ["P6-Q7c-WATER", "P6-WATER-WD"],
    tags: ["Water", "Withdrawal", "Consumption", "Stress areas"],
    updatedAt: "2024-01",
  },
  {
    id: "brsr-waste-generated",
    framework: "BRSR",
    pillar: "E",
    category: "waste",
    title: "Waste Generation & Management",
    contentType: "standard",
    definition:
      "Total waste generated (hazardous and non-hazardous) and waste management methods (recycling, composting, incineration, landfill). Includes e-waste, plastic waste, biomedical waste, and construction/demolition waste.",
    methodology:
      "Weigh waste at source or at disposal points. Categorize as hazardous (per CPCB guidelines) or non-hazardous. Track disposal method for each waste stream. Calculate waste diversion rate = (Recycled + Composted + Recovered) / Total generated × 100.",
    interventions: [
      "Implement source segregation and 3R (Reduce, Reuse, Recycle) programs",
      "Partner with authorized recyclers for e-waste and hazardous waste",
      "Convert organic waste to biogas or compost",
      "Adopt circular economy principles in packaging",
      "Set zero-waste-to-landfill targets",
    ],
    regulatoryContext:
      "BRSR Core Principle 6, Question 7(d). Must report waste by type, disposal method, and whether recycled/recovered. Extended Producer Responsibility (EPR) obligations may apply.",
    relatedParamCodes: ["P6-Q7d-WASTE", "P6-WASTE-HAZ", "P6-WASTE-NONHAZ"],
    tags: ["Waste", "Hazardous", "Recycling", "Circular economy"],
    updatedAt: "2024-01",
  },
  // --- BRSR Social ---
  {
    id: "brsr-workforce-diversity",
    framework: "BRSR",
    pillar: "S",
    category: "workforce",
    title: "Workforce Diversity & Equal Opportunity",
    contentType: "standard",
    definition:
      "Disclosure of employee demographics including gender breakdown, differently-abled employees, and representation across management levels. Covers permanent, temporary, and contract workers.",
    methodology:
      "Report headcount by gender (male, female, other) across categories: permanent employees, contract workers, and board members. Track representation percentages at each management level. Report median remuneration ratios by gender.",
    interventions: [
      "Set diversity hiring targets with measurable KPIs",
      "Implement blind resume screening processes",
      "Create mentorship programs for underrepresented groups",
      "Conduct regular pay equity audits",
      "Partner with organizations focused on inclusive recruitment",
    ],
    regulatoryContext:
      "BRSR Core Principle 3, Questions 1-3. Mandatory disclosure of employee and worker demographics. SEBI LODR requires at least one woman director on the board.",
    relatedParamCodes: ["P3-Q1-EMP", "P3-Q2-DIV", "P3-GENDER"],
    tags: ["Diversity", "Gender", "Employment", "Equal opportunity"],
    updatedAt: "2024-01",
  },
  {
    id: "brsr-health-safety",
    framework: "BRSR",
    pillar: "S",
    category: "health-safety",
    title: "Occupational Health & Safety",
    contentType: "methodology",
    definition:
      "Safety performance metrics including Lost Time Injury Frequency Rate (LTIFR), total recordable injuries, fatalities, and near-miss reporting. Covers both employees and contract workers.",
    methodology:
      "LTIFR = (Lost time injuries × 200,000) / Total person-hours worked. Total Recordable Injury Rate (TRIR) uses same formula but includes all recordable injuries. Track separately for employees and workers. Report fatalities with root cause analysis.",
    interventions: [
      "Implement behaviour-based safety (BBS) programs",
      "Conduct regular safety audits and hazard assessments",
      "Deploy safety management systems (ISO 45001)",
      "Increase near-miss reporting culture",
      "Invest in PPE and engineering controls",
    ],
    regulatoryContext:
      "BRSR Core Principle 3, Question 11. Must report LTIFR, fatalities, and safety-related complaints for both employees and workers. Factories Act and BOCW Act requirements may overlap.",
    relatedParamCodes: ["P3-Q11-LTIFR", "P3-SAFETY", "P3-Q11-FATAL"],
    tags: ["LTIFR", "Safety", "OHS", "Injuries", "Fatalities"],
    updatedAt: "2024-01",
  },
  // --- BRSR Governance ---
  {
    id: "brsr-board-independence",
    framework: "BRSR",
    pillar: "G",
    category: "board-governance",
    title: "Board Composition & Independence",
    contentType: "regulation",
    definition:
      "Board structure including percentage of independent directors, women directors, and committee composition. Independent directors ensure unbiased oversight of management decisions.",
    methodology:
      "Report total board size, number and percentage of independent directors, women directors, and executive vs. non-executive directors. Disclose committee memberships (Audit, Nomination & Remuneration, CSR, Risk Management). Track meeting attendance rates.",
    interventions: [
      "Conduct annual board effectiveness assessments",
      "Ensure succession planning for key board roles",
      "Diversify board skills matrix beyond traditional backgrounds",
      "Implement independent director tenure limits",
      "Strengthen committee charters with ESG oversight responsibilities",
    ],
    regulatoryContext:
      "BRSR Principle 1, Leadership Indicators. SEBI LODR Regulation 17 requires minimum 50% independent directors for companies with executive chairperson. At least one woman director mandatory.",
    relatedParamCodes: ["P1-BOARD-IND", "P1-BOARD-WOMEN"],
    tags: ["Board", "Independence", "Governance", "SEBI"],
    updatedAt: "2024-01",
  },
  // --- ESRS Environment ---
  {
    id: "esrs-e1-climate-change",
    framework: "ESRS",
    pillar: "E",
    category: "ghg-emissions",
    title: "ESRS E1 — Climate Change",
    contentType: "standard",
    definition:
      "Comprehensive climate change disclosure covering transition plans, GHG emission targets, Scope 1/2/3 emissions, energy consumption, and internal carbon pricing. Requires alignment with Paris Agreement goals.",
    methodology:
      "Follow GHG Protocol for emission calculations. Report Scope 1, 2 (location & market-based), and 3 by category. Disclose transition plan including decarbonization levers, CapEx alignment with EU Taxonomy, and scenario analysis (TCFD-aligned). Set targets validated against Science Based Targets initiative (SBTi) where possible.",
    interventions: [
      "Develop a Paris-aligned transition plan with milestones",
      "Set SBTi-validated near-term and net-zero targets",
      "Implement internal carbon pricing mechanism",
      "Align CapEx with EU Taxonomy climate criteria",
      "Conduct climate scenario analysis (1.5°C and 2°C pathways)",
    ],
    regulatoryContext:
      "ESRS E1 (Climate Change) under EU CSRD. Mandatory for large companies and listed SMEs in the EU. Effective from FY2024 for large PIEs. Cross-references TCFD, ISSB, and EU Taxonomy.",
    relatedParamCodes: ["E1-GHG-S1", "E1-GHG-S2", "E1-GHG-S3", "E1-ENERGY"],
    tags: ["ESRS", "Climate", "Transition plan", "CSRD", "GHG"],
    updatedAt: "2024-01",
  },
  {
    id: "esrs-e3-water-marine",
    framework: "ESRS",
    pillar: "E",
    category: "water",
    title: "ESRS E3 — Water and Marine Resources",
    contentType: "standard",
    definition:
      "Water consumption, withdrawal, and discharge disclosures with focus on water-stressed areas. Includes marine resource impacts for relevant sectors. Requires policies, targets, and action plans.",
    methodology:
      "Report water withdrawal by source type and water-stressed area status. Calculate water consumption (withdrawal − discharge). Disclose water intensity metrics. For marine impacts, report on eutrophication potential, ocean acidification contributions, and microplastic releases.",
    interventions: [
      "Implement water stewardship practices (AWS certification)",
      "Conduct site-level water risk assessments",
      "Deploy advanced wastewater treatment technologies",
      "Engage in catchment-level water stewardship partnerships",
      "Set context-based water targets for stressed regions",
    ],
    regulatoryContext:
      "ESRS E3 under EU CSRD. Material for water-intensive sectors. Must disclose policies, actions, targets, and metrics. Cross-references GRI 303 and CDP Water.",
    relatedParamCodes: ["E3-WATER-WD", "E3-WATER-CON", "E3-WATER-DIS"],
    tags: ["ESRS", "Water", "Marine", "Water stress"],
    updatedAt: "2024-01",
  },
  // --- ESRS Social ---
  {
    id: "esrs-s1-own-workforce",
    framework: "ESRS",
    pillar: "S",
    category: "workforce",
    title: "ESRS S1 — Own Workforce",
    contentType: "standard",
    definition:
      "Comprehensive workforce disclosure covering working conditions, equal treatment, diversity metrics, adequate wages, and social dialogue. Requires due diligence on labour rights and management of material impacts.",
    methodology:
      "Report total headcount by contract type, gender, age group, and country. Disclose gender pay gap (mean and median). Track training hours per employee by gender and category. Report on collective bargaining coverage. Conduct worker satisfaction surveys.",
    interventions: [
      "Implement living wage policy across all operations",
      "Establish formal grievance mechanisms accessible to all workers",
      "Conduct annual diversity and inclusion assessments",
      "Increase training investment with equitable access",
      "Strengthen social dialogue through works councils",
    ],
    regulatoryContext:
      "ESRS S1 under EU CSRD. Mandatory for all in-scope companies. 83 data points covering workforce characteristics, working conditions, and due diligence processes.",
    relatedParamCodes: ["S1-WORKFORCE", "S1-DIV", "S1-PAY-GAP"],
    tags: ["ESRS", "Workforce", "Labour rights", "Pay gap", "Diversity"],
    updatedAt: "2024-01",
  },
  // --- GRI Environment ---
  {
    id: "gri-305-emissions",
    framework: "GRI",
    pillar: "E",
    category: "ghg-emissions",
    title: "GRI 305 — Emissions",
    contentType: "standard",
    definition:
      "GRI reporting standard for greenhouse gas emissions. Covers direct (Scope 1), energy indirect (Scope 2), and other indirect (Scope 3) emissions. Includes emission intensity ratios and emission reduction disclosures.",
    methodology:
      "Follow GHG Protocol Corporate Standard methodology. GRI 305-1: Scope 1 (direct combustion, process, fugitive). GRI 305-2: Scope 2 (purchased energy, location + market-based). GRI 305-3: Scope 3 (15 upstream/downstream categories). GRI 305-4: Intensity ratio (tCO₂e per revenue/production). GRI 305-5: Reduction achieved.",
    interventions: [
      "Develop a comprehensive GHG inventory management plan",
      "Engage supply chain on Scope 3 data collection",
      "Set reduction targets aligned with 1.5°C pathway",
      "Implement emissions management software for real-time tracking",
      "Participate in CDP Climate Change questionnaire",
    ],
    regulatoryContext:
      "GRI 305 (2016, updated 2023). Voluntary but widely adopted. Cross-references GHG Protocol, IPCC guidelines, and UNFCCC reporting requirements. Used by CDP, many sustainability indices.",
    relatedParamCodes: ["GRI-305-1", "GRI-305-2", "GRI-305-3", "GRI-305-4"],
    tags: ["GRI", "Emissions", "GHG Protocol", "Scope 1", "Scope 2", "Scope 3"],
    updatedAt: "2023-10",
  },
  {
    id: "gri-303-water",
    framework: "GRI",
    pillar: "E",
    category: "water",
    title: "GRI 303 — Water and Effluents",
    contentType: "standard",
    definition:
      "Water stewardship disclosures covering interactions with water as a shared resource, management approach, withdrawal, discharge, and consumption. Special attention to water stress areas.",
    methodology:
      "GRI 303-3: Report water withdrawal by source (surface, ground, seawater, produced, third-party) in megalitres. GRI 303-4: Water discharge by destination and treatment method. GRI 303-5: Water consumption = withdrawal − discharge. All broken down by water stress area status. Use WRI Aqueduct for stress classification.",
    interventions: [
      "Implement water balance monitoring at all facilities",
      "Deploy closed-loop cooling systems",
      "Adopt water footprint assessment methodology (ISO 14046)",
      "Invest in nature-based solutions for water management",
      "Collaborate with local stakeholders on watershed protection",
    ],
    regulatoryContext:
      "GRI 303 (2018). Applicable to all sectors, especially material for water-intensive industries (mining, agriculture, manufacturing, textiles).",
    relatedParamCodes: ["GRI-303-3", "GRI-303-4", "GRI-303-5"],
    tags: ["GRI", "Water", "Effluents", "Water stress", "Withdrawal"],
    updatedAt: "2023-09",
  },
  {
    id: "gri-306-waste",
    framework: "GRI",
    pillar: "E",
    category: "waste",
    title: "GRI 306 — Waste",
    contentType: "standard",
    definition:
      "Waste-related disclosures covering waste generation, significant waste-related impacts, management of significant impacts, and waste diverted from and directed to disposal.",
    methodology:
      "GRI 306-3: Total waste generated by composition. GRI 306-4: Waste diverted from disposal (preparation for reuse, recycling, other recovery) — report by hazardous/non-hazardous and on-site/off-site. GRI 306-5: Waste directed to disposal (incineration with/without energy recovery, landfilling, other) — same breakdown.",
    interventions: [
      "Adopt zero-waste-to-landfill strategy",
      "Implement extended producer responsibility programs",
      "Design products for recyclability and disassembly",
      "Partner with waste-to-value enterprises",
      "Conduct lifecycle assessments to identify waste reduction points",
    ],
    regulatoryContext:
      "GRI 306 (2020). Material for manufacturing, consumer goods, and construction sectors. Aligns with EU Waste Framework Directive concepts.",
    relatedParamCodes: ["GRI-306-3", "GRI-306-4", "GRI-306-5"],
    tags: ["GRI", "Waste", "Circular economy", "Recycling", "Diversion"],
    updatedAt: "2023-10",
  },
  // --- GRI Social ---
  {
    id: "gri-403-ohs",
    framework: "GRI",
    pillar: "S",
    category: "health-safety",
    title: "GRI 403 — Occupational Health and Safety",
    contentType: "standard",
    definition:
      "Occupational health and safety management disclosures covering OHS management systems, hazard identification, worker training, injury rates, and work-related ill health. Applies to employees and non-employee workers.",
    methodology:
      "GRI 403-9: Rate of fatalities, high-consequence injuries, and recordable injuries per 200,000 or 1,000,000 hours worked. Report separately for employees and workers who are not employees. Disclose main types of work-related injuries and number of hours worked.",
    interventions: [
      "Achieve ISO 45001 certification for OHS management",
      "Implement digital safety reporting and analytics",
      "Conduct regular psychosocial risk assessments",
      "Increase safety training hours per worker",
      "Deploy wearable safety technology in high-risk areas",
    ],
    regulatoryContext:
      "GRI 403 (2018). Material for all sectors, especially construction, manufacturing, mining. Cross-references ILO conventions and national OHS regulations.",
    relatedParamCodes: ["GRI-403-9", "GRI-403-10"],
    tags: ["GRI", "OHS", "Safety", "LTIFR", "Injuries"],
    updatedAt: "2023-10",
  },
  {
    id: "gri-405-diversity",
    framework: "GRI",
    pillar: "S",
    category: "workforce",
    title: "GRI 405 — Diversity and Equal Opportunity",
    contentType: "standard",
    definition:
      "Diversity of governance bodies and employees by gender, age group, and other indicators. Includes ratio of basic salary and remuneration of women to men by employee category.",
    methodology:
      "GRI 405-1: Report percentage of individuals in governance bodies and employees by gender, age group (<30, 30-50, >50), and other diversity indicators. GRI 405-2: Ratio of basic salary and remuneration of women to men for each employee category and by significant locations of operation.",
    interventions: [
      "Establish board diversity policy with measurable targets",
      "Conduct pay equity analysis and close identified gaps",
      "Implement inclusive hiring practices with diverse interview panels",
      "Create employee resource groups for underrepresented communities",
      "Track and report on diversity KPIs quarterly",
    ],
    regulatoryContext:
      "GRI 405 (2016). Cross-references with national non-discrimination laws, EU Gender Equality Directive, and SEBI LODR diversity requirements.",
    relatedParamCodes: ["GRI-405-1", "GRI-405-2"],
    tags: ["GRI", "Diversity", "Gender", "Pay equity", "Board"],
    updatedAt: "2023-10",
  },
  // --- GRI Governance ---
  {
    id: "gri-205-anticorruption",
    framework: "GRI",
    pillar: "G",
    category: "ethics",
    title: "GRI 205 — Anti-corruption",
    contentType: "standard",
    definition:
      "Anti-corruption disclosures covering risk assessments, employee training, and confirmed incidents. Includes bribery, facilitation payments, fraud, extortion, and money laundering.",
    methodology:
      "GRI 205-1: Operations assessed for corruption risks (number and percentage). GRI 205-2: Communication and training on anti-corruption policies and procedures — report by employee category and region. GRI 205-3: Confirmed incidents and actions taken (number, nature, outcome).",
    interventions: [
      "Implement robust anti-bribery management system (ISO 37001)",
      "Conduct regular corruption risk assessments",
      "Deploy mandatory annual anti-corruption training",
      "Establish anonymous whistleblower hotline",
      "Conduct due diligence on business partners and suppliers",
    ],
    regulatoryContext:
      "GRI 205 (2016). Material across all sectors. Cross-references Prevention of Corruption Act (India), UK Bribery Act, US FCPA, and OECD Anti-Bribery Convention.",
    relatedParamCodes: ["GRI-205-1", "GRI-205-2", "GRI-205-3"],
    tags: ["GRI", "Anti-corruption", "Bribery", "Ethics", "Compliance"],
    updatedAt: "2023-10",
  },
  // --- IFRS S2 ---
  {
    id: "ifrs-s2-climate-disclosures",
    framework: "IFRS_S2",
    pillar: "E",
    category: "ghg-emissions",
    title: "IFRS S2 — Climate-related Disclosures",
    contentType: "standard",
    definition:
      "ISSB standard requiring disclosure of climate-related risks and opportunities, governance processes, strategy, risk management, and metrics/targets including Scope 1, 2, and 3 GHG emissions.",
    methodology:
      "Governance: Disclose board and management oversight of climate risks. Strategy: Identify climate risks/opportunities, assess financial impacts, describe resilience under scenarios. Risk Management: Identify, assess, prioritize, and monitor climate risks. Metrics: Report absolute Scope 1, 2, 3 GHG emissions using GHG Protocol. Disclose emission intensity, financed emissions (if applicable), and climate-related targets.",
    interventions: [
      "Establish board-level climate oversight committee",
      "Integrate climate risks into enterprise risk management",
      "Conduct financial impact assessment of transition and physical risks",
      "Implement TCFD-aligned scenario analysis",
      "Develop comprehensive Scope 3 measurement program",
    ],
    regulatoryContext:
      "IFRS S2 (effective January 2024). Adopted or being adopted by jurisdictions globally. Builds on TCFD framework. IOSCO endorsed for capital markets. India expected to adopt via SEBI alignment.",
    relatedParamCodes: ["IFRS-S2-GHG-S1", "IFRS-S2-GHG-S2", "IFRS-S2-GHG-S3"],
    tags: ["IFRS", "ISSB", "Climate", "TCFD", "Scenario analysis"],
    updatedAt: "2024-01",
  },
  {
    id: "ifrs-s2-transition-plan",
    framework: "IFRS_S2",
    pillar: "E",
    category: "ghg-emissions",
    title: "Climate Transition Plan Requirements",
    contentType: "guide",
    definition:
      "Detailed requirements for disclosing a company's climate transition plan including target-setting, decarbonization levers, CapEx alignment, and progress tracking against net-zero commitments.",
    methodology:
      "Disclose: (1) Targets — interim and long-term, absolute and intensity, validated where possible; (2) Decarbonization levers — specific actions planned; (3) Financial resources — CapEx/OpEx allocated; (4) Dependencies — technology assumptions, policy expectations; (5) Progress — tracking against milestones. Follow TPT (Transition Plan Taskforce) disclosure framework.",
    interventions: [
      "Develop sector-specific decarbonization roadmap",
      "Align CapEx planning with transition plan milestones",
      "Engage board in regular transition plan review",
      "Publish annual transition plan progress report",
      "Seek third-party validation of transition plan credibility",
    ],
    regulatoryContext:
      "IFRS S2 paragraphs 14(a) and 33(f). Transition plans increasingly expected by investors and regulators. EU CSRD also requires transition plan disclosure under ESRS E1.",
    relatedParamCodes: ["IFRS-S2-TRANS", "IFRS-S2-TARGET"],
    tags: ["IFRS", "Transition plan", "Net zero", "Decarbonization", "CapEx"],
    updatedAt: "2024-01",
  },
  // --- Cross-framework methodology ---
  {
    id: "gri-energy-302",
    framework: "GRI",
    pillar: "E",
    category: "energy",
    title: "GRI 302 — Energy",
    contentType: "standard",
    definition:
      "Energy consumption disclosures covering energy consumed within and outside the organization, energy intensity, and reduction of energy consumption. Applies to all energy types.",
    methodology:
      "GRI 302-1: Energy consumption within the organization — non-renewable fuels, renewable fuels, purchased electricity/heating/cooling/steam, self-generated renewable energy, total in joules or multiples. GRI 302-3: Energy intensity ratio (denominator can be units produced, revenue, employees). GRI 302-4: Amount of energy reduction achieved.",
    interventions: [
      "Implement ISO 50001 energy management system",
      "Conduct detailed energy audits across all facilities",
      "Deploy smart metering and real-time energy monitoring",
      "Set and track renewable energy procurement targets",
      "Implement heat recovery and cogeneration systems",
    ],
    regulatoryContext:
      "GRI 302 (2016). Universal applicability. Cross-references with CDP Climate Change, BRSR energy disclosures, and ESRS E1 energy metrics.",
    relatedParamCodes: ["GRI-302-1", "GRI-302-3", "GRI-302-4"],
    tags: ["GRI", "Energy", "Intensity", "Renewable", "Efficiency"],
    updatedAt: "2023-10",
  },
  {
    id: "brsr-csr-spending",
    framework: "BRSR",
    pillar: "S",
    category: "community",
    title: "CSR Expenditure & Community Impact",
    contentType: "regulation",
    definition:
      "Mandatory CSR spending disclosure for qualifying companies (net worth ≥ ₹500 crore, turnover ≥ ₹1,000 crore, or net profit ≥ ₹5 crore). Must spend 2% of average net profit on CSR activities listed in Schedule VII of Companies Act.",
    methodology:
      "Calculate 2% of average net profits of preceding 3 financial years. Report CSR spend by: (1) project area, (2) geography, (3) modality (direct, through foundation, through trust). Track beneficiary count and impact assessment outcomes. Unspent amounts must be transferred to designated fund within specified timeline.",
    interventions: [
      "Align CSR with UN SDGs for impact measurement",
      "Conduct rigorous impact assessments for ongoing projects",
      "Diversify CSR beyond compliance to strategic community investment",
      "Partner with established NGOs for scaled implementation",
      "Integrate CSR reporting with overall ESG performance tracking",
    ],
    regulatoryContext:
      "Companies Act 2013, Section 135 & Schedule VII. BRSR Principle 8 disclosures. CSR Rules 2014 (amended 2021). MCA annual CSR reporting requirement. Impact assessment mandatory for projects ≥ ₹1 crore.",
    relatedParamCodes: ["P8-CSR-SPEND", "P8-CSR-PCT"],
    tags: ["CSR", "Community", "Section 135", "Social investment"],
    updatedAt: "2024-02",
  },
  {
    id: "esrs-g1-business-conduct",
    framework: "ESRS",
    pillar: "G",
    category: "ethics",
    title: "ESRS G1 — Business Conduct",
    contentType: "standard",
    definition:
      "Governance and business conduct disclosures covering corporate culture, anti-corruption, responsible political engagement, supplier payment practices, and protection of whistleblowers.",
    methodology:
      "Report on: (1) Role of governance bodies in overseeing business conduct; (2) Anti-corruption and bribery policies, training coverage; (3) Confirmed corruption incidents; (4) Payment practices — average payment terms, late payment stats; (5) Political engagement and lobbying activities; (6) Whistleblower channel accessibility and case outcomes.",
    interventions: [
      "Implement comprehensive business ethics code with regular review",
      "Deploy anti-corruption training with 100% employee coverage",
      "Establish independent ethics hotline with non-retaliation policy",
      "Conduct annual supplier payment practice analysis",
      "Publish political engagement and lobbying transparency report",
    ],
    regulatoryContext:
      "ESRS G1 under EU CSRD. Mandatory for all in-scope companies. Cross-references EU Anti-Money Laundering Directive, EU Whistleblower Directive, and national anti-corruption laws.",
    relatedParamCodes: ["G1-ETHICS", "G1-CORRUPTION", "G1-PAYMENT"],
    tags: ["ESRS", "Business conduct", "Ethics", "Whistleblower", "Corruption"],
    updatedAt: "2024-01",
  },
];

/**
 * Lookup helpers for efficient content access.
 */

/** Get all entries for a given framework */
export function getEntriesByFramework(framework: Framework): KnowledgeEntry[] {
  return KNOWLEDGE_ENTRIES.filter((e) => e.framework === framework);
}

/** Get all entries for a given category */
export function getEntriesByCategory(categoryId: string): KnowledgeEntry[] {
  return KNOWLEDGE_ENTRIES.filter((e) => e.category === categoryId);
}

/** Get all entries for a given pillar */
export function getEntriesByPillar(pillar: Pillar): KnowledgeEntry[] {
  return KNOWLEDGE_ENTRIES.filter((e) => e.pillar === pillar);
}

/** Find entry by ID (for deep-linking) */
export function getEntryById(id: string): KnowledgeEntry | undefined {
  return KNOWLEDGE_ENTRIES.find((e) => e.id === id);
}

/** Find entries that relate to a given parameter code */
export function getEntriesByParamCode(paramCode: string): KnowledgeEntry[] {
  if (!paramCode || paramCode.trim().length === 0) return [];
  return KNOWLEDGE_ENTRIES.filter((e) =>
    e.relatedParamCodes.some(
      (code) =>
        code === paramCode ||
        paramCode.startsWith(code + "-") ||
        code.startsWith(paramCode + "-")
    )
  );
}

/** Get category metadata by ID */
export function getCategoryById(categoryId: string): KnowledgeCategory | undefined {
  return CATEGORIES.find((c) => c.id === categoryId);
}

/** Get all unique categories present for a given framework */
export function getCategoriesForFramework(framework: Framework): KnowledgeCategory[] {
  const categoryIds = new Set(
    KNOWLEDGE_ENTRIES.filter((e) => e.framework === framework).map((e) => e.category)
  );
  return CATEGORIES.filter((c) => categoryIds.has(c.id));
}

/** Search entries by query string across title, definition, tags */
export function searchEntries(
  query: string,
  filters?: {
    framework?: Framework;
    pillar?: Pillar;
    category?: string;
    contentType?: ContentType;
  }
): KnowledgeEntry[] {
  const q = query.toLowerCase().trim();

  return KNOWLEDGE_ENTRIES.filter((entry) => {
    // Apply filters first
    if (filters?.framework && entry.framework !== filters.framework) return false;
    if (filters?.pillar && entry.pillar !== filters.pillar) return false;
    if (filters?.category && entry.category !== filters.category) return false;
    if (filters?.contentType && entry.contentType !== filters.contentType) return false;

    // Apply search query
    if (!q) return true;
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.definition.toLowerCase().includes(q) ||
      entry.methodology.toLowerCase().includes(q) ||
      entry.tags.some((t) => t.toLowerCase().includes(q)) ||
      entry.category.toLowerCase().includes(q)
    );
  });
}
