import { RInterface, RAnalysisOptions } from '../r_bridge';

describe('RInterface', () => {
  it('should initialize with default values', () => {
    const rInterface = new RInterface();
    expect(rInterface).toBeDefined();
    // Check that the private fields exist via bracket notation
    const dir = (rInterface as any).analysisTemplatesDir;
    expect(dir).toBe('/home/elw/Akashic-Civics/docs/analysis-templates');
  });

  it('should initialize with custom R path', () => {
    const rInterface = new RInterface('/custom/R/path');
    expect(rInterface).toBeDefined();
    expect((rInterface as any).rScriptPath).toBe('/custom/R/path');
  });

  it('should sanitize a case for R consumption', () => {
    const rInterface = new RInterface();
    
    const caseData = {
      id: 'case-001',
      case_id: 'case-001',
      jurisdiction_id: 'TX-001',
      race_ethnicity: 'Black',
      gender: 'male',
      age_at_arrest: 35,
      offense_severity: 'high',
      charge_type: 'felony',
      conviction: 1,
      sentence_months: 24,
      days_to_disposition: 90,
      disposition_type: 'conviction',
      judge_id: 'judge-001',
      prosecutor_office: 'state',
      completeness_score: 0.95
    };

    const sanitized = (rInterface as any).sanitizeCaseForR(caseData);
    expect(sanitized.id).toBe('case-001');
    expect(sanitized.conviction).toBe(1);
    expect(sanitized.age_at_arrest).toBe(35);
    expect(sanitized.completeness_score).toBe(0.95);
  });

  it('should sanitize a case with missing fields', () => {
    const rInterface = new RInterface();
    
    const caseData = {
      id: 'case-001',
      case_id: 'case-001',
      race_ethnicity: null,
      conviction: null,
      age_at_arrest: null
    } as any;

    const sanitized = (rInterface as any).sanitizeCaseForR(caseData);
    expect(sanitized.race_ethnicity).toBe('');
    expect(sanitized.age_at_arrest).toBeNull();
    expect(sanitized.conviction).toBeNull();
  });

  it('should generate R script with correct analysis function', () => {
    const rInterface = new RInterface();
    
    const options: RAnalysisOptions = {
      analysisFunction: 'disparate_impact_conviction',
      groupVariable: 'race_ethnicity',
      outcomeVariable: 'conviction',
      controlVariables: ['offense_severity', 'age_at_arrest'],
      alpha: 0.05,
      imputeMissing: true,
      includeDisconfirmation: true,
      outputFormat: 'json'
    };

    const script = rInterface.generateRScript('/tmp/input.json', '/tmp/output.json', options);
    expect(script).toContain('disparate_impact_conviction');
    expect(script).toContain('source("');
    expect(script).toContain('akashicjustice.R');
    expect(script).toContain('fromJSON');
  });

  it('should generate R script with pre-registration support', () => {
    const rInterface = new RInterface();
    
    const options: RAnalysisOptions = {
      analysisFunction: 'disparate_impact_conviction',
      groupVariable: 'race_ethnicity',
      outcomeVariable: 'conviction',
      controlVariables: [],
      alpha: 0.05,
      imputeMissing: true,
      includeDisconfirmation: true,
      outputFormat: 'json'
    };

    const script = rInterface.generateRScript('/tmp/input.json', '/tmp/output.json', options, '/tmp/registration.json');
    expect(script).toContain('load_pre_registration');
    expect(script).toContain('pre_registration.R');
  });

  it('should validate a complete result', () => {
    const rInterface = new RInterface();
    
    const testData = {
      analysis_type: 'disparate_impact_conviction',
      effect_size: 0.25,
      p_value: 0.03,
      confidence_interval: [0.01, 0.49],
      odds_ratio: 1.5,
      model_summary: {},
      coefficients: {
        race_ethnicity: { estimate: 0.25, std_error: 0.1, z_value: 2.5, p_value: 0.03 }
      },
      model_diagnostics: {
        aic: 450,
        bic: 460,
        log_likelihood: -225,
        pseudo_r_squared: 0.1
      },
      data_quality: {
        n_cases: 100,
        missing_rate: 0.05,
        completeness_score: 0.9
      },
      disconfirmation_tests: {
        passed: true,
        tests_passed: 5,
        tests_total: 6,
        details: {
          placebo: true,
          out_of_sample: true,
          temporal: true,
          alt_explanation: true
        }
      }
    };

    const result = (rInterface as any).validateResult(testData);
    expect(result.analysis_type).toBe('disparate_impact_conviction');
    expect(result.effect_size).toBe(0.25);
    expect(result.p_value).toBe(0.03);
    expect(result.odds_ratio).toBe(1.5);
    expect(result.disconfirmation_tests?.passed).toBe(true);
    expect(result.model_diagnostics?.aic).toBe(450);
  });

  it('should validate a minimal result', () => {
    const rInterface = new RInterface();
    
    const testData = {
      analysis_type: 'descriptive'
    };

    const result = (rInterface as any).validateResult(testData);
    expect(result.analysis_type).toBe('descriptive');
    expect(result.effect_size).toBe(0);
    expect(result.p_value).toBe(1);
    expect(result.confidence_interval).toEqual([0, 0]);
    expect(result.model_diagnostics).toEqual({ aic: 0, bic: 0, log_likelihood: 0 });
    expect(result.data_quality).toEqual({ n_cases: 0, missing_rate: 0, completeness_score: 0 });
    expect(result.disconfirmation_tests).toBeUndefined();
  });

  it('should reject invalid results', () => {
    const rInterface = new RInterface();
    
    const testData = {};

    expect(() => {
      (rInterface as any).validateResult(testData);
    }).toThrow('Invalid R result: missing analysis_type');
  });

  it('should handle cleanup of temp files gracefully', () => {
    const rInterface = new RInterface();
    (rInterface as any).cleanupTempFiles('/nonexistent/path1', '/nonexistent/path2');
    // Should not throw even if files don't exist
  });
});