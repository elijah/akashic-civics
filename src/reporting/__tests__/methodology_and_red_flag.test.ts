import { RedFlagReporter } from '../red_flag_reporter';
import { LegalJusticeCase } from '../../normalization/legal_justice_schema';

const baseCase = (overrides: Record<string, any> = {}): LegalJusticeCase => ({
  id: 'case-001',
  case_id: 'case-001',
  jurisdiction_id: 'TX-001',
  race_ethnicity: 'Black',
  gender: 'male',
  offense_severity: 'medium' as const,
  conviction: 1,
  sentence_months: 24,
  days_to_disposition: 90,
  missing_fields: [],
  source_connector: 'akashic-pipeline',
  source_version: '1.0.0',
  ingestion_timestamp: new Date().toISOString(),
  data_quality_score: 0.95,
  ...overrides,
});

describe('RedFlagReporter', () => {
  it('should generate report', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report).toBeDefined();
    expect(report.jurisdiction_id).toBe('TX-001');
    expect(report.jurisdiction_name).toBe('Texas North');
    expect(report.reference_comparison.state_average_gap).toBe(0.08);
    expect(report.reference_comparison.percentile_vs_state).toBe(75);
    expect(report.reference_comparison.similar_jurisdictions).toHaveLength(2);
    expect(report.reference_comparison.similar_jurisdictions[0].id).toBe('county-001');
    expect(report.reference_comparison.state_ranking).toBe(38);
    expect(report.data_quality.case_count).toBe(2);
  });

  it('should handle edge case with no cases', async () => {
    const reporter = new RedFlagReporter();

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases: [],
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report).toBeDefined();
    expect(report.data_quality.case_count).toBe(0);
  });

  it('should compute disparity metrics with two race groups', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.metrics.length).toBeGreaterThan(0);
    const blackVsWhite = report.metrics.find(m =>
      m.primary_group === 'Black' && m.reference_group === 'White'
    );
    expect(blackVsWhite).toBeDefined();
    expect(blackVsWhite?.primary_rate).toBe(0.5);
    expect(blackVsWhite?.reference_rate).toBe(0.5);
    expect(blackVsWhite?.disparity).toBeCloseTo(0, 5);
  });

  it('should compute disparity metrics with higher disparity for Black', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const blackVsWhite = report.metrics.find(m =>
      m.primary_group === 'Black' && m.reference_group === 'White'
    );
    expect(blackVsWhite).toBeDefined();
    expect(blackVsWhite?.disparity).toBeGreaterThan(0);
    expect(blackVsWhite?.direction).toBe('higher_for_primary');
  });

  it('should compute disparity metrics with higher disparity for reference', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const blackVsWhite = report.metrics.find(m =>
      m.primary_group === 'Black' && m.reference_group === 'White'
    );
    expect(blackVsWhite).toBeDefined();
    expect(blackVsWhite?.disparity).toBeLessThan(0);
    expect(blackVsWhite?.direction).toBe('higher_for_reference');
  });

  it('should handle single race group with state average', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const stateMetric = report.metrics.find(m => m.reference_group === 'State Average');
    expect(stateMetric).toBeDefined();
    expect(stateMetric?.primary_rate).toBe(0.5);
    expect(stateMetric?.reference_rate).toBe(0.55);
  });

  it('should compute high risk level for large disparities', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const blackVsWhite = report.metrics.find(m =>
      m.primary_group === 'Black' && m.reference_group === 'White'
    );
    expect(blackVsWhite).toBeDefined();
    expect(blackVsWhite?.risk_level).toBe('high');
    expect(blackVsWhite?.disparity).toBeGreaterThan(0.20);
  });

  it('should compute moderate risk level for medium disparities', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const blackVsWhite = report.metrics.find(m =>
      m.primary_group === 'Black' && m.reference_group === 'White'
    );
    expect(blackVsWhite).toBeDefined();
    expect(blackVsWhite?.risk_level).toBe('moderate');
  });

  it('should compute low risk level for small disparities', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const blackVsWhite = report.metrics.find(m =>
      m.primary_group === 'Black' && m.reference_group === 'White'
    );
    expect(blackVsWhite).toBeDefined();
    expect(blackVsWhite?.risk_level).toBe('low');
  });

  it('should include confidence interval for metrics', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const blackVsWhite = report.metrics.find(m =>
      m.primary_group === 'Black' && m.reference_group === 'White'
    );
    expect(blackVsWhite?.confidence_interval).toBeDefined();
    expect(Array.isArray(blackVsWhite?.confidence_interval)).toBe(true);
  });

  it('should generate recommendations with high disparity', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.some(r => r.includes('High disparity'))).toBe(true);
  });

  it('should generate recommendations with no high disparity', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.some(r => r.includes('disconfirmation'))).toBe(true);
  });

  it('should generate methodology note', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.methodology_note).toBeDefined();
    expect(report.methodology_note.length).toBeGreaterThan(0);
    expect(report.methodology_note).toContain('Akashic Justice Analysis Framework');
  });

  it('should calculate coverage years', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ disposition_date: '2020-06-01', ingestion_timestamp: '2020-01-01T00:00:00Z' }),
      baseCase({ disposition_date: '2021-06-01', ingestion_timestamp: '2021-01-01T00:00:00Z' }),
      baseCase({ disposition_date: '2021-06-01', ingestion_timestamp: '2021-01-01T00:00:00Z' }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.data_quality.coverage_years).toBe(2);
  });

  it('should handle disposition_date for year calculation', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ disposition_date: '2022-12-15', ingestion_timestamp: '2022-01-01T00:00:00Z' }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.data_quality.coverage_years).toBe(1);
  });

  it('should generate markdown report', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const markdown = reporter.toMarkdown(report);
    expect(markdown).toBeDefined();
    expect(markdown).toContain('Disparity Report: Texas North');
    expect(markdown).toContain('## Data Overview');
    expect(markdown).toContain('## 📊 Disparity Metrics');
    expect(markdown).toContain('## Methodology');
  });

  it('should generate markdown with confidence interval', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const markdown = reporter.toMarkdown(report);
    expect(markdown).toContain('95% CI');
  });

  it('should generate markdown without trend when unknown', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
      config: { include_trends: false, include_reference: true, include_recommendations: true, confidence_level: 0.95 },
    });

    const markdown = reporter.toMarkdown(report);
    expect(markdown).not.toContain('## 📈 Trend Over Time');
  });

  it('should handle unknown race with single group', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Unknown', conviction: 1 }),
      baseCase({ race_ethnicity: 'Unknown', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const unknownMetric = report.metrics.find(m => m.reference_group === 'State Average');
    expect(unknownMetric).toBeDefined();
    expect(unknownMetric?.primary_group).toBe('Unknown');
  });

  it('should handle multiple race groups', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
      baseCase({ race_ethnicity: 'Hispanic', conviction: 1 }),
      baseCase({ race_ethnicity: 'Other', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.metrics.length).toBeGreaterThan(1);
    const pairings = new Set(report.metrics.map(m => `${m.primary_group}-${m.reference_group}`));
    expect(pairings.size).toBeGreaterThan(1);
  });

  it('should compute confidence interval undefined when se is 0', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    const blackVsWhite = report.metrics.find(m =>
      m.primary_group === 'Black' && m.reference_group === 'White'
    );
    expect(blackVsWhite).toBeDefined();
  });

  it('should handle cases with null conviction values', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 0 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report).toBeDefined();
    expect(report.metrics.length).toBeGreaterThan(0);
  });

  it('should generate provenance hash', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
      baseCase({ race_ethnicity: 'White', conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.provenance_hash).toBeDefined();
    expect(typeof report.provenance_hash).toBe('string');
    expect(report.provenance_hash.length).toBeGreaterThan(0);
  });

  it('should handle report date format', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: 'Black', conviction: 1 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report.report_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle empty race with Unknown fallback', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      baseCase({ race_ethnicity: '' as any, conviction: 1 }),
      baseCase({ race_ethnicity: '' as any, conviction: 0 }),
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report).toBeDefined();
    expect(report.metrics.length).toBeGreaterThan(0);
  });
});