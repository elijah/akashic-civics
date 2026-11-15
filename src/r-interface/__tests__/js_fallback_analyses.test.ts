/**
 * Test suite for JSFallbackAnalyses
 */

import { JSFallbackAnalyses } from '../js_fallback_analyses';
import { LegalJusticeCase } from '../../normalization/legal_justice_schema';

const mockCases: LegalJusticeCase[] = [
  {
    id: 'case_1',
    jurisdiction_id: 'jur_1',
    arrest_date: '2023-01-01',
    disposition_date: '2023-06-01',
    days_to_disposition: 150,
    race_ethnicity: 'Black',
    gender: 'Male',
    age_at_arrest: 30,
    offense_severity: 'felony_2',
    charge_type: 'felony',
    prior_record: 2,
    attorney_type: 'public_defender',
    conviction: 1,
    outcome_category: 'conviction',
    sentence_months: 24
  },
  {
    id: 'case_2',
    jurisdiction_id: 'jur_1',
    arrest_date: '2023-02-01',
    disposition_date: '2023-07-01',
    days_to_disposition: 150,
    race_ethnicity: 'White',
    gender: 'Female',
    age_at_arrest: 25,
    offense_severity: 'felony_1',
    charge_type: 'felony',
    prior_record: 0,
    attorney_type: 'private',
    conviction: 0,
    outcome_category: 'dismissal',
    sentence_months: 0
  }
];

const mockCasesWithTime = [
  {
    id: 'case_1',
    jurisdiction_id: 'jur_1',
    arrest_date: '2023-01-01',
    disposition_date: '2023-06-01',
    days_to_disposition: 150,
    race_ethnicity: 'Black',
    gender: 'Male',
    age_at_arrest: 30,
    offense_severity: 'felony_2',
    charge_type: 'felony',
    prior_record: 2,
    attorney_type: 'public_defender',
    conviction: 1,
    outcome_category: 'conviction',
    sentence_months: 24
  },
  {
    id: 'case_2',
    jurisdiction_id: 'jur_1',
    arrest_date: '2023-02-01',
    disposition_date: '2023-07-01',
    days_to_disposition: 100,
    race_ethnicity: 'White',
    gender: 'Female',
    age_at_arrest: 25,
    offense_severity: 'felony_1',
    charge_type: 'felony',
    prior_record: 0,
    attorney_type: 'private',
    conviction: 0,
    outcome_category: 'dismissal',
    sentence_months: 0
  }
];

describe('JSFallbackAnalyses', () => {
  describe('survivalAnalysis', () => {
    test('analyzes survival with valid data', () => {
      const options = {
        timeVariable: 'days_to_disposition',
        eventVariable: 'conviction',
        groupVariable: 'race_ethnicity'
      };
      const analyses = new JSFallbackAnalyses(mockCasesWithTime, options);
      const result = analyses.survivalAnalysis();
      
      expect(result).toBeDefined();
      expect(result.analysis_type).toBe('survival_analysis_js');
      expect(result.p_value).toBeDefined();
      expect(result.hazard_ratio).toBeDefined();
      expect(result.sample_size).toBe(2);
      expect(result.fallback_used).toBe(true);
      expect(result.fallback_reason).toBe('R unavailable or failed');
    });

    test('returns empty result with no valid data', () => {
      const analyses = new JSFallbackAnalyses([], { timeVariable: 'days_to_disposition', eventVariable: 'conviction' } as any);
      const result = analyses.survivalAnalysis();
      
      expect(result.sample_size).toBe(0);
      expect(result.p_value).toBe(1);
    });
  });

  describe('mediationAnalysis', () => {
    test('analyzes mediation with valid data', () => {
      const options = {
        treatmentVariable: 'race_ethnicity',
        mediatorVariable: 'offense_severity',
        outcomeVariable: 'conviction'
      };
      const analyses = new JSFallbackAnalyses(mockCases, options);
      const result = analyses.mediationAnalysis();
      
      expect(result).toBeDefined();
      expect(result.analysis_type).toBe('mediation_analysis_js');
      expect(result.indirect_effect).toBeDefined();
      expect(result.direct_effect).toBeDefined();
      expect(result.total_effect).toBeDefined();
      expect(result.proportion_mediated).toBeDefined();
      expect(result.p_value).toBeDefined();
      expect(result.fallback_used).toBe(true);
    });

    test('returns empty result with no valid data', () => {
      const analyses = new JSFallbackAnalyses([], {
        treatmentVariable: 'race_ethnicity',
        mediatorVariable: 'offense_severity',
        outcomeVariable: 'conviction'
      });
      const result = analyses.mediationAnalysis();
      
      expect(result.indirect_effect).toBe(0);
      expect(result.sample_size).toBe(0);
    });
  });

  describe('mixedEffectsAnalysis', () => {
    test('approximates mixed-effects model', () => {
      const options = {
        outcomeVariable: 'conviction',
        groupVariable: 'race_ethnicity'
      };
      const analyses = new JSFallbackAnalyses(mockCases, options);
      const result = analyses.mixedEffectsAnalysis();
      
      expect(result).toBeDefined();
      expect(result.analysis_type).toBe('mixed_effects_analysis_js');
      expect(result.effect_size).toBeDefined();
      expect(result.p_value).toBeDefined();
      expect(result.confidence_interval).toBeDefined();
      expect(result.fallback_used).toBe(true);
    });
  });

  describe('disparateImpactAnalysis', () => {
    test('analyzes disparate impact', () => {
      const options = {
        groupVariable: 'race_ethnicity',
        outcomeVariable: 'conviction',
        controlVariables: ['age_at_arrest'],
        alpha: 0.05
      };
      const analyses = new JSFallbackAnalyses(mockCases, options);
      const result = analyses.disparateImpactAnalysis();
      
      expect(result).toBeDefined();
      expect(result.analysis_type).toBe('disparate_impact_conviction_js');
      expect(result.effect_size).toBeDefined();
      expect(result.p_value).toBeDefined();
      expect(result.odds_ratio).toBeDefined();
      expect(result.model_summary.group_variable).toBe('race_ethnicity');
      expect(result.fallback_used).toBe(true);
    });
  });

  describe('machineLearningAnalysis', () => {
    test('approximates ML feature importance', () => {
      const options = {
        outcomeVariable: 'conviction'
      };
      const analyses = new JSFallbackAnalyses(mockCases, options);
      const result = analyses.machineLearningAnalysis();
      
      expect(result).toBeDefined();
      expect(result.analysis_type).toBe('machine_learning_analysis_js');
      expect(result.prediction_accuracy).toBeDefined();
      expect(result.feature_importance).toBeDefined();
      expect(result.sample_size).toBe(2);
      expect(result.fallback_used).toBe(true);
    });
  });

  describe('helper methods', () => {
    test('binaryEncode works correctly', () => {
      const analyses = new JSFallbackAnalyses(mockCases, {});
      
      expect(analyses['binaryEncode'](1)).toBe(1);
      expect(analyses['binaryEncode'](0)).toBe(0);
      expect(analyses['binaryEncode']('true')).toBe(1);
      expect(analyses['binaryEncode']('false')).toBe(0);
      expect(analyses['binaryEncode']('male')).toBe(1);
      expect(analyses['binaryEncode']('female')).toBe(0);
      expect(analyses['binaryEncode']('convicted')).toBe(1);
    });

    test('numericEncode works correctly', () => {
      const analyses = new JSFallbackAnalyses(mockCases, {});
      
      expect(analyses['numericEncode'](42)).toBe(42);
      expect(analyses['numericEncode']('3.14')).toBe(3.14);
      expect(analyses['numericEncode'](null)).toBe(null);
      expect(analyses['numericEncode'](undefined)).toBe(null);
    });

    test('normalCDF works correctly', () => {
      const analyses = new JSFallbackAnalyses(mockCases, {});
      
      expect(analyses['normalCDF'](0)).toBeCloseTo(0.5);
      expect(analyses['normalCDF'](1.96)).toBeCloseTo(0.975);
      expect(analyses['normalCDF'](-1.96)).toBeCloseTo(0.025);
    });
  });
});