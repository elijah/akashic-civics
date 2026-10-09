import { LLMRigorousInquiry, LLMResponse, AnalysisContext } from '../rigorous_inquiry';
import { RAnalysisResult } from '../../r-interface/r_bridge';

describe('LLMRigorousInquiry', () => {
  it('should initialize properly', () => {
    const inquiry = new LLMRigorousInquiry();
    expect(inquiry).toBeDefined();
  });

  it('should generate a rigorous analysis prompt', () => {
    const inquiry = new LLMRigorousInquiry();
    
    const context: AnalysisContext = {
      jurisdiction: 'TX-001',
      timePeriod: '2020-2023',
      caseCount: 1000,
      dataQualityScore: 85,
      missingDemographicsRate: 0.05,
    };
    
    const rResult: RAnalysisResult = {
      analysis_type: 'disparate_impact_conviction',
      effect_size: 0.15,
      p_value: 0.03,
      confidence_interval: [0.05, 0.25],
      sample_size: 1000,
      model_type: 'OLS',
      model_summary: 'Analysis completed successfully',
      odds_ratio: 1.35,
      model_diagnostics: {
        aic: 1234.56,
        bic: 1256.78,
        log_likelihood: -610.23,
      },
      disconfirmation_tests: {
        passed: true,
        tests_passed: 3,
        tests_total: 4,
        details: {},
      },
    };
    
    const question = 'Is there a statistically significant disparity in conviction rates by race/ethnicity?';
    
    const prompt = inquiry.generateAnalysisPrompt(question, context, rResult);
    
    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('Jurisdiction');
    expect(prompt).toContain('TX-001');
    expect(prompt).toContain('Effect size: 0.1500');
    expect(prompt).toContain('P-value: 0.0300');
    expect(prompt).toContain('95% CI: [0.0500, 0.2500]');
    expect(prompt).toContain('Effect size');
    expect(prompt).toContain('p-value');
    expect(prompt).toContain('disconfirmation');
    expect(prompt).toContain('alternative explanations');
    expect(prompt).toContain('limitations');
    expect(prompt).toContain('uncertainty');
    expect(prompt).toContain('follow-up analyses');
    expect(prompt).toContain('FALSIFY');
  });

  it('should generate a prompt without disconfirmation tests', () => {
    const inquiry = new LLMRigorousInquiry();
    
    const context: AnalysisContext = {
      jurisdiction: 'TX-001',
      timePeriod: '2020-2023',
      caseCount: 1000,
      dataQualityScore: 85,
      missingDemographicsRate: 0.05,
    };
    
    const rResult: RAnalysisResult = {
      analysis_type: 'disparate_impact_conviction',
      effect_size: 0.15,
      p_value: 0.03,
      confidence_interval: [0.05, 0.25],
      sample_size: 1000,
      model_type: 'OLS',
      model_summary: 'Analysis completed successfully',
      odds_ratio: 1.35,
      model_diagnostics: {
        aic: 1234.56,
        bic: 1256.78,
        log_likelihood: -610.23,
      },
    };
    
    const question = 'Is there a statistically significant disparity in conviction rates by race/ethnicity?';
    
    const prompt = inquiry.generateAnalysisPrompt(question, context, rResult);
    
    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('Effect size: 0.1500');
    expect(prompt).toContain('P-value: 0.0300');
    expect(prompt).not.toContain('Disconfirmation Tests');
  });

  it('should generate a prompt with odds ratio and model diagnostics', () => {
    const inquiry = new LLMRigorousInquiry();
    
    const context: AnalysisContext = {
      jurisdiction: 'TX-001',
      timePeriod: '2020-2023',
      caseCount: 1000,
      dataQualityScore: 85,
      missingDemographicsRate: 0.05,
    };
    
    const rResult: RAnalysisResult = {
      analysis_type: 'disparate_impact_conviction',
      effect_size: 0.15,
      p_value: 0.03,
      confidence_interval: [0.05, 0.25],
      sample_size: 1000,
      model_type: 'OLS',
      model_summary: 'Analysis completed successfully',
      odds_ratio: 1.35,
      model_diagnostics: {
        aic: 1234.56,
        bic: 1256.78,
        log_likelihood: -610.23,
      },
    };
    
    const question = 'Is there a statistically significant disparity in conviction rates by race/ethnicity?';
    
    const prompt = inquiry.generateAnalysisPrompt(question, context, rResult);
    
    expect(prompt).toContain('Odds ratio: 1.3500');
    expect(prompt).toContain('Model AIC: 1234.56');
    expect(prompt).toContain('Model BIC: 1256.78');
  });

  it('should include disconfirmation tests in prompt when present', () => {
    const inquiry = new LLMRigorousInquiry();
    
    const context: AnalysisContext = {
      jurisdiction: 'TX-001',
      timePeriod: '2020-2023',
      caseCount: 1000,
      dataQualityScore: 85,
      missingDemographicsRate: 0.05,
    };
    
    const rResult: RAnalysisResult = {
      analysis_type: 'disparate_impact_conviction',
      effect_size: 0.15,
      p_value: 0.03,
      confidence_interval: [0.05, 0.25],
      sample_size: 1000,
      model_type: 'OLS',
      model_summary: 'Analysis completed successfully',
      disconfirmation_tests: {
        passed: true,
        tests_passed: 3,
        tests_total: 4,
        details: {},
      },
    };
    
    const question = 'Is there a statistically significant disparity in conviction rates by race/ethnicity?';
    
    const prompt = inquiry.generateAnalysisPrompt(question, context, rResult);
    
    expect(prompt).toContain('Overall: PASSED');
    expect(prompt).toContain('Tests passed: 3/4');
  });

  it('should produce a meaningful prompt string', () => {
    const inquiry = new LLMRigorousInquiry();
    
    const context: AnalysisContext = {
      jurisdiction: 'TX-001',
      timePeriod: '2020-2023',
      caseCount: 1000,
      dataQualityScore: 85,
      missingDemographicsRate: 0.05,
    };
    
    const rResult: RAnalysisResult = {
      analysis_type: 'disparate_impact_conviction',
      effect_size: 0.15,
      p_value: 0.03,
      confidence_interval: [0.05, 0.25],
      sample_size: 1000,
      model_type: 'OLS',
      model_summary: 'Analysis completed successfully',
      odds_ratio: 1.35,
      model_diagnostics: {
        aic: 1234.56,
        bic: 1256.78,
        log_likelihood: -610.23,
      },
    };
    
    const question = 'Is there a statistically significant disparity in conviction rates by race/ethnicity?';
    
    const prompt = inquiry.generateAnalysisPrompt(question, context, rResult);
    
    expect(prompt.length).toBeGreaterThan(500);
    expect(prompt).not.toBe('');
  });
});

