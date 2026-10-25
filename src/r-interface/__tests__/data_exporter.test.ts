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

  it('should export to CSV with quality flags', () => {
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
        missing_fields: ['field1', 'field2'],
        data_quality_flags: ['missing_data'],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 0.95,
      } as any,
    ];
    
    const metadata = exporter.toCSV(cases, '/tmp/test_cases.csv', { includeQualityFlags: true });
    expect(metadata).toBeDefined();
    expect(metadata.fieldsIncluded).toContain('missing_fields');
    expect(metadata.fieldsIncluded).toContain('data_quality_flags');
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
        offense_severity: 'medium' as const,
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
        offense_severity: 'medium' as const,
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
    expect(metadata.totalCases).toBe(2);
  });

  it('should export to CSV without filtering', () => {
    const exporter = new DataExporter();
    const cases = [
      {
        id: 'case-001',
        case_id: 'case-001',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        conviction: 1,
        completeness_score: 20,
      } as any,
    ];
    
    const metadata = exporter.toCSV(cases, '/tmp/test_cases.csv', { onlyCompleteCases: true });
    expect(metadata.exportedCases).toBe(0); // No cases have completeness_score >= 100
  });

  it('should handle empty cases array', () => {
    const exporter = new DataExporter();
    const metadata = exporter.toCSV([], '/tmp/test_cases.csv');
    expect(metadata.exportedCases).toBe(0);
    expect(metadata.totalCases).toBe(0);
    expect(metadata.fieldsIncluded.length).toBeGreaterThan(0);
  });

  it('should export to JSON with empty cases', () => {
    const exporter = new DataExporter();
    const metadata = exporter.toJSON([], '/tmp/test_cases.json');
    expect(metadata).toBeDefined();
    expect(metadata.totalCases).toBe(0);
    expect(metadata.exportedCases).toBe(0);
  });

  it('should export to CSV with onlyCompleteCases false', () => {
    const exporter = new DataExporter();
    const cases = [
      {
        id: 'case-001',
        case_id: 'case-001',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        conviction: 1,
        completeness_score: 20,
      } as any,
    ];
    
    const metadata = exporter.toCSV(cases, '/tmp/test_cases.csv', { onlyCompleteCases: false });
    expect(metadata.exportedCases).toBe(1);
    expect(metadata.totalCases).toBe(1);
  });

  it('should handle missing fields in formatField', () => {
    const exporter = new DataExporter();
    const metadata = exporter.toCSV([
      {
        id: 'case-001',
        case_id: 'case-001',
        jurisdiction_id: 'TX-001',
        // Missing most fields
      } as any,
    ], '/tmp/test_cases.csv');
    expect(metadata).toBeDefined();
  });

  it('should handle strings with quotes in formatField', () => {
    const exporter = new DataExporter();
    const metadata = exporter.toCSV([
      {
        id: 'case-001',
        case_id: 'case-001',
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'He said "hello"',
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
    ], '/tmp/test_cases.csv');
    expect(metadata).toBeDefined();
  });

  it('should handle numeric fields formatting', () => {
    const exporter = new DataExporter();
    const metadata = exporter.toCSV([
      {
        id: 'case-001',
        case_id: 'case-001',
        jurisdiction_id: 'TX-001',
        age_at_arrest: 25,
        sentence_months: 30,
        days_to_disposition: 45,
        completeness_score: 85.5,
        gender: 'male',
        offense_severity: 'low' as const,
        race_ethnicity: 'White',
        charge_type: 'traffic' as const,
        disposition_type: 'probation' as const,
        judge_id: 'JUDGE001',
        prosecutor_office: 'DA' as const,
        attorney_type: 'public' as const,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 0.95,
      } as any,
    ], '/tmp/test_cases.csv');
    expect(metadata).toBeDefined();
  });
});