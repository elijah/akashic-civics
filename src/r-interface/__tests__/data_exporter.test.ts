import { DataExporter } from '../data_exporter';

describe('DataExporter', () => {
  it('should initialize', () => {
    const exporter = new DataExporter();
    expect(exporter).toBeDefined();
  });

  it('should export to CSV', () => {
    const exporter = new DataExporter();
    const cases = [
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
      } as any,
    ];
    
    const metadata = exporter.toCSV(cases, '/tmp/test_cases.csv');
    expect(metadata).toBeDefined();
    expect(metadata.exportedCases).toBe(1);
    expect(metadata.totalCases).toBe(1);
    expect(Array.isArray(metadata.fieldsIncluded)).toBe(true);
  });

  it('should export to JSON', () => {
    const exporter = new DataExporter();
    const cases = [
      {
        id: 'case-001',
        case_id: 'case-001',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        gender: 'male',
        conviction: 1,
        sentence_months: 24,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 0.95,
      } as any,
    ];
    
    const metadata = exporter.toJSON(cases, '/tmp/test_cases.json');
    expect(metadata).toBeDefined();
    expect(metadata.totalCases).toBe(1);
    expect(metadata.exportedCases).toBe(1);
    expect(typeof metadata.completenessStats).toBe('object');
  });

  it('should export to all formats', () => {
    const exporter = new DataExporter();
    const cases = [
      {
        id: 'case-001',
        case_id: 'case-001',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        gender: 'male',
        conviction: 1,
        sentence_months: 24,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 0.95,
      } as any,
    ];
    
    const metadata = exporter.exportAllFormats(cases, '/tmp/test_output');
    expect(metadata).toHaveProperty('csv');
    expect(metadata).toHaveProperty('json');
    expect(metadata).toHaveProperty('feather');
    expect(metadata).toHaveProperty('parquet');
  });

  it('should filter only complete cases', () => {
    const exporter = new DataExporter();
    const cases = [
      {
        id: 'case-001',
        case_id: 'case-001',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        conviction: 1,
        completeness_score: 100,
      } as any,
      {
        id: 'case-002',
        case_id: 'case-002',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'White',
        conviction: 0,
        completeness_score: 20,
      } as any,
    ];
    
    const metadata = exporter.toCSV(cases, '/tmp/test_cases.csv', { onlyCompleteCases: true });
    expect(metadata.exportedCases).toBe(1); // Only case-001 has completeness_score >= 100
  });
});