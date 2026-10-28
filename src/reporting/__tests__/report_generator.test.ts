import { ReportGenerator, ReportOptions } from '../report_generator';

describe('E28: Automated Report Generator', () => {
  let generator: ReportGenerator;

  const mockSource = {
    type: 'pipeline' as const,
    jurisdictionId: 'LA-County',
    jurisdictionName: 'Los Angeles County',
    reportDate: '2024-01-15',
    dataPeriod: { start: '2022-01-01', end: '2023-12-31' },
    dataQuality: { completenessScore: 85.5, caseCount: 12500, coverageYears: 2 },
    metrics: [
      {
        name: 'Conviction Rate',
        description: 'Rate of convictions by race',
        primaryGroup: 'Black',
        primaryRate: 0.65,
        referenceGroup: 'White',
        referenceRate: 0.45,
        disparity: 0.20,
        disparityPercentage: 44.4,
        direction: 'higher_for_primary' as const,
        riskLevel: 'high' as const,
      },
    ],
    referenceComparison: {
      stateAverageGap: 0.15,
      percentileVsState: 85,
      stateRanking: 5,
      similarJurisdictions: [
        { id: 'SF', name: 'San Francisco', state: 'CA', convictionGap: 0.10, caseCount: 8200 },
      ],
    },
    trend: {
      direction: 'worsening' as const,
      pctChange: 12.5,
      yearsCovered: 3,
      trendDescription: 'Disparity increased over 3 years',
      dataPoints: [{ year: 2021, gap: 0.18 }, { year: 2023, gap: 0.20 }],
    },
    recommendations: ['Review charging guidelines', 'Implement bias training'],
    methodologyNote: 'Logistic regression controlling for offense severity.',
    provenanceHash: 'sha256:abc123def456',
    biasAudit: undefined,
  };

  const mockBiasAudit = {
    auditId: 'bias_audit_12345',
    timestamp: '2024-01-15T10:00:00Z',
    datasetSize: 12500,
    config: { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] },
    metrics: [
      {
        name: 'Demographic Parity',
        description: 'Difference in positive prediction rates',
        value: 0.15,
        threshold: 0.1,
        passed: false,
        groupBreakdown: { White: 0.45, Black: 0.60 },
      },
    ],
    groupMetrics: [
      { group: 'White', count: 5000, positiveRate: 0.45, negativeRate: 0.55, truePositiveRate: 0.72, trueNegativeRate: 0.68, falsePositiveRate: 0.32, falseNegativeRate: 0.28, precision: 0.65, calibration: 0.92 },
      { group: 'Black', count: 4500, positiveRate: 0.60, negativeRate: 0.40, truePositiveRate: 0.68, trueNegativeRate: 0.70, falsePositiveRate: 0.30, falseNegativeRate: 0.32, precision: 0.62, calibration: 0.88 },
    ],
    overallAssessment: 'fail' as const,
    summary: 'Significant bias detected.',
    recommendations: ['Apply group-specific calibration.', 'Legal review recommended.'],
  };

  beforeEach(() => {
    generator = new ReportGenerator();
  });

  describe('Report Generation - All Formats', () => {
    it('should generate HTML report with simplified template', () => {
      const options: ReportOptions = { format: 'html', template: 'simplified', includeMethodology: true, includeProvenance: true, includeBiasAudit: false };
      const report = generator.generateReport(mockSource, options);
      expect(report.id).toContain('report_');
      expect(report.format).toBe('html');
      expect(report.template).toBe('simplified');
      expect(typeof report.content).toBe('string');
      expect((report.content as string).length).toBeGreaterThan(0);
      expect((report.content as string)).toContain('<!DOCTYPE html>');
      expect((report.content as string)).toContain('Los Angeles County');
      expect((report.content as string)).toContain('Disparity Report');
      expect((report.content as string)).toContain('Conviction Rate');
      expect((report.content as string)).toContain('HIGH');
    });

    it('should generate Markdown report with technical template', () => {
      const options: ReportOptions = { format: 'markdown', template: 'technical', includeMethodology: true, includeProvenance: true, includeBiasAudit: false };
      const report = generator.generateReport(mockSource, options);
      expect(report.format).toBe('markdown');
      expect(typeof report.content).toBe('string');
      expect((report.content as string)).toContain('# Disparity Report: Los Angeles County');
      expect((report.content as string)).toContain('## Disparity Metrics');
      expect((report.content as string)).toContain('| Metric | Primary Group | Rate |');
      expect((report.content as string)).toContain('Conviction Rate');
      expect((report.content as string)).toContain('0.65');
    });

    it('should generate JSON report', () => {
      const options: ReportOptions = { format: 'json', template: 'policy', includeMethodology: false, includeProvenance: false };
      const report = generator.generateReport(mockSource, options);
      expect(report.format).toBe('json');
      expect(typeof report.content).toBe('object');
      const json = report.content as any;
      expect(json.jurisdiction.id).toBe('LA-County');
      expect(json.jurisdiction.name).toBe('Los Angeles County');
      expect(json.metrics).toHaveLength(1);
    });

    it('should generate PDF template (HTML with print instructions)', () => {
      const options: ReportOptions = { format: 'pdf', template: 'policy' };
      const report = generator.generateReport(mockSource, options);
      expect(report.format).toBe('pdf');
      expect(typeof report.content).toBe('string');
      expect((report.content as string)).toContain('PDF GENERATION INSTRUCTIONS');
      expect((report.content as string)).toContain('Puppeteer');
      expect((report.content as string)).toContain('wkhtmltopdf');
    });
  });

  describe('Template Variations', () => {
    it('should include executive summary in policy template', () => {
      const options: ReportOptions = { format: 'markdown', template: 'policy' };
      const report = generator.generateReport(mockSource, options);
      expect((report.content as string)).toContain('Executive Summary');
    });

    it('should include KPI cards in HTML report', () => {
      const options: ReportOptions = { format: 'html', template: 'simplified' };
      const report = generator.generateReport(mockSource, options);
      expect((report.content as string)).toContain('kpi-grid');
      expect((report.content as string)).toContain('Cases Analyzed');
      expect((report.content as string)).toContain('12500');
    });
  });

  describe('Bias Audit Integration', () => {
    it('should include bias audit section when enabled', () => {
      const sourceWithAudit = { ...mockSource, biasAudit: mockBiasAudit };
      const options: ReportOptions = { format: 'markdown', template: 'technical', includeBiasAudit: true };
      const report = generator.generateReport(sourceWithAudit, options);
      const content = report.content as string;
      expect(content).toContain('Bias Audit Results');
      expect(content).toContain('FAIL');
      expect(content).toContain('Demographic Parity');
    });

    it('should omit bias audit section when disabled', () => {
      const sourceWithAudit = { ...mockSource, biasAudit: mockBiasAudit };
      const options: ReportOptions = { format: 'markdown', template: 'technical', includeBiasAudit: false };
      const report = generator.generateReport(sourceWithAudit, options);
      expect((report.content as string)).not.toContain('Bias Audit Results');
    });

    it('should include group-level bias metrics in HTML', () => {
      const sourceWithAudit = { ...mockSource, biasAudit: mockBiasAudit };
      const options: ReportOptions = { format: 'html', template: 'technical', includeBiasAudit: true };
      const report = generator.generateReport(sourceWithAudit, options);
      expect((report.content as string)).toContain('White');
      expect((report.content as string)).toContain('Black');
      expect((report.content as string)).toContain('TPR');
    });
  });

  describe('Optional Sections', () => {
    it('should include methodology section when enabled', () => {
      const options: ReportOptions = { format: 'markdown', template: 'technical', includeMethodology: true };
      const report = generator.generateReport(mockSource, options);
      expect((report.content as string)).toContain('## Methodology');
      expect((report.content as string)).toContain('Logistic regression');
    });

    it('should omit methodology when disabled', () => {
      const options: ReportOptions = { format: 'markdown', template: 'technical', includeMethodology: false };
      const report = generator.generateReport(mockSource, options);
      expect((report.content as string)).not.toContain('## Methodology');
    });

    it('should include provenance section when enabled', () => {
      const options: ReportOptions = { format: 'markdown', template: 'technical', includeProvenance: true };
      const report = generator.generateReport(mockSource, options);
      expect((report.content as string)).toContain('## Provenance');
      expect((report.content as string)).toContain('sha256:abc123def456');
    });

    it('should include reference comparison and trend', () => {
      const options: ReportOptions = { format: 'markdown', template: 'technical' };
      const report = generator.generateReport(mockSource, options);
      const content = report.content as string;
      expect(content).toContain('Reference Comparison');
      expect(content).toContain('San Francisco');
      expect(content).toContain('Trend Analysis');
      expect(content).toContain('worsening');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported format', () => {
      const options = { format: 'xml' as any, template: 'simplified' as const };
      expect(() => generator.generateReport(mockSource, options)).toThrow('Unsupported format: xml');
    });
  });

  describe('Report Size', () => {
    it('should report correct size in generated report', () => {
      const options: ReportOptions = { format: 'html', template: 'simplified' };
      const report = generator.generateReport(mockSource, options);
      expect(report.size).toBeGreaterThan(0);
    });

    it('should generate unique IDs for each report', () => {
      const options: ReportOptions = { format: 'html', template: 'simplified' };
      const report1 = generator.generateReport(mockSource, options);
      const report2 = generator.generateReport(mockSource, options);
      expect(report1.id).not.toBe(report2.id);
    });
  });
});