import { describe, it, expect } from 'vitest';
import {
  REPORT_TEMPLATES,
  getReportTemplate,
  type ReportTemplate,
  type ReportSection,
  type ReportDisclosure,
} from './frameworks';

describe('frameworks report templates', () => {
  describe('REPORT_TEMPLATES', () => {
    it('contains all four frameworks', () => {
      const keys = Object.keys(REPORT_TEMPLATES);
      expect(keys).toContain('BRSR');
      expect(keys).toContain('GRI');
      expect(keys).toContain('ESRS');
      expect(keys).toContain('IFRS_S2');
      expect(keys).toHaveLength(4);
    });

    it('each template has required fields', () => {
      for (const [framework, template] of Object.entries(REPORT_TEMPLATES)) {
        expect(template.framework).toBe(framework);
        expect(template.name).toBeTruthy();
        expect(template.version).toBeTruthy();
        expect(Array.isArray(template.sections)).toBe(true);
        expect(template.sections.length).toBeGreaterThan(0);
      }
    });

    it('each section has required fields', () => {
      for (const template of Object.values(REPORT_TEMPLATES)) {
        for (const section of template.sections) {
          expect(section.id).toBeTruthy();
          expect(section.name).toBeTruthy();
          expect(Array.isArray(section.disclosures)).toBe(true);
        }
      }
    });

    it('each disclosure has required fields', () => {
      for (const template of Object.values(REPORT_TEMPLATES)) {
        for (const section of template.sections) {
          for (const disclosure of section.disclosures) {
            expect(disclosure.id).toBeTruthy();
            expect(disclosure.name).toBeTruthy();
            expect(disclosure.standardSection).toBeTruthy();
          }
        }
      }
    });
  });

  describe('BRSR template', () => {
    it('has 9 principle sections plus general sections', () => {
      const brsr = REPORT_TEMPLATES.BRSR;
      const principleIds = brsr.sections
        .filter((s) => s.id.startsWith('brsr-p'))
        .map((s) => s.id);
      expect(principleIds).toHaveLength(9);
    });

    it('Section A and B exist for general/management disclosures', () => {
      const brsr = REPORT_TEMPLATES.BRSR;
      const sectionA = brsr.sections.find((s) => s.id === 'brsr-section-a');
      const sectionB = brsr.sections.find((s) => s.id === 'brsr-section-b');
      expect(sectionA).toBeDefined();
      expect(sectionB).toBeDefined();
    });

    it('disclosures reference valid standard sections', () => {
      const brsr = REPORT_TEMPLATES.BRSR;
      const validSections = [
        'A – General',
        'B – Management',
        'P1 – Ethics',
        'P2 – Sustain.',
        'P3 – People',
        'P4',
        'P5 – Human Rights',
        'P6 – Environment',
        'P7',
        'P8',
        'P9',
      ];
      for (const section of brsr.sections) {
        for (const disclosure of section.disclosures) {
          expect(validSections).toContain(disclosure.standardSection);
        }
      }
    });
  });

  describe('ESRS template', () => {
    it('covers E, S, and G topics', () => {
      const esrs = REPORT_TEMPLATES.ESRS;
      const pillars = new Set(
        esrs.sections.map((s) => s.pillar).filter(Boolean)
      );
      expect(pillars.has('E')).toBe(true);
      expect(pillars.has('S')).toBe(true);
      expect(pillars.has('G')).toBe(true);
    });
  });

  describe('GRI template', () => {
    it('covers 200, 300, and 400 series', () => {
      const gri = REPORT_TEMPLATES.GRI;
      const sectionIds = gri.sections.map((s) => s.id);
      // Should have at least one from each series
      expect(sectionIds.some((id) => id.includes('200') || id.includes('economic'))).toBe(true);
      expect(sectionIds.some((id) => id.includes('300') || id.includes('environment'))).toBe(true);
      expect(sectionIds.some((id) => id.includes('400') || id.includes('social'))).toBe(true);
    });
  });

  describe('IFRS S2 template', () => {
    it('focuses on climate disclosures', () => {
      const ifrs = REPORT_TEMPLATES.IFRS_S2;
      expect(ifrs.sections.length).toBeGreaterThan(0);
      // IFRS S2 is climate-focused
      expect(ifrs.name.toLowerCase()).toContain('climate');
    });
  });

  describe('getReportTemplate', () => {
    it('returns the correct template for a framework', () => {
      const brsr = getReportTemplate('BRSR');
      expect(brsr).toBeDefined();
      expect(brsr!.framework).toBe('BRSR');
    });

    it('returns undefined for unknown framework', () => {
      const result = getReportTemplate('UNKNOWN' as never);
      expect(result).toBeUndefined();
    });
  });
});
