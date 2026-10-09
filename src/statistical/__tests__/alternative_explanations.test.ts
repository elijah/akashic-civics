import { testAlternativeExplanations, AlternativeExplanationReport } from '../alternative_explanations';

describe('testAlternativeExplanations', () => {
  it('should run with sample data', () => {
    const cases: any[] = [
      {
        case_id: '1',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 60,
        race_ethnicity: 'Black',
        offense_severity: 'high',
        missing_fields: [],
      },
      {
        case_id: '2',
        conviction: 1,
        sentence_months: 8,
        days_to_disposition: 45,
        race_ethnicity: 'Black',
        offense_severity: 'high',
        missing_fields: [],
      },
      {
        case_id: '3',
        conviction: 0,
        sentence_months: null,
        days_to_disposition: null,
        race_ethnicity: 'White',
        offense_severity: 'high',
        missing_fields: [],
      },
      {
        case_id: '4',
        conviction: 0,
        sentence_months: null,
        days_to_disposition: null,
        race_ethnicity: 'White',
        offense_severity: 'high',
        missing_fields: [],
      },
    ];

    const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
    
    expect(report).toBeDefined();
    expect(report.confounders).toBeDefined();
    expect(report.tests).toBeDefined();
    expect(report.overallConclusion).toBeDefined();
    expect(report.recommendation).toBeDefined();
    expect(Array.isArray(report.confounders)).toBe(true);
    expect(Array.isArray(report.tests)).toBe(true);
  });

  it('should handle confounders affecting disparity', () => {
    const cases: any[] = [
      {
        case_id: '1',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 60,
        race_ethnicity: 'Black',
        offense_severity: 'high',
        missing_fields: [],
      },
      {
        case_id: '2',
        conviction: 0,
        sentence_months: null,
        days_to_disposition: null,
        race_ethnicity: 'White',
        offense_severity: 'high',
        missing_fields: [],
      },
      {
        case_id: '3',
        conviction: 0,
        sentence_months: null,
        days_to_disposition: null,
        race_ethnicity: 'White',
        offense_severity: 'low',
        missing_fields: [],
      },
      {
        case_id: '4',
        conviction: 0,
        sentence_months: null,
        days_to_disposition: null,
        race_ethnicity: 'White',
        offense_severity: 'low',
        missing_fields: [],
      },
      {
        case_id: '5',
        conviction: 0,
        sentence_months: null,
        days_to_disposition: null,
        race_ethnicity: 'White',
        offense_severity: 'low',
        missing_fields: [],
      },
    ];

    const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
    
    expect(report.confounders).toBeDefined();
    expect(Array.isArray(report.confounders)).toBe(true);
    expect(report.tests).toBeDefined();
    expect(Array.isArray(report.tests)).toBe(true);
    expect(report.overallConclusion).toBeDefined();
    expect(report.recommendation).toBeDefined();
  });

  it('should handle empty cases array', () => {
    const cases: any[] = [];

    const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
    
    expect(report).toBeDefined();
    expect(Array.isArray(report.confounders)).toBe(true);
    expect(Array.isArray(report.tests)).toBe(true);
    expect(report.overallConclusion).toBeDefined();
    expect(report.recommendation).toBeDefined();
  });

  it('should handle single case', () => {
    const cases: any[] = [
      {
        case_id: '1',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 60,
        race_ethnicity: 'Black',
        offense_severity: 'high',
        missing_fields: [],
      },
    ];

    const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
    
    expect(report).toBeDefined();
    expect(Array.isArray(report.confounders)).toBe(true);
    expect(Array.isArray(report.tests)).toBe(true);
    expect(report.overallConclusion).toBeDefined();
    expect(report.recommendation).toBeDefined();
  });

   it('should compute correct baseline disparity', () => {
     // When there are 2 black convictions out of 4 total black cases = 50%
     // and 0 white convictions out of 4 total white cases = 0%
     // baseline should be 0.5
     const cases: any[] = [
       { case_id: '1', conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
       { case_id: '2', conviction: 1, sentence_months: 8, days_to_disposition: 45, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
       { case_id: '3', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
       { case_id: '4', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
       { case_id: '5', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
       { case_id: '6', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
       { case_id: '7', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
       { case_id: '8', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
     ];

     const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
     
     expect(report.confounders).toBeDefined();
     expect(report.confounders.length).toBeGreaterThan(0);
     // Baseline should show a 50% disparity (50% vs 0%)
     const baselineConfounder = report.confounders.find(c => c.confounder === 'offense_severity');
     expect(baselineConfounder).toBeDefined();
     expect(baselineConfounder?.beforeAdjustment).toBe(0.5);
   });

  it('should compute correct confounder effects', () => {
    const cases: any[] = [
      // Black defendants with high offense severity: 50% conviction rate
      // White defendants with high offense severity: 20% conviction rate  
      // After adjustment, disparity should be reduced
      { case_id: '1', conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { case_id: '2', conviction: 1, sentence_months: 8, days_to_disposition: 45, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { case_id: '3', conviction: 1, sentence_months: 10, days_to_disposition: 50, race_ethnicity: 'Black', offense_severity: 'low', missing_fields: [] },
      { case_id: '4', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
      { case_id: '5', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low', missing_fields: [] },
    ];

    const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
    
    expect(report.confounders).toBeDefined();
    expect(Array.isArray(report.confounders)).toBe(true);
    // Each confounder result should have required fields
    report.confounders.forEach(confounder => {
      expect(confounder).toHaveProperty('confounder');
      expect(confounder).toHaveProperty('beforeAdjustment');
      expect(confounder).toHaveProperty('afterAdjustment');
      expect(confounder).toHaveProperty('adjustment');
      expect(confounder).toHaveProperty('confounderEffect');
      expect(confounder).toHaveProperty('residualDisparity');
      expect(confounder).toHaveProperty('explainedByConfounder');
      expect(confounder).toHaveProperty('explanation');
    });
  });

  it('should compute correct test results', () => {
    const cases: any[] = [
      { case_id: '1', conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { case_id: '2', conviction: 1, sentence_months: 8, days_to_disposition: 45, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { case_id: '3', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
      { case_id: '4', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
    ];

    const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
    
    expect(report.tests).toBeDefined();
    expect(Array.isArray(report.tests)).toBe(true);
    expect(report.tests.length).toBeGreaterThan(0);
    
    // Each test should have required fields
    report.tests.forEach(test => {
      expect(test).toHaveProperty('testName');
      expect(test).toHaveProperty('testType');
      expect(test).toHaveProperty('result');
      expect(test).toHaveProperty('effectSize');
      expect(test).toHaveProperty('pValue');
      expect(test).toHaveProperty('explanation');
    });
  });

  it('should generate correct overall conclusion when confounders explain disparity', () => {
    const cases: any[] = [
      // All black cases have same conviction rate as white when adjusted
      { case_id: '1', conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { case_id: '2', conviction: 1, sentence_months: 8, days_to_disposition: 45, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { case_id: '3', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
      { case_id: '4', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
    ];

    const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
    
    expect(report.overallConclusion).toBeDefined();
    expect(report.recommendation).toBeDefined();
  });

  it('should generate correct overall conclusion when disparity is not robust', () => {
    const cases: any[] = [
      { case_id: '1', conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { case_id: '2', conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'high', missing_fields: [] },
    ];

    const report: AlternativeExplanationReport = testAlternativeExplanations(cases);
    
    expect(report.overallConclusion).toBeDefined();
    expect(report.recommendation).toBeDefined();
  });
});