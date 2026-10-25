/**
 * Report Templates Tests
 */

import { ReportTemplates, ReportTemplateConfig } from '../report_templates';

function makeConfig(overrides: Partial<ReportTemplateConfig> = {}): ReportTemplateConfig {
  return {
    jurisdictionId: 'COUNTY-001',
    jurisdictionName: 'Test County',
    reportDate: '2024-01-15',
    dataPeriod: { start: '2020-01-01', end: '2023-12-31' },
    dataQuality: {
      completenessScore: 85.5,
      caseCount: 1500,
      coverageYears: 4,
    },
    metrics: [
      {
        name: 'conviction_rate',
        description: 'Conviction rate disparity',
        primaryGroup: 'Black',
        primaryRate: 0.75,
        referenceGroup: 'White',
        referenceRate: 0.55,
        disparity: 0.20,
        disparityPercentage: 36.4,
        direction: 'higher_for_primary',
        riskLevel: 'high',
        confidenceInterval: [0.15, 0.25],
      },
    ],
    referenceComparison: {
      stateAverageGap: 0.08,
      percentileVsState: 75,
      stateRanking: 38,
      similarJurisdictions: [
        { id: 'c1', name: 'Peer County', state: 'TX', convictionGap: 0.10, caseCount: 1500 },
      ],
    },
    trend: {
      direction: 'worsening',
      pctChange: 15.0,
      yearsCovered: 4,
      trendDescription: 'Gap increasing',
    },
    recommendations: ['Review practices', 'Increase transparency'],
    methodologyNote: 'Methodology summary.',
    provenanceHash: 'abc123',
    ...overrides,
  };
}

describe('ReportTemplates', () => {
  let templates: ReportTemplates;

  beforeEach(() => {
    templates = new ReportTemplates(makeConfig());
  });

  describe('publicSimplifiedMarkdown', () => {
    it('should generate simplified public summary', () => {
      const md = templates.publicSimplifiedMarkdown();
      expect(md).toContain('Disparity Report');
      expect(md).toContain('Summary');
      expect(md).toContain('Key Finding');
      expect(md).toContain('High disparity detected');
      expect(md).toContain('Quick Numbers');
    });

    it('should flag high disparity when present', () => {
      const md = templates.publicSimplifiedMarkdown();
      expect(md).toContain('High disparity');
      expect(md).toContain('worst');
    });

    it('should show stable message when no high-risk metrics', () => {
      const config = makeConfig({
        metrics: [{
          name: 'conviction_rate',
          description: 'test',
          primaryGroup: 'Black',
          primaryRate: 0.52,
          referenceGroup: 'White',
          referenceRate: 0.50,
          disparity: 0.02,
          disparityPercentage: 4,
          direction: 'higher_for_primary',
          riskLevel: 'low',
        }],
      });
      const t = new ReportTemplates(config);
      const md = t.publicSimplifiedMarkdown();
      expect(md).not.toContain('High disparity');
    });
  });

  describe('publicTechnicalMarkdown', () => {
    it('should generate technical report with metrics table', () => {
      const md = templates.publicTechnicalMarkdown();
      expect(md).toContain('Technical');
      expect(md).toContain('Disparity Metrics');
      expect(md).toContain('| Metric |');
      expect(md).toContain('Confidence Intervals');
    });

    it('should include reference comparison section', () => {
      const md = templates.publicTechnicalMarkdown();
      expect(md).toContain('Reference Comparison');
      expect(md).toContain('State average gap');
      expect(md).toContain('Similar Jurisdictions');
    });

    it('should include methodology and recommendations', () => {
      const md = templates.publicTechnicalMarkdown();
      expect(md).toContain('Recommendations');
      expect(md).toContain('Methodology');
      expect(md).toContain('disconfirmation');
    });
  });

  describe('publicPolicyBriefMarkdown', () => {
    it('should generate policy brief format', () => {
      const md = templates.publicPolicyBriefMarkdown();
      expect(md).toContain('Policy Brief');
      expect(md).toContain('Executive Summary');
      expect(md).toContain('Primary Disparity Finding');
      expect(md).toContain('Policy Recommendations');
    });

    it('should recommend immediate review for high risk', () => {
      const md = templates.publicPolicyBriefMarkdown();
      expect(md).toContain('**Immediate** review');
    });

    it('should flag worsening trends as urgent', () => {
      const md = templates.publicPolicyBriefMarkdown();
      expect(md).toContain('Urgent Action Required');
      expect(md).toContain('worsening');
    });
  });

  describe('publicToHtml', () => {
    it('should generate valid HTML for simplified template', () => {
      const html = templates.publicToHtml('simplified');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('Test County');
      expect(html).toContain('Provenance');
      expect(html).toContain('Report Type');
    });

    it('should include report type in HTML', () => {
      const html = templates.publicToHtml('technical');
      expect(html).toContain('Technical');
    });

    it('should use policy brief type', () => {
      const html = templates.publicToHtml('policy');
      expect(html).toContain('Policy');
    });
  });

  describe('publicToJson', () => {
    it('should serialize config to structured JSON', () => {
      const json = templates.publicToJson();
      expect(json).toHaveProperty('jurisdictionId');
      expect(json).toHaveProperty('version');
      expect(json).toHaveProperty('templateEngine');
      expect((json as any).jurisdictionId).toBe('COUNTY-001');
    });

    it('should include all metrics and recommendations', () => {
      const json = templates.publicToJson();
      const obj = json as any;
      expect(obj.metrics).toHaveLength(1);
      expect(obj.recommendations).toHaveLength(2);
      expect(obj.referenceComparison).toBeDefined();
    });
  });
});