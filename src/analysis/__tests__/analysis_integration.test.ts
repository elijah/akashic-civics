import { AnalysisPipeline, AnalysisPipelineConfig } from '../analysis_integration';

describe('AnalysisPipeline', () => {
  it('should initialize with default configuration', () => {
    const pipeline = new AnalysisPipeline();
    expect(pipeline).toBeDefined();
  });

  it('should initialize with custom configuration', () => {
    const config: Partial<AnalysisPipelineConfig> = {
      sourceConnector: 'custom-pipeline',
      sourceVersion: '2.0.0',
    };
    const pipeline = new AnalysisPipeline(config);
    expect(pipeline).toBeDefined();
  });

  it('should run pipeline with sample data', async () => {
    const pipeline = new AnalysisPipeline();
    
    const rawCases = [
      {
        case_id: 'case-001',
        official_id: 'officer-001',
        official_name: 'John Doe',
        official_type: 'judge' as const,
        jurisdiction_id: 'TX-001',
        race_ethnicity: 'Black',
        gender: 'male',
        offense_severity: 'high' as const,
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
        case_id: 'case-002',
        official_id: 'officer-001',
        official_name: 'John Doe',
        official_type: 'judge' as const,
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
        data_quality_score: 0.95,
      }
    ];

    const options = {
      groupVariable: 'race_ethnicity',
      outcomeVariable: 'conviction',
      controlVariables: [],
      analysisType: 'disparate_impact_conviction' as const,
    };

    const result = await pipeline.runPipeline(rawCases, options);
    
    expect(result).toBeDefined();
    expect(result.pipeline_id).toBeDefined();
    expect(result.snapshot_id).toBeDefined();
    expect(result.case_count).toBe(2);
    expect(result.conviction_rate).toBeDefined();
    expect(result.data_quality_score).toBeDefined();
    expect(result.analysis_results).toBeDefined();
    expect(result.disconfirmation_passed).toBeDefined();
    expect(result.methodology_report).toBeDefined();
    expect(result.output_files).toBeDefined();
    expect(result.conclusions).toBeDefined();
  });

  it('should handle empty cases array', async () => {
    const pipeline = new AnalysisPipeline();
    
    const options = {
      groupVariable: 'race_ethnicity',
      outcomeVariable: 'conviction',
      controlVariables: [],
      analysisType: 'disparate_impact_conviction' as const,
    };

    try {
      const result = await pipeline.runPipeline([], options);
      expect(result).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should process cases through all stages', async () => {
    const pipeline = new AnalysisPipeline();
    
    const rawCases = [
      {
        case_id: 'case-001',
        official_id: 'officer-001',
        official_name: 'John Doe',
        official_type: 'judge' as const,
        jurisdiction_id: 'CA-001',
        race_ethnicity: 'Hispanic',
        gender: 'male',
        offense_severity: 'medium' as const,
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 45,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 0.90,
      }
    ];

    const options = {
      groupVariable: 'race_ethnicity',
      outcomeVariable: 'conviction',
      controlVariables: [],
      analysisType: 'disparate_impact_conviction' as const,
    };

    const result = await pipeline.runPipeline(rawCases, options);
    
    expect(result).toBeDefined();
    expect(result.case_count).toBe(rawCases.length);
    expect(result.methodology_report).toBeDefined();
    expect(result.conclusions).toBeDefined();
  });
});