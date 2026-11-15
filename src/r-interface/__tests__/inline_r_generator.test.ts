/**
 * Test suite for Inline R Generator
 */

import { InlineRGenerator, RScriptContext } from '../inline_r_generator';
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

describe('InlineRGenerator', () => {
  const baseOptions: any = {
    analysisType: 'survival',
    packageUsed: 'survival',
    alpha: 0.05
  };

  describe('generateSurvivalScript', () => {
    test('generates valid R script for Kaplan-Meier', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/mc_test.csv',
        outputFile: '/tmp/mc_output.json',
        options: { ...baseOptions, timeVariable: 'days_to_disposition', eventVariable: 'conviction', groupVariable: 'race_ethnicity', useKaplanMeier: true },
        cases: mockCases
      };

      const script = InlineRGenerator.generateSurvivalScript(context);
      
      expect(script).toContain('library(survival)');
      expect(script).toContain('library(survminer)');
      expect(script).toContain('library(jsonlite)');
      expect(script).toContain('Surv(');
      expect(script).toContain('survfit(');
      expect(script).toContain('survdiff(');
      expect(script).toContain('toJSON(');
      expect(script).toContain('/tmp/mc_output.json');
    });

test('generates valid R script for Cox PH', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/cp_test.csv',
        outputFile: '/tmp/cp_output.json',
        options: { ...baseOptions, timeVariable: 'days_to_disposition', eventVariable: 'conviction', groupVariable: 'race_ethnicity', useKaplanMeier: false, controlVariables: ['age_at_arrest', 'prior_record'], alpha: 0.05 },
        cases: mockCases
      };

      const script = InlineRGenerator.generateSurvivalScript(context);
      
      expect(script).toContain('coxph(');
      // The control variables are interpolated as a JS array in the template
      // Check that the script contains the control variables reference
      expect(script).toContain('opts$controlVariables');
    });

    test('generates valid R script for overall survival without grouping', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/om_test.csv',
        outputFile: '/tmp/om_output.json',
        options: { ...baseOptions, timeVariable: 'days_to_disposition', eventVariable: 'conviction', groupVariable: '', useKaplanMeier: true },
        cases: mockCases
      };

      const script = InlineRGenerator.generateSurvivalScript(context);
      
      expect(script).toContain('surv_obj ~ 1');
      expect(script).toContain('kaplan_meier_overall');
    });
  });

  describe('generateMediationScript', () => {
    test('generates valid R script for mediation analysis', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/med_test.csv',
        outputFile: '/tmp/med_output.json',
        options: { ...baseOptions, analysisType: 'mediation', packageUsed: 'mediation', treatmentVariable: 'race_ethnicity', mediatorVariable: 'offense_severity', outcomeVariable: 'conviction', covariates: ['age_at_arrest', 'gender'], alpha: 0.05 },
        cases: mockCases
      };

      const script = InlineRGenerator.generateMediationScript(context);
      
      expect(script).toContain('library(mediation)');
      expect(script).toContain('mediate(');
      expect(script).toContain('lm(');
      expect(script).toContain('indirect_effect');
      expect(script).toContain('direct_effect');
      expect(script).toContain('proportion_mediated');
    });

    test('handles empty covariates', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/med_empty_test.csv',
        outputFile: '/tmp/med_empty_output.json',
        options: { ...baseOptions, analysisType: 'mediation', packageUsed: 'mediation', treatmentVariable: 'race_ethnicity', mediatorVariable: 'offense_severity', outcomeVariable: 'conviction', covariates: [] },
        cases: mockCases
      };

      const script = InlineRGenerator.generateMediationScript(context);
      
      expect(script).toContain('covariates <- NULL');
    });
  });

  describe('generateMixedEffectsScript', () => {
    test('generates valid R script for mixed-effects analysis', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/me_test.csv',
        outputFile: '/tmp/me_output.json',
        options: { ...baseOptions, analysisType: 'mixedEffects', packageUsed: 'lme4', fixedFormula: 'conviction ~ race_ethnicity + age_at_arrest', randomFormula: '1 | jurisdiction_id', family: 'binomial' },
        cases: mockCases
      };

      const script = InlineRGenerator.generateMixedEffectsScript(context);
      
      expect(script).toContain('library(lme4)');
      expect(script).toContain('lmer(');
      expect(script).toContain('VarCorr(');
      expect(script).toContain('random_effects');
      expect(script).toContain('pseudo_r_squared');
    });
  });

  describe('generateMLScript', () => {
    test('generates valid R script for machine learning', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/ml_test.csv',
        outputFile: '/tmp/ml_output.json',
        options: { ...baseOptions, analysisType: 'machineLearning', packageUsed: 'caret', outcomeVariable: 'conviction', algorithm: 'rf', tuneParameters: true, crossValidation: true, folds: 5 },
        cases: mockCases
      };

      const script = InlineRGenerator.generateMLScript(context);
      
      expect(script).toContain('library(caret)');
      expect(script).toContain('trainControl(');
      expect(script).toContain('train(');
      expect(script).toContain('varImp(');
      expect(script).toContain('prediction_accuracy');
      expect(script).toContain('feature_importance');
    });

    test('handles default algorithm', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/ml_default_test.csv',
        outputFile: '/tmp/ml_default_output.json',
        options: { ...baseOptions, analysisType: 'machineLearning', packageUsed: 'caret', outcomeVariable: 'conviction' },
        cases: mockCases
      };

      const script = InlineRGenerator.generateMLScript(context);
      
      expect(script).toContain('algorithm <- "rf"');
    });
  });

  describe('generateCustomScript', () => {
    test('wraps custom R code correctly', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/custom_test.csv',
        outputFile: '/tmp/custom_output.json',
        options: baseOptions,
        cases: mockCases
      };
      const customCode = 'result <- list(custom = "analysis")';
      const script = InlineRGenerator.generateCustomScript(context as any, customCode);
      
      expect(script).toContain('library(jsonlite)');
      expect(script).toContain(customCode);
      expect(script).toContain('/tmp/custom_output.json');
    });
  });

  describe('generateDisparateImpactScript', () => {
    test('generates valid R script for disparate impact', () => {
      const context: RScriptContext = {
        dataFile: '/tmp/di_test.csv',
        outputFile: '/tmp/di_output.json',
        options: baseOptions,
        cases: mockCases
      };
      const script = InlineRGenerator.generateDisparateImpactScript(context as any, 'race_ethnicity', 'conviction', ['age_at_arrest', 'prior_record']);
      
      expect(script).toContain('glm(');
      expect(script).toContain('binomial');
      expect(script).toContain('odds_ratios');
      expect(script).toContain('pseudo_r_squared');
    });
  });
});