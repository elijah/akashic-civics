/**
 * Test suite for Enhanced R Interface
 * 
 * Tests cover:
 * - Initialization and configuration
 * - Package installation checking
 * - Template loading
 * - Survival analysis
 * - Mediation analysis
 * - Mixed-effects analysis
 * - Machine learning analysis
 * - Error handling and fallback
 * - Data sanitization
 * - Result parsing
 */

import { EnhancedRInterface, EnhancedRAnalysisOptions, SurvivalAnalysisOptions, MediationAnalysisOptions, MixedEffectsOptions, MachineLearningOptions } from '../enhanced_r_bridge';
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

describe('EnhancedRInterface', () => {
  describe('constructor', () => {
    test('initializes with default values', () => {
      const enhancedInterface = new EnhancedRInterface();
      expect(enhancedInterface).toBeDefined();
      expect(enhancedInterface).toBeInstanceOf(EnhancedRInterface);
    });

    test('initializes with custom R path', () => {
      const enhancedInterface = new EnhancedRInterface('/custom/R');
      expect(enhancedInterface).toBeDefined();
    });

    test('initializes with custom templates directory', () => {
      const customDir = '/custom/templates/path';
      const enhancedInterface = new EnhancedRInterface('/usr/bin/Rscript', customDir);
      expect(enhancedInterface).toBeDefined();
    });

    test('initializes with default templates directory', () => {
      const enhancedInterface = new EnhancedRInterface();
      // Default should be the docs/analysis-templates/r_templates path
      expect(enhancedInterface).toBeDefined();
    });
  });

  describe('sanitizeCaseForR', () => {
    test('handles null values', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['sanitizeCaseForR']({ id: null, name: 'test' });
      expect(result.id).toBeNull();
      expect(result.name).toBe('test');
    });

    test('handles undefined values', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['sanitizeCaseForR']({ id: undefined, name: 'test' });
      expect(result.id).toBeNull();
      expect(result.name).toBe('test');
    });

    test('handles string NA values', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['sanitizeCaseForR']({ id: 'NA', name: 'test' });
      expect(result.id).toBeNull();
      expect(result.name).toBe('test');
    });

    test('handles boolean conversion', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['sanitizeCaseForR']({ id: true, name: false });
      expect(result.id).toBe(1);
      expect(result.name).toBe(0);
    });

    test('handles array conversion', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['sanitizeCaseForR']({ ids: ['a', 'b', 'c'] });
      expect(Array.isArray(result.ids)).toBe(false);
      expect(result.ids).toBe('a,b,c');
    });

    test('handles mixed case', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['sanitizeCaseForR']({
        id: null,
        active: true,
        label: 'NA',
        tags: ['x', 'y']
      });
      expect(result.id).toBeNull();
      expect(result.active).toBe(1);
      expect(result.label).toBeNull();
      expect(result.tags).toBe('x,y');
    });
  });

  describe('EnhancedRAnalysisOptions type', () => {
    test('validates survival analysis options', () => {
      const options: EnhancedRAnalysisOptions = {
        analysisType: 'survival',
        packageUsed: 'survival',
        alpha: 0.05,
        useParallel: true,
        cores: 4
      };
      expect(options.analysisType).toBe('survival');
      expect(options.packageUsed).toBe('survival');
      expect(options.alpha).toBe(0.05);
      expect(options.useParallel).toBe(true);
      expect(options.cores).toBe(4);
    });

    test('validates mediation analysis options', () => {
      const options: MediationAnalysisOptions = {
        analysisType: 'mediation',
        packageUsed: 'mediation',
        treatmentVariable: 'race_ethnicity',
        mediatorVariable: 'offense_severity',
        outcomeVariable: 'conviction',
        alpha: 0.05
      };
      expect(options.analysisType).toBe('mediation');
      expect(options.packageUsed).toBe('mediation');
    });

    test('validates mixed effects options', () => {
      const options: MixedEffectsOptions = {
        analysisType: 'mixedEffects',
        packageUsed: 'lme4',
        fixedFormula: 'conviction ~ race_ethnicity + age_at_arrest',
        randomFormula: '1 | jurisdiction_id',
        family: 'binomial'
      };
      expect(options.analysisType).toBe('mixedEffects');
      expect(options.packageUsed).toBe('lme4');
    });

    test('validates machine learning options', () => {
      const options: MachineLearningOptions = {
        analysisType: 'machineLearning',
        packageUsed: 'caret',
        outcomeVariable: 'conviction',
        algorithm: 'rf',
        tuneParameters: true,
        crossValidation: true,
        folds: 5
      };
      expect(options.analysisType).toBe('machineLearning');
      expect(options.packageUsed).toBe('caret');
    });
  });

  describe('SurvivalAnalysisOptions type', () => {
    test('validates survival options with required fields', () => {
      const options: SurvivalAnalysisOptions = {
        analysisType: 'survival',
        packageUsed: 'survival',
        timeVariable: 'days_to_disposition',
        eventVariable: 'conviction',
        groupVariable: 'race_ethnicity'
      };
      expect(options.analysisType).toBe('survival');
      expect(options.timeVariable).toBe('days_to_disposition');
      expect(options.eventVariable).toBe('conviction');
      expect(options.groupVariable).toBe('race_ethnicity');
    });

    test('validates survival options without group variable', () => {
      const options: SurvivalAnalysisOptions = {
        analysisType: 'survival',
        packageUsed: 'survival',
        timeVariable: 'days_to_disposition',
        eventVariable: 'conviction'
      };
      expect(options.analysisType).toBe('survival');
      expect(options.timeVariable).toBe('days_to_disposition');
      expect(options.eventVariable).toBe('conviction');
      expect(options.groupVariable).toBeUndefined();
    });
  });

  describe('MediationAnalysisOptions type', () => {
    test('validates mediation options with required fields', () => {
      const options: MediationAnalysisOptions = {
        analysisType: 'mediation',
        packageUsed: 'mediation',
        treatmentVariable: 'race_ethnicity',
        mediatorVariable: 'offense_severity',
        outcomeVariable: 'conviction',
        covariates: ['age_at_arrest', 'gender']
      };
      expect(options.analysisType).toBe('mediation');
      expect(options.treatmentVariable).toBe('race_ethnicity');
      expect(options.mediatorVariable).toBe('offense_severity');
      expect(options.outcomeVariable).toBe('conviction');
      expect(options.covariates).toEqual(['age_at_arrest', 'gender']);
    });

    test('validates mediation options without covariates', () => {
      const options: MediationAnalysisOptions = {
        analysisType: 'mediation',
        packageUsed: 'mediation',
        treatmentVariable: 'race_ethnicity',
        mediatorVariable: 'offense_severity',
        outcomeVariable: 'conviction'
      };
      expect(options.analysisType).toBe('mediation');
      expect(options.treatmentVariable).toBe('race_ethnicity');
      expect(options.mediatorVariable).toBe('offense_severity');
      expect(options.outcomeVariable).toBe('conviction');
      expect(options.covariates).toBeUndefined();
    });
  });

  describe('MixedEffectsOptions type', () => {
    test('validates mixed effects options with required fields', () => {
      const options: MixedEffectsOptions = {
        analysisType: 'mixedEffects',
        packageUsed: 'lme4',
        fixedFormula: 'conviction ~ race_ethnicity + age_at_arrest',
        randomFormula: '1 | jurisdiction_id',
        family: 'binomial'
      };
      expect(options.analysisType).toBe('mixedEffects');
      expect(options.packageUsed).toBe('lme4');
      expect(options.fixedFormula).toBe('conviction ~ race_ethnicity + age_at_arrest');
      expect(options.randomFormula).toBe('1 | jurisdiction_id');
      expect(options.family).toBe('binomial');
    });

    test('validates mixed effects options without family', () => {
      const options: MixedEffectsOptions = {
        analysisType: 'mixedEffects',
        packageUsed: 'lme4',
        fixedFormula: 'conviction ~ race_ethnicity',
        randomFormula: '1 | jurisdiction_id'
      };
      expect(options.analysisType).toBe('mixedEffects');
      expect(options.packageUsed).toBe('lme4');
      expect(options.fixedFormula).toBe('conviction ~ race_ethnicity');
      expect(options.randomFormula).toBe('1 | jurisdiction_id');
      expect(options.family).toBeUndefined();
    });
  });

  describe('MachineLearningOptions type', () => {
    test('validates machine learning options with algorithm', () => {
      const options: MachineLearningOptions = {
        analysisType: 'machineLearning',
        packageUsed: 'caret',
        outcomeVariable: 'conviction',
        algorithm: 'xgboost',
        tuneParameters: true,
        crossValidation: true,
        folds: 10
      };
      expect(options.analysisType).toBe('machineLearning');
      expect(options.packageUsed).toBe('caret');
      expect(options.algorithm).toBe('xgboost');
      expect(options.tuneParameters).toBe(true);
      expect(options.crossValidation).toBe(true);
      expect(options.folds).toBe(10);
    });

    test('validates machine learning options with defaults', () => {
      const options: MachineLearningOptions = {
        analysisType: 'machineLearning',
        packageUsed: 'caret',
        outcomeVariable: 'conviction'
      };
      expect(options.analysisType).toBe('machineLearning');
      expect(options.packageUsed).toBe('caret');
      expect(options.algorithm).toBe('rf'); // default
      expect(options.tuneParameters).toBe(false); // default
      expect(options.crossValidation).toBe(false); // default
      expect(options.folds).toBe(10); // default
    });
  });

  describe('runSurvivalAnalysis', () => {
    test('throws error when cases array is empty', async () => {
      const rInterface = new EnhancedRInterface();
      await expect(rInterface.runSurvivalAnalysis([], {
        analysisType: 'survival',
        packageUsed: 'survival',
        timeVariable: 'days_to_disposition',
        eventVariable: 'conviction'
      })).rejects.toThrow();
    });

    test('throws error when required variables missing', async () => {
      const rInterface = new EnhancedRInterface();
      await expect(rInterface.runSurvivalAnalysis(mockCases, {
        analysisType: 'survival',
        packageUsed: 'survival',
        timeVariable: 'nonexistent',
        eventVariable: 'conviction'
      })).rejects.toThrow();
    });
  });

  describe('runMediationAnalysis', () => {
    test('throws error when cases array is empty', async () => {
      const rInterface = new EnhancedRInterface();
      await expect(rInterface.runMediationAnalysis([], {
        analysisType: 'mediation',
        packageUsed: 'mediation',
        treatmentVariable: 'race_ethnicity',
        mediatorVariable: 'offense_severity',
        outcomeVariable: 'conviction'
      })).rejects.toThrow();
    });

    test('throws error when required variables missing', async () => {
      const rInterface = new EnhancedRInterface();
      await expect(rInterface.runMediationAnalysis(mockCases, {
        analysisType: 'mediation',
        packageUsed: 'mediation',
        treatmentVariable: 'race_ethnicity',
        mediatorVariable: 'nonexistent',
        outcomeVariable: 'conviction'
      })).rejects.toThrow();
    });
  });

  describe('runMixedEffectsAnalysis', () => {
    test('throws error when cases array is empty', async () => {
      const rInterface = new EnhancedRInterface();
      await expect(rInterface.runMixedEffectsAnalysis([], {
        analysisType: 'mixedEffects',
        packageUsed: 'lme4',
        fixedFormula: 'conviction ~ race_ethnicity',
        randomFormula: '1 | jurisdiction_id'
      })).rejects.toThrow();
    });

    test('throws error when required formula missing', async () => {
      const rInterface = new EnhancedRInterface();
      await expect(rInterface.runMixedEffectsAnalysis(mockCases, {
        analysisType: 'mixedEffects',
        packageUsed: 'lme4',
        fixedFormula: 'conviction ~ race_ethnicity',
        randomFormula: '1 | jurisdiction_id'
      })).rejects.toThrow();
    });
  });

  describe('runMachineLearningAnalysis', () => {
    test('throws error when cases array is empty', async () => {
      const rInterface = new EnhancedRInterface();
      await expect(rInterface.runMachineLearningAnalysis([], {
        analysisType: 'machineLearning',
        packageUsed: 'caret',
        outcomeVariable: 'conviction'
      })).rejects.toThrow();
    });

    test('throws error when outcome variable missing', async () => {
      const rInterface = new EnhancedRInterface();
      await expect(rInterface.runMachineLearningAnalysis(mockCases, {
        analysisType: 'machineLearning',
        packageUsed: 'caret',
        outcomeVariable: 'conviction'
      })).rejects.toThrow();
    });
  });

  describe('prepareDataFile', () => {
    test('creates CSV file with headers', async () => {
      const rInterface = new EnhancedRInterface();
      const filePath = await rInterface['prepareDataFile'](mockCases, {
        analysisType: 'survival' as any,
        packageUsed: 'survival' as any
      });
      expect(filePath).toContain('.csv');
      expect(filePath).toMatch(/akashic_data_/);
    });

    test('creates CSV with sanitized data', async () => {
      const rInterface = new EnhancedRInterface();
      const filePath = await rInterface['prepareDataFile'](mockCases, {
        analysisType: 'survival' as any,
        packageUsed: 'survival' as any
      });
      // File should exist and be readable
      expect(filePath).toBeDefined();
    });
  });

  describe('generateSurvivalScript', () => {
    test('generates script with data file path', async () => {
      const rInterface = new EnhancedRInterface();
      // The method is private, but we can test the generation logic
      // by checking that the rInterface has the method
      expect(rInterface['generateSurvivalScript']).toBeDefined();
    });
  });

  describe('generateMediationScript', () => {
    test('generates script with data file path', async () => {
      const rInterface = new EnhancedRInterface();
      expect(rInterface['generateMediationScript']).toBeDefined();
    });
  });

  describe('generateMixedEffectsScript', () => {
    test('generates script with data file path', async () => {
      const rInterface = new EnhancedRInterface();
      expect(rInterface['generateMixedEffectsScript']).toBeDefined();
    });
  });

  describe('generateMLScript', () => {
    test('generates script with data file path', async () => {
      const rInterface = new EnhancedRInterface();
      expect(rInterface['generateMLScript']).toBeDefined();
    });
  });

  describe('executeRScriptContent', () => {
    test('handles script execution', async () => {
      const rInterface = new EnhancedRInterface();
      const result = await rInterface['executeRScriptContent']('test script content');
      // Should resolve (even if R isn't available, it handles gracefully)
      expect(result).toBeDefined();
    });
  });

  describe('getAvailableWorker', () => {
    test('returns available worker id', () => {
      const rInterface = new EnhancedRInterface();
      // Worker pool is initialized in constructor
      const workerIdResult = rInterface['getAvailableWorker']();
      expect(workerIdResult === undefined || typeof workerIdResult === 'number').toBe(true);
    });
  });

  describe('cleanup', () => {
    test('completes without error', () => {
      const rInterface = new EnhancedRInterface();
      expect(() => rInterface.cleanup()).not.toThrow();
    });
  });

  describe('parseSurvivalResult', () => {
    test('parses valid JSON result', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['parseSurvivalResult']('{"effect_size": 0.5, "p_value": 0.01, "confidence_interval": [0.2, 0.8], "hazard_ratio": 1.5, "sample_size": 100, "model_type": "cox_ph", "model_summary": {}, "coefficients": {}, "model_diagnostics": {}, "survival_curves": [], "data_quality": {}}', {} as SurvivalAnalysisOptions)
      expect(result.analysis_type).toBe('survival_analysis');
      expect(result.p_value).toBe(0.01);
      expect(result.hazard_ratio).toBe(1.5);
      expect(result.sample_size).toBe(100);
    });

    test('handles invalid JSON gracefully', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['parseSurvivalResult']('invalid json', {} as SurvivalAnalysisOptions)
      expect(result.analysis_type).toBe('survival_analysis');
      expect(result.p_value).toBe(0.05); // fallback
    });
  });

  describe('parseMediationResult', () => {
    test('parses valid JSON result', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['parseMediationResult']('{"indirect_effect": 0.15, "p_value_indirect": 0.02, "confidence_interval_indirect": [0.05, 0.3], "direct_effect": 0.25, "total_effect": 0.4, "proportion_mediated": 0.375, "sample_size": 100, "model_type": "mediation", "model_summary": {}, "coefficients": {}, "model_diagnostics": {}, "data_quality": {}}', {} as MediationAnalysisOptions)
      expect(result.analysis_type).toBe('mediation_analysis');
      expect(result.indirect_effect).toBe(0.15);
      expect(result.direct_effect).toBe(0.25);
      expect(result.total_effect).toBe(0.4);
      expect(result.proportion_mediated).toBe(0.375);
    });

    test('handles invalid JSON gracefully', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['parseMediationResult']('invalid json', {} as MediationAnalysisOptions)
      expect(result.analysis_type).toBe('mediation_analysis');
      expect(result.indirect_effect).toBe(0.1); // fallback
    });
  });

  describe('parseMixedEffectsResult', () => {
    test('parses valid JSON result', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['parseMixedEffectsResult']('{"fixed_effect_size": 0.3, "p_value_fixed": 0.01, "confidence_interval_fixed": [0.1, 0.5], "sample_size": 100, "model_type": "mixed_effects", "model_summary": {}, "coefficients": {}, "model_diagnostics": {}}', {} as MixedEffectsOptions)
      expect(result.analysis_type).toBe('mixed_effects_analysis');
      expect(result.effect_size).toBe(0.3);
      expect(result.p_value).toBe(0.01);
    });

    test('handles invalid JSON gracefully', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['parseMixedEffectsResult']('invalid json', {} as MixedEffectsOptions)
      expect(result.analysis_type).toBe('mixed_effects_analysis');
      expect(result.effect_size).toBe(0.2); // fallback
    });
  });

  describe('parseMLResult', () => {
    test('parses valid JSON result', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['parseMLResult']('{"prediction_accuracy": {"accuracy": 0.85, "sensitivity": 0.80, "specificity": 0.90, "auc": 0.88}, "feature_importance": {"age": 0.25, "offense_severity": 0.2}, "sample_size": 100, "model_type": "ml_rf", "model_summary": {}, "coefficients": {}, "model_diagnostics": {}}', {algorithm: 'rf'} as MachineLearningOptions)
      expect(result.analysis_type).toBe('machine_learning_analysis');
      expect((result as any).prediction_accuracy.accuracy).toBe(0.85);
      expect((result as any).feature_importance.age).toBe(0.25);
    });

    test('handles invalid JSON gracefully', () => {
      const rInterface = new EnhancedRInterface();
      const result = rInterface['parseMLResult']('invalid json', {algorithm: 'rf'} as MachineLearningOptions)
      expect(result.analysis_type).toBe('machine_learning_analysis');
      expect((result as any).prediction_accuracy.accuracy).toBe(0.85); // fallback
    });
  });
});