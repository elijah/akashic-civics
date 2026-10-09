import { RedFlagReporter } from '../red_flag_reporter';
import { LegalJusticeCase } from '../../normalization/legal_justice_schema';

describe('RedFlagReporter', () => {
  it('should generate report', async () => {
    const reporter = new RedFlagReporter();

    const cases: LegalJusticeCase[] = [
      {
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
      },
      {
        id: 'case-002',
        case_id: 'case-002',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'White',
        gender: 'female',
        offense_severity: 'low' as const,
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 0.90,
      }
    ];

    const report = await reporter.generateReport({
      jurisdictionId: 'TX-001',
      jurisdictionName: 'Texas North',
      cases,
      startDate: '2020-01-01',
      endDate: '2023-12-31',
    });

    expect(report).toBeDefined();
    expect(report.reference_comparison.state_average_gap).toBe(0.08);
    expect(report.reference_comparison.percentile_vs_state).toBe(75);
    expect(report.reference_comparison.similar_jurisdictions).toHaveLength(2);
    expect(report.reference_comparison.similar_jurisdictions[0].id).toBe('county-001');
    expect(report.reference_comparison.state_ranking).toBe(38);
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
  });
});
