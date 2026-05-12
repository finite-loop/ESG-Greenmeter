/**
 * Report template structures for ESG frameworks.
 *
 * Templates are structured objects (not raw HTML) defining sections, disclosures,
 * and linked parameter filters for each framework. The report service uses these
 * to look up KPI values by standardSection and populate structured reports.
 *
 * Each disclosure links to parameters via standardSection (and optionally indicatorType)
 * so the service can query kpi_parameters and join to kpi_values for a given
 * tenant + period.
 */

import type { Framework } from './knowledgeBase';

export type { Framework };

/** A single disclosure within a report section. */
export interface ReportDisclosure {
  /** Unique identifier within the template (e.g., 'brsr-p1-essential') */
  id: string;
  /** Human-readable disclosure name */
  name: string;
  /** Description of what this disclosure covers */
  description?: string;
  /** Maps to kpi_parameters.standard_section for parameter lookup */
  standardSection: string;
  /** Optional filter on kpi_parameters.indicator_type (e.g., 'essential', 'leadership') */
  indicatorType?: string;
  /** Optional filter on kpi_parameters.category */
  category?: string;
}

/** A section grouping related disclosures. */
export interface ReportSection {
  /** Unique identifier within the template */
  id: string;
  /** Human-readable section name */
  name: string;
  /** Description of the section */
  description?: string;
  /** ESG pillar this section primarily covers */
  pillar?: 'E' | 'S' | 'G';
  /** Ordered disclosures within this section */
  disclosures: ReportDisclosure[];
}

/** A complete report template for one framework. */
export interface ReportTemplate {
  /** Framework identifier */
  framework: Framework;
  /** Template name */
  name: string;
  /** Template version */
  version: string;
  /** Description */
  description: string;
  /** Ordered sections */
  sections: ReportSection[];
}

// ---------------------------------------------------------------------------
// BRSR Template — 9 Principles + General + Management
// ---------------------------------------------------------------------------

const brsrTemplate: ReportTemplate = {
  framework: 'BRSR',
  name: 'BRSR Core Report',
  version: '1.0',
  description: 'Business Responsibility and Sustainability Report per SEBI mandate. 9 principles across E, S, G pillars.',
  sections: [
    {
      id: 'brsr-section-a',
      name: 'Section A: General Disclosures',
      description: 'Company details, products/services, operations, employees',
      pillar: 'G',
      disclosures: [
        {
          id: 'brsr-a-general',
          name: 'General Disclosures',
          description: 'Company overview, products, operations, CSR details, transparency/complaints data',
          standardSection: 'A – General',
          indicatorType: 'essential',
        },
      ],
    },
    {
      id: 'brsr-section-b',
      name: 'Section B: Management & Process',
      description: 'Policy and management processes for principles',
      pillar: 'G',
      disclosures: [
        {
          id: 'brsr-b-management',
          name: 'Management & Process Disclosures',
          description: 'Policies, governance, committees, stakeholder engagement processes',
          standardSection: 'B – Management',
          indicatorType: 'essential',
        },
      ],
    },
    {
      id: 'brsr-p1',
      name: 'Principle 1: Ethics, Transparency & Accountability',
      description: 'Businesses should conduct and govern themselves with integrity and in a manner that is ethical, transparent and accountable',
      pillar: 'G',
      disclosures: [
        {
          id: 'brsr-p1-essential',
          name: 'Essential Indicators',
          description: 'Training on ethics, code of conduct, anti-corruption policies, disciplinary actions',
          standardSection: 'P1 – Ethics',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p1-leadership',
          name: 'Leadership Indicators',
          description: 'Awareness programs, conflict of interest disclosures, board independence details',
          standardSection: 'P1 – Ethics',
          indicatorType: 'leadership',
        },
      ],
    },
    {
      id: 'brsr-p2',
      name: 'Principle 2: Sustainable & Safe Products',
      description: 'Businesses should provide goods and services in a manner that is sustainable and safe',
      pillar: 'E',
      disclosures: [
        {
          id: 'brsr-p2-essential',
          name: 'Essential Indicators',
          description: 'R&D investment, sustainable sourcing, recyclable inputs/outputs',
          standardSection: 'P2 – Sustain.',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p2-leadership',
          name: 'Leadership Indicators',
          description: 'Life-cycle assessments, extended producer responsibility, product reclamation',
          standardSection: 'P2 – Sustain.',
          indicatorType: 'leadership',
        },
      ],
    },
    {
      id: 'brsr-p3',
      name: 'Principle 3: Employee Wellbeing',
      description: 'Businesses should respect and promote the well-being of all employees',
      pillar: 'S',
      disclosures: [
        {
          id: 'brsr-p3-essential',
          name: 'Essential Indicators',
          description: 'Workforce details, turnover, wages, benefits, safety incidents, unions',
          standardSection: 'P3 – People',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p3-leadership',
          name: 'Leadership Indicators',
          description: 'Diversity metrics, parental leave, accessibility, return-to-work programs',
          standardSection: 'P3 – People',
          indicatorType: 'leadership',
        },
      ],
    },
    {
      id: 'brsr-p4',
      name: 'Principle 4: Stakeholder Engagement',
      description: 'Businesses should respect the interests of and be responsive to all its stakeholders',
      pillar: 'S',
      disclosures: [
        {
          id: 'brsr-p4-essential',
          name: 'Essential Indicators',
          description: 'Stakeholder identification, engagement channels, material issues',
          standardSection: 'P4',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p4-leadership',
          name: 'Leadership Indicators',
          description: 'Stakeholder grievance mechanisms, vulnerable group engagement',
          standardSection: 'P4',
          indicatorType: 'leadership',
        },
      ],
    },
    {
      id: 'brsr-p5',
      name: 'Principle 5: Human Rights',
      description: 'Businesses should respect and promote human rights',
      pillar: 'S',
      disclosures: [
        {
          id: 'brsr-p5-essential',
          name: 'Essential Indicators',
          description: 'Training on human rights, salary/wage ratios, complaints/grievances',
          standardSection: 'P5 – Human Rights',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p5-leadership',
          name: 'Leadership Indicators',
          description: 'Human rights due diligence, business impact assessments, remediation actions',
          standardSection: 'P5 – Human Rights',
          indicatorType: 'leadership',
        },
      ],
    },
    {
      id: 'brsr-p6',
      name: 'Principle 6: Environmental Protection',
      description: 'Businesses should respect and make efforts to protect and restore the environment',
      pillar: 'E',
      disclosures: [
        {
          id: 'brsr-p6-essential',
          name: 'Essential Indicators',
          description: 'Energy consumption, GHG emissions (Scope 1 & 2), water usage, waste management',
          standardSection: 'P6 – Environment',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p6-leadership',
          name: 'Leadership Indicators',
          description: 'Scope 3 emissions, zero liquid discharge, biodiversity, environmental expenditure',
          standardSection: 'P6 – Environment',
          indicatorType: 'leadership',
        },
      ],
    },
    {
      id: 'brsr-p7',
      name: 'Principle 7: Policy Advocacy',
      description: 'Businesses, when engaging in influencing public and regulatory policy, should do so in a manner that is responsible and transparent',
      pillar: 'G',
      disclosures: [
        {
          id: 'brsr-p7-essential',
          name: 'Essential Indicators',
          description: 'Trade association affiliations, anti-competitive conduct cases',
          standardSection: 'P7',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p7-leadership',
          name: 'Leadership Indicators',
          description: 'Public policy positions, corrective actions for anti-competitive practices',
          standardSection: 'P7',
          indicatorType: 'leadership',
        },
      ],
    },
    {
      id: 'brsr-p8',
      name: 'Principle 8: Inclusive Growth',
      description: 'Businesses should promote inclusive growth and equitable development',
      pillar: 'S',
      disclosures: [
        {
          id: 'brsr-p8-essential',
          name: 'Essential Indicators',
          description: 'Social impact assessment, CSR projects, input material from MSMEs/small producers',
          standardSection: 'P8',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p8-leadership',
          name: 'Leadership Indicators',
          description: 'Community development programs, local procurement, job creation in underserved areas',
          standardSection: 'P8',
          indicatorType: 'leadership',
        },
      ],
    },
    {
      id: 'brsr-p9',
      name: 'Principle 9: Consumer Responsibility',
      description: 'Businesses should engage with and provide value to their consumers in a responsible manner',
      pillar: 'S',
      disclosures: [
        {
          id: 'brsr-p9-essential',
          name: 'Essential Indicators',
          description: 'Consumer complaints, product recalls, data privacy practices, cybersecurity',
          standardSection: 'P9',
          indicatorType: 'essential',
        },
        {
          id: 'brsr-p9-leadership',
          name: 'Leadership Indicators',
          description: 'Responsible advertising, product accessibility, circular economy initiatives',
          standardSection: 'P9',
          indicatorType: 'leadership',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// ESRS Template — European Sustainability Reporting Standards
// ---------------------------------------------------------------------------

const esrsTemplate: ReportTemplate = {
  framework: 'ESRS',
  name: 'ESRS Disclosure Report',
  version: '1.0',
  description: 'European Sustainability Reporting Standards per CSRD. Double-materiality reporting across E, S, G topics.',
  sections: [
    {
      id: 'esrs-general',
      name: 'ESRS 2: General Disclosures',
      description: 'General disclosures applicable to all undertakings',
      pillar: 'G',
      disclosures: [
        {
          id: 'esrs-2-general',
          name: 'General Disclosures',
          description: 'Governance, strategy, impact/risk/opportunity management, metrics and targets',
          standardSection: 'ESRS 2',
        },
      ],
    },
    {
      id: 'esrs-e1',
      name: 'ESRS E1: Climate Change',
      description: 'Climate change mitigation, adaptation, energy',
      pillar: 'E',
      disclosures: [
        {
          id: 'esrs-e1-climate',
          name: 'Climate Change Disclosures',
          description: 'GHG emissions (Scope 1, 2, 3), energy consumption, climate targets, transition plans',
          standardSection: 'ESRS E1',
        },
      ],
    },
    {
      id: 'esrs-e2',
      name: 'ESRS E2: Pollution',
      description: 'Pollution of air, water, and soil',
      pillar: 'E',
      disclosures: [
        {
          id: 'esrs-e2-pollution',
          name: 'Pollution Disclosures',
          description: 'Pollution prevention, substances of concern, microplastics',
          standardSection: 'ESRS E2',
        },
      ],
    },
    {
      id: 'esrs-e3',
      name: 'ESRS E3: Water & Marine Resources',
      description: 'Water and marine resources management',
      pillar: 'E',
      disclosures: [
        {
          id: 'esrs-e3-water',
          name: 'Water & Marine Resource Disclosures',
          description: 'Water withdrawal, consumption, discharge, marine resource impact',
          standardSection: 'ESRS E3',
        },
      ],
    },
    {
      id: 'esrs-e4',
      name: 'ESRS E4: Biodiversity & Ecosystems',
      description: 'Biodiversity and ecosystem impacts',
      pillar: 'E',
      disclosures: [
        {
          id: 'esrs-e4-biodiversity',
          name: 'Biodiversity Disclosures',
          description: 'Land use, biodiversity impacts, ecosystem restoration',
          standardSection: 'ESRS E4',
        },
      ],
    },
    {
      id: 'esrs-e5',
      name: 'ESRS E5: Resource Use & Circular Economy',
      description: 'Resource use and circular economy',
      pillar: 'E',
      disclosures: [
        {
          id: 'esrs-e5-circular',
          name: 'Circular Economy Disclosures',
          description: 'Resource inflows/outflows, waste management, product lifecycle',
          standardSection: 'ESRS E5',
        },
      ],
    },
    {
      id: 'esrs-s1',
      name: 'ESRS S1: Own Workforce',
      description: 'Working conditions, equal treatment, other work-related rights',
      pillar: 'S',
      disclosures: [
        {
          id: 'esrs-s1-workforce',
          name: 'Own Workforce Disclosures',
          description: 'Employment, working conditions, diversity, health & safety, training',
          standardSection: 'ESRS S1',
        },
      ],
    },
    {
      id: 'esrs-s2',
      name: 'ESRS S2: Workers in the Value Chain',
      description: 'Working conditions in the value chain',
      pillar: 'S',
      disclosures: [
        {
          id: 'esrs-s2-value-chain',
          name: 'Value Chain Worker Disclosures',
          description: 'Working conditions of suppliers and contractors',
          standardSection: 'ESRS S2',
        },
      ],
    },
    {
      id: 'esrs-s3',
      name: 'ESRS S3: Affected Communities',
      description: 'Impacts on affected communities',
      pillar: 'S',
      disclosures: [
        {
          id: 'esrs-s3-communities',
          name: 'Affected Communities Disclosures',
          description: 'Community impacts, indigenous peoples, land rights',
          standardSection: 'ESRS S3',
        },
      ],
    },
    {
      id: 'esrs-s4',
      name: 'ESRS S4: Consumers & End-users',
      description: 'Consumers and end-users',
      pillar: 'S',
      disclosures: [
        {
          id: 'esrs-s4-consumers',
          name: 'Consumer & End-user Disclosures',
          description: 'Information-related impacts, personal safety, social inclusion',
          standardSection: 'ESRS S4',
        },
      ],
    },
    {
      id: 'esrs-g1',
      name: 'ESRS G1: Business Conduct',
      description: 'Business conduct and ethics',
      pillar: 'G',
      disclosures: [
        {
          id: 'esrs-g1-conduct',
          name: 'Business Conduct Disclosures',
          description: 'Corporate culture, anti-corruption, lobbying, payment practices',
          standardSection: 'ESRS G1',
        },
      ],
    },
    {
      id: 'esrs-g2',
      name: 'ESRS G2: Governance',
      description: 'Governance structure and processes',
      pillar: 'G',
      disclosures: [
        {
          id: 'esrs-g2-governance',
          name: 'Governance Disclosures',
          description: 'Board composition, risk oversight, sustainability governance',
          standardSection: 'ESRS G2',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// GRI Template — Global Reporting Initiative Standards
// ---------------------------------------------------------------------------

const griTemplate: ReportTemplate = {
  framework: 'GRI',
  name: 'GRI Standards Report',
  version: '2021',
  description: 'Global Reporting Initiative modular standards. Covers universal, economic, environmental, and social topics.',
  sections: [
    {
      id: 'gri-universal',
      name: 'GRI 2: Universal Standards',
      description: 'General disclosures about the organization',
      pillar: 'G',
      disclosures: [
        {
          id: 'gri-2-general',
          name: 'General Disclosures',
          description: 'Organization details, governance, strategy, stakeholder engagement',
          standardSection: 'GRI 2',
        },
      ],
    },
    {
      id: 'gri-economic',
      name: 'GRI 200: Economic Topics',
      description: 'Economic performance and impacts',
      pillar: 'G',
      disclosures: [
        {
          id: 'gri-201-economic-performance',
          name: 'GRI 201: Economic Performance',
          description: 'Direct economic value generated and distributed',
          standardSection: 'GRI 201',
        },
        {
          id: 'gri-205-anti-corruption',
          name: 'GRI 205: Anti-corruption',
          description: 'Operations assessed for corruption risk, training, confirmed incidents',
          standardSection: 'GRI 205',
        },
      ],
    },
    {
      id: 'gri-environment',
      name: 'GRI 300: Environmental Topics',
      description: 'Environmental performance',
      pillar: 'E',
      disclosures: [
        {
          id: 'gri-302-energy',
          name: 'GRI 302: Energy',
          description: 'Energy consumption, intensity, reduction',
          standardSection: 'GRI 302',
        },
        {
          id: 'gri-303-water',
          name: 'GRI 303: Water & Effluents',
          description: 'Water withdrawal, consumption, discharge',
          standardSection: 'GRI 303',
        },
        {
          id: 'gri-305-emissions',
          name: 'GRI 305: Emissions',
          description: 'GHG emissions (Scope 1, 2, 3), intensity, reduction',
          standardSection: 'GRI 305',
        },
        {
          id: 'gri-306-waste',
          name: 'GRI 306: Waste',
          description: 'Waste generation, diversion, disposal',
          standardSection: 'GRI 306',
        },
      ],
    },
    {
      id: 'gri-social',
      name: 'GRI 400: Social Topics',
      description: 'Social performance',
      pillar: 'S',
      disclosures: [
        {
          id: 'gri-401-employment',
          name: 'GRI 401: Employment',
          description: 'New hires, turnover, benefits',
          standardSection: 'GRI 401',
        },
        {
          id: 'gri-403-ohs',
          name: 'GRI 403: Occupational Health & Safety',
          description: 'Work-related injuries, ill health, hazard identification',
          standardSection: 'GRI 403',
        },
        {
          id: 'gri-404-training',
          name: 'GRI 404: Training & Education',
          description: 'Average training hours, skills management programs',
          standardSection: 'GRI 404',
        },
        {
          id: 'gri-405-diversity',
          name: 'GRI 405: Diversity & Equal Opportunity',
          description: 'Diversity of governance bodies and employees',
          standardSection: 'GRI 405',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// IFRS S2 Template — Climate-related Disclosures
// ---------------------------------------------------------------------------

const ifrsS2Template: ReportTemplate = {
  framework: 'IFRS_S2',
  name: 'IFRS S2 Climate-related Disclosures',
  version: '1.0',
  description: 'ISSB climate disclosure standard covering governance, strategy, risk management, and metrics & targets.',
  sections: [
    {
      id: 'ifrs-s2-governance',
      name: 'Governance',
      description: 'Governance processes, controls and procedures for climate-related risks and opportunities',
      pillar: 'G',
      disclosures: [
        {
          id: 'ifrs-s2-gov-oversight',
          name: 'Governance Oversight',
          description: 'Board oversight of climate-related risks and opportunities',
          standardSection: 'IFRS S2',
          category: 'Governance',
        },
      ],
    },
    {
      id: 'ifrs-s2-strategy',
      name: 'Strategy',
      description: 'Climate-related risks, opportunities, and their effects on strategy and financial planning',
      pillar: 'E',
      disclosures: [
        {
          id: 'ifrs-s2-strategy-risks',
          name: 'Climate Risks & Opportunities',
          description: 'Physical and transition risks, climate opportunities, scenario analysis',
          standardSection: 'IFRS S2',
          category: 'Strategy',
        },
      ],
    },
    {
      id: 'ifrs-s2-risk-management',
      name: 'Risk Management',
      description: 'Processes for identifying, assessing, and managing climate-related risks',
      pillar: 'G',
      disclosures: [
        {
          id: 'ifrs-s2-risk-processes',
          name: 'Risk Management Processes',
          description: 'Climate risk identification, assessment, prioritization, and monitoring',
          standardSection: 'IFRS S2',
          category: 'Risk Management',
        },
      ],
    },
    {
      id: 'ifrs-s2-metrics',
      name: 'Metrics & Targets',
      description: 'Metrics and targets for climate-related risks and opportunities',
      pillar: 'E',
      disclosures: [
        {
          id: 'ifrs-s2-ghg-emissions',
          name: 'GHG Emissions',
          description: 'Scope 1, 2, 3 greenhouse gas emissions',
          standardSection: 'IFRS S2',
          category: 'Emissions',
        },
        {
          id: 'ifrs-s2-targets',
          name: 'Climate Targets',
          description: 'Emission reduction targets and progress towards them',
          standardSection: 'IFRS S2',
          category: 'Targets',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Exported template registry
// ---------------------------------------------------------------------------

const sasbTemplate: ReportTemplate = {
  framework: 'SASB',
  name: 'SASB Disclosure Report',
  version: '1.0',
  description: 'Sustainability Accounting Standards Board industry-specific disclosure. Covers financially material ESG topics.',
  sections: [
    {
      id: 'sasb-env',
      name: 'Environmental',
      description: 'Environmental footprint, energy management, and ecological impacts',
      pillar: 'E',
      disclosures: [
        { id: 'sasb-env-footprint', name: 'Environmental Footprint', standardSection: 'Environmental Footprint' },
        { id: 'sasb-env-energy', name: 'Energy Management', standardSection: 'Energy Management' },
      ],
    },
    {
      id: 'sasb-social',
      name: 'Social Capital & Human Capital',
      description: 'Data privacy, workforce, health & safety, and community impacts',
      pillar: 'S',
      disclosures: [
        { id: 'sasb-soc-privacy', name: 'Data Privacy & Security', standardSection: 'Data Privacy & Security' },
        { id: 'sasb-soc-workforce', name: 'Human Capital', standardSection: 'Human Capital' },
        { id: 'sasb-soc-health', name: 'Health & Safety', standardSection: 'Health & Safety' },
      ],
    },
    {
      id: 'sasb-gov',
      name: 'Leadership & Governance',
      description: 'Business ethics, systemic risk management, and activity metrics',
      pillar: 'G',
      disclosures: [
        { id: 'sasb-gov-ethics', name: 'Business Ethics', standardSection: 'Business Ethics' },
        { id: 'sasb-gov-risk', name: 'Managing Systemic Risks', standardSection: 'Managing Systemic Risks' },
        { id: 'sasb-gov-activity', name: 'Activity Metrics', standardSection: 'Activity Metrics' },
      ],
    },
  ],
};

const tcfdTemplate: ReportTemplate = {
  framework: 'TCFD',
  name: 'TCFD Disclosure Report',
  version: '1.0',
  description: 'Task Force on Climate-related Financial Disclosures. Covers Governance, Strategy, Risk Management, and Metrics & Targets.',
  sections: [
    {
      id: 'tcfd-governance',
      name: 'Governance',
      description: 'Board oversight and management role in climate-related risks and opportunities',
      pillar: 'G',
      disclosures: [
        { id: 'tcfd-gov-board', name: 'Board Oversight', standardSection: 'Governance' },
      ],
    },
    {
      id: 'tcfd-strategy',
      name: 'Strategy',
      description: 'Climate-related risks, opportunities, and their impact on strategy and financial planning',
      pillar: 'S',
      disclosures: [
        { id: 'tcfd-str-risks', name: 'Strategy & Scenario Analysis', standardSection: 'Strategy' },
      ],
    },
    {
      id: 'tcfd-risk',
      name: 'Risk Management',
      description: 'Processes for identifying, assessing, and managing climate-related risks',
      pillar: 'S',
      disclosures: [
        { id: 'tcfd-risk-process', name: 'Risk Management Processes', standardSection: 'Risk Management' },
      ],
    },
    {
      id: 'tcfd-metrics',
      name: 'Metrics & Targets',
      description: 'Metrics and targets used to assess and manage climate-related risks and opportunities',
      pillar: 'E',
      disclosures: [
        { id: 'tcfd-met-ghg', name: 'Metrics & Targets', standardSection: 'Metrics & Targets' },
      ],
    },
  ],
};

export const REPORT_TEMPLATES: Record<Framework, ReportTemplate> = {
  BRSR: brsrTemplate,
  ESRS: esrsTemplate,
  GRI: griTemplate,
  IFRS_S2: ifrsS2Template,
  SASB: sasbTemplate,
  TCFD: tcfdTemplate,
};

/**
 * Look up a report template by framework identifier.
 * Returns undefined if the framework is not recognized.
 */
export function getReportTemplate(framework: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES[framework as Framework];
}