describe('AnalysisContext', () => {
  it('should define analysis context with required fields', () => {
    const context: AnalysisContext = {
      jurisdiction: 'TX-001',
      timePeriod: '2020-2023',
      caseCount: 1000,
      dataQualityScore: 85,
      missingDemographicsRate: 0.05,
    };

    expect(context).toBeDefined();
    expect(context.jurisdiction).toBe('TX-001');
    expect(context.timePeriod).toBe('2020-2023');
    expect(context.caseCount).toBe(1000);
    expect(context.dataQualityScore).toBe(85);
    expect(context.missingDemographicsRate).toBe(0.05);
  });
});

describe('LLMResponse', () => {
  it('should define LLM response with required fields', () => {
    const response: LLMResponse = {
      analysis: 'The analysis shows a statistically significant disparity with effect size of 0.15...',
      effectSize: 0.15,
      pValue: 0.03,
      confidenceInterval: [0.05, 0.25],
      uncertainty: 'low',
      caveats: ['Small sample size', 'Potential confounding variables'],
      recommendedFollowUpAnalyses: ['Sensitivity analysis', 'Subgroup analysis'],
    };

    expect(response.analysis).toBeDefined();
    expect(typeof response.effectSize).toBe('number');
    expect(typeof response.pValue).toBe('number');
    expect(Array.isArray(response.confidenceInterval)).toBe(true);
    expect(response.confidenceInterval.length).toBe(2);
    expect(response.uncertainty).toBeDefined();
    expect(Array.isArray(response.caveats)).toBe(true);
    expect(Array.isArray(response.recommendedFollowUpAnalyses)).toBe(true);
  });

  it('should support all uncertainty levels', () => {
    const uncertaintyLevels: Array<LLMResponse['uncertainty']> = ['high', 'moderate', 'low'];
    uncertaintyLevels.forEach(level => {
      const response: LLMResponse = {
        analysis: 'test',
        effectSize: 0.1,
        pValue: 0.05,
        confidenceInterval: [0.01, 0.19],
        uncertainty: level,
        caveats: [],
        recommendedFollowUpAnalyses: [],
      };
      expect(response.uncertainty).toBe(level);
    });
  });

  describe('generateConfounderPrompt', () => {
    it('should test specific unmeasured confounders', () => {
      const inquiry = new LLMRigorousInquiry();
      
      const context: AnalysisContext = {
        jurisdiction: 'TX-001',
        timePeriod: '2020-2023',
        caseCount: 1000,
        dataQualityScore: 85,
        missingDemographicsRate: 0.05,
      };
      
      const result = inquiry.generateConfounderPrompt(
        'Black defendants have higher conviction rates',
        1.5,
        ['offense_severity', 'charge_type'],
        ['socioeconomic_status', 'legal_representation_quality', 'judge_assignment'],
        context
      );
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('strength of association');
      expect(result).toContain('E-value');
      expect(result).toContain('confounding could explain away');
      expect(result).toContain('Recommend');
    });
  });

  describe('generateInterpretationPrompt', () => {
    it('should generate honest statistical interpretation', () => {
      const inquiry = new LLMRigorousInquiry();
      
      const context: AnalysisContext = {
        jurisdiction: 'TX-001',
        timePeriod: '2020-2023',
        caseCount: 1000,
        dataQualityScore: 85,
        missingDemographicsRate: 0.05,
      };
      
      const result = inquiry.generateInterpretationPrompt(
        'disparate_impact_conviction',
        0.15,
        0.03,
        [0.05, 0.25],
        true,
        'Black defendants have higher conviction rates than white defendants',
        context
      );
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('Statistical significance');
      expect(result).toContain('Practical significance');
      expect(result).toContain('Confidence interval');
      expect(result).toContain('Disconfirmation');
      expect(result).toContain('Direction');
      expect(result).toContain('Causality');
      expect(result).toContain('Overall conclusion');
    });
  });

  describe('generatePreRegistrationPrompt', () => {
    it('should generate pre-registration design guidance for binary outcome', () => {
      const inquiry = new LLMRigorousInquiry();
      
      const result = inquiry.generatePreRegistrationPrompt(
        'Racial disparity in conviction rates',
        'Do Black defendants have higher conviction rates than white defendants?',
        true,
        'binary'
      );
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('Research Question');
      expect(result).toContain('Hypothesis');
      expect(result).toContain('sample');
      expect(result).toContain('variables');
      expect(result).toContain('analysis plan');
      expect(result).toContain('Disconfirmation Tests');
      expect(result).toContain('effect size');
    });
  });

  describe('generateAuditPrompt', () => {
    it('should generate full methodological audit', () => {
      const inquiry = new LLMRigorousInquiry();
      
      const result = inquiry.generateAuditPrompt(
        'Disparate impact conviction analysis',
        '/* analysis code */',
        {
          caseCount: 1000,
          missingDemographicsRate: 0.05,
          dataQualityScore: 85,
          missingControlRates: {
            offense_severity: 0.02,
            charge_type: 0.03,
          }
        }
      );
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('Hypothesis');
      expect(result).toContain('Sample Definition');
      expect(result).toContain('Variable Definitions');
      expect(result).toContain('Statistical Methods');
      expect(result).toContain('Robustness');
      expect(result).toContain('Reporting');
      expect(result).toContain('Potential Confounding');
      expect(result).toContain('Data Quality');
      expect(result).toContain('ranked:');
    });
  });

  describe('generateComparisonPrompt', () => {
    it('should compare results across comparison units', () => {
      const inquiry = new LLMRigorousInquiry();
      
      const rResults: RAnalysisResult[] = [
        {
          analysis_type: 'disparate_impact_conviction',
          effect_size: 0.15,
          p_value: 0.03,
          confidence_interval: [0.05, 0.25],
          sample_size: 500,
          model_type: 'OLS',
          model_summary: 'Test 1',
        },
        {
          analysis_type: 'disparate_impact_conviction',
          effect_size: 0.12,
          p_value: 0.08,
          confidence_interval: [0.00, 0.24],
          sample_size: 300,
          model_type: 'OLS',
          model_summary: 'Test 2',
        },
      ];
      
      const result = inquiry.generateComparisonPrompt(
        'two jurisdictions',
        rResults,
        {
          jurisdiction: 'TX-001',
          timePeriod: '2020-2023',
          caseCount: 1000,
          dataQualityScore: 85,
          missingDemographicsRate: 0.05,
        }
      );
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('comparison');
      expect(result).toContain('jurisdiction');
      expect(result).toContain('Effect size');
      expect(result).toContain('Comparison Unit 1');
      expect(result).toContain('Comparison Unit 2');
    });
  });
});