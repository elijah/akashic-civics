import { AnalysisPipeline, AnalysisPipelineConfig, AnalysisPipelineResult } from '../analysis_integration';

describe('End-to-End Integration', () => {
  const testConfig: AnalysisPipelineConfig = {
    jurisdictionId: 'test-jurisdiction-001',
    jurisdictionName: 'Test Jurisdiction',
    sourceConnector: 'e2e-test-pipeline',
    sourceVersion: '1.0.0',
    alphaLevel: 0.05,
    includeDisconfirmation: true,
    generateMethodology: true,
    outputDir: './test_output/e2e',
  };

  const pipeline = new AnalysisPipeline(testConfig);

  // Clean up test output before and after tests
  beforeAll(() => {
    // Note: In a real implementation, we'd clean the output directory
    // For this test, we'll rely on unique timestamps in filenames
  });

  afterAll(() => {
    // Cleanup would go here
  });

  it('should run complete end-to-end pipeline with simulated disparity data', async () => {
    // Step 1: Create realistic test data showing disparity
    const rawCases = [
      // Black defendants: higher conviction rate
      {
        case_id: 'blk-001',
        official_id: 'judge-001',
        official_name: 'Jane Smith',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'Black',
        gender: 'male',
        age_at_arrest: 25,
        offense_severity: 'high' as const,
        charge_type: 'felony',
        conviction: 1,
        sentence_months: 24,
        days_to_disposition: 60,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: '2023-01-01T10:00:00Z',
        data_quality_score: 95,
      },
      {
        case_id: 'blk-002',
        official_id: 'judge-002',
        official_name: 'Bob Jones',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'Black',
        gender: 'female',
        age_at_arrest: 30,
        offense_severity: 'medium' as const,
        charge_type: 'misdemeanor',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 45,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: '2023-01-02T11:00:00Z',
        data_quality_score: 88,
      },
      {
        case_id: 'blk-003',
        official_id: 'judge-001',
        official_name: 'Jane Smith',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'Black',
        gender: 'male',
        age_at_arrest: 22,
        offense_severity: 'high' as const,
        charge_type: 'felony',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: '2023-01-03T12:00:00Z',
        data_quality_score: 92,
      },
      {
        case_id: 'blk-004',
        official_id: 'judge-003',
        official_name: 'Alice Brown',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'Black',
        gender: 'male',
        age_at_arrest: 35,
        offense_severity: 'low' as const,
        charge_type: 'infraction',
        conviction: 1,
        sentence_months: 6,
        days_to_disposition: 30,
        missing_fields: ['witness_statement'],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: '2023-01-04T13:00:00Z',
        data_quality_score: 75,
      },

      // White defendants: lower conviction rate (creating disparity)
      {
        case_id: 'wht-001',
        official_id: 'judge-001',
        official_name: 'Jane Smith',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'White',
        gender: 'male',
        age_at_arrest: 25,
        offense_severity: 'high' as const,
        charge_type: 'felony',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: '2023-01-05T14:00:00Z',
        data_quality_score: 90,
      },
      {
        case_id: 'wht-002',
        official_id: 'judge-002',
        official_name: 'Bob Jones',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'White',
        gender: 'female',
        age_at_arrest: 30,
        offense_severity: 'medium' as const,
        charge_type: 'misdemeanor',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: '2023-01-06T15:00:00Z',
        data_quality_score: 85,
      },
      {
        case_id: 'wht-003',
        official_id: 'judge-001',
        official_name: 'Jane Smith',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'White',
        gender: 'male',
        age_at_arrest: 22,
        offense_severity: 'high' as const,
        charge_type: 'felony',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: '2023-01-07T16:00:00Z',
        data_quality_score: 92,
      },
      {
        case_id: 'wht-004',
        official_id: 'judge-003',
        official_name: 'Alice Brown',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'White',
        gender: 'female',
        age_at_arrest: 35,
        offense_severity: 'low' as const,
        charge_type: 'infraction',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: '2023-01-08T17:00:00Z',
        data_quality_score: 80,
      }
    ];

    // Step 2: Configure analysis options
    const options = {
      groupVariable: 'race_ethnicity',
      outcomeVariable: 'conviction',
      controlVariables: ['offense_severity', 'charge_type'],
      analysisType: 'disparate_impact_conviction' as const,
    };

    // Step 3: Run the end-to-end pipeline
    const result: AnalysisPipelineResult = await pipeline.runPipeline(rawCases, options);

    // Step 4: Verify pipeline execution
    expect(result).toBeDefined();
    expect(result.pipeline_id).toMatch(/^pipeline_\d+$/);
    expect(result.snapshot_id).toBeDefined();
    expect(result.case_count).toBe(8);
    
    // Step 5: Verify data provenance was tracked
    const provenanceReport = pipeline.getProvenanceReport();
    expect(provenanceReport).toBeDefined();
    expect(provenanceReport.totalCases).toBe(8);
    expect(provenanceReport.avgQualityScore).toBeGreaterThan(70); // Based on our test data
    
    // Step 6: Verify analysis results
    expect(result.analysis_results).toBeDefined();
    expect(result.analysis_results.effect_size).toBeDefined();
    expect(result.analysis_results.p_value).toBeDefined();
    expect(result.data_quality_score).toBeDefined();
    expect(result.data_quality_score).toBeGreaterThanOrEqual(0);
    expect(result.data_quality_score).toBeLessThanOrEqual(100);
    
    // Step 7: Verify disconfirmation testing was performed
    expect(result.disconfirmation_passed).toBeDefined();
    
    // Step 8: Verify methodology documentation was generated
    expect(result.methodology_report).toBeDefined();
    expect(result.methodology_report.title).toContain('Methodology Report');
    expect(Array.isArray(result.methodology_report.limitations)).toBe(true);
    
    // Step 9: Verify output files were tracked
    expect(Array.isArray(result.output_files)).toBe(true);
    expect(result.output_files.length).toBeGreaterThan(0);
    expect(result.output_files[0]).toContain('analysis_output/cases_');
    expect(result.output_files[0]).toMatch(/cases_.*\.csv$/);
    
    // Step 10: Verify conclusions were compiled
    expect(Array.isArray(result.conclusions)).toBe(true);
    expect(result.conclusions.length).toBeGreaterThan(0);
    expect(result.conclusions[0]).toContain('disparity');
    expect(result.conclusions[0]).toContain('statistically');
    
    // Step 11: Verify LLM inquiry can be generated
    const llmResponse = pipeline.generateRigorousInquiry(
      'Is there racial disparity in conviction rates after controlling for offense severity?',
      result
    );
    expect(llmResponse).toBeDefined();
    expect(llmResponse.analysis).toBeDefined();
    expect(llmResponse.effectSize).toBeDefined();
    expect(llmResponse.pValue).toBeDefined();
    expect(Array.isArray(llmResponse.recommendedFollowUpAnalyses)).toBe(true);
  });

  it('should handle case with no disparity in the data', async () => {
    // Create data with equal conviction rates between groups
    const rawCases = [
      // Black defendants
      {
        case_id: 'blk-eq-001',
        official_id: 'judge-001',
        official_name: 'Test Judge',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'Black',
        gender: 'male',
        age_at_arrest: 25,
        offense_severity: 'high' as const,
        charge_type: 'felony',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 45,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 90,
      },
      {
        case_id: 'blk-eq-002',
        official_id: 'judge-001',
        official_name: 'Test Judge',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'Black',
        gender: 'female',
        age_at_arrest: 30,
        offense_severity: 'medium' as const,
        charge_type: 'misdemeanor',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 85,
      },

      // White defendants - same rates
      {
        case_id: 'wht-eq-001',
        official_id: 'judge-001',
        official_name: 'Test Judge',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'White',
        gender: 'male',
        age_at_arrest: 25,
        offense_severity: 'high' as const,
        charge_type: 'felony',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 45,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 90,
      },
      {
        case_id: 'wht-eq-002',
        official_id: 'judge-001',
        official_name: 'Test Judge',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'White',
        gender: 'female',
        age_at_arrest: 30,
        offense_severity: 'medium' as const,
        charge_type: 'misdemeanor',
        conviction: 0,
        sentence_months: 0,
        days_to_disposition: 0,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 85,
      }
    ];

    const options = {
      groupVariable: 'race_ethnicity',
      outcomeVariable: 'conviction',
      controlVariables: ['offense_severity', 'charge_type'],
      analysisType: 'disparate_impact_conviction' as const,
    };

    const result: AnalysisPipelineResult = await pipeline.runPipeline(rawCases, options);

    // Should still complete the pipeline but find no significant disparity
    expect(result).toBeDefined();
    expect(result.case_count).toBe(4);
    expect(result.analysis_results).toBeDefined();
    // With equal rates, effect size should be close to 0
    expect(Math.abs(result.analysis_results.effect_size)).toBeLessThan(0.5); // Small effect
    
    // Should still generate methodology and conclusions
    expect(result.methodology_report).toBeDefined();
    expect(Array.isArray(result.conclusions)).toBe(true);
    expect(result.conclusions.length).toBeGreaterThan(0);
    
    // Conclusion should indicate no significant disparity found
    const conclusionText = result.conclusions.join(' ');
    expect(conclusionText).toContain('No statistically significant disparity');
    expect(conclusionText).toContain('p =');
  });

  it('should handle edge cases and errors gracefully', async () => {
    // Test with minimal valid data
    const minimalCases = [
      {
        case_id: 'min-001',
        official_id: 'judge-001',
        official_name: 'Test Judge',
        official_type: 'judge' as const,
        jurisdiction_id: 'test-jurisdiction-001',
        race_ethnicity: 'Black',
        gender: 'male',
        age_at_arrest: 25,
        offense_severity: 'high' as const,
        charge_type: 'felony',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 45,
        missing_fields: [],
        source_connector: 'akashic-pipeline',
        source_version: '1.0.0',
        ingestion_timestamp: new Date().toISOString(),
        data_quality_score: 80,
      }
    ];

    const options = {
      groupVariable: 'race_ethnicity',
      outcomeVariable: 'conviction',
      controlVariables: [],
      analysisType: 'disparate_impact_conviction' as const,
    };

    // Should handle single case gracefully
    const result = await pipeline.runPipeline(minimalCases, options);
    expect(result).toBeDefined();
    expect(result.case_count).toBe(1);
    
    // Test with empty array (should throw)
    try {
      await pipeline.runPipeline([], options);
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      const err = error as Error;
      expect(err).toBeDefined();
      expect(err.message).toContain('No valid cases');
    }
  });
});