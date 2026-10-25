/**
 * Migration Guides
 *
 * Comparison guides for migrating from Stata, SAS, and SPSS
 * to the Akashic Civics platform.
 */

export interface MigrationGuide {
  fromTool: 'stata' | 'sas' | 'spss';
  version: string;
  mappings: ConceptMapping[];
  examples: CodeExample[];
  gotchas: string[];
}

export interface ConceptMapping {
  concept: string;
  stataCommand?: string;
  sasProc?: string;
  spssCommand?: string;
  akashicEquivalent: string;
  notes?: string;
}

export interface CodeExample {
  description: string;
  sourceCode: string;
  akashicCode: string;
  notes?: string;
}

/** Stata to Akashic migration guide */
export const STATA_MIGRATION: MigrationGuide = {
  fromTool: 'stata',
  version: '17+',
  mappings: [
    { concept: 'Load dataset', stataCommand: 'use "data.dta"', akashicEquivalent: 'DataNormalizer.loadFromJSONL()', notes: 'Akashic uses JSONL/CSV, not .dta binary format' },
    { concept: 'Descriptive statistics', stataCommand: 'summarize', akashicEquivalent: 'computeDescriptiveStatistics()', notes: 'Returns structured object with conviction_rate, avg_sentence_months, demographic_distribution' },
    { concept: 'Tabulate frequencies', stataCommand: 'tabulate race', akashicEquivalent: 'stats.demographic_distribution', notes: 'Pre-computed in descriptive statistics' },
    { concept: 'Cross-tabulation', stataCommand: 'tabulate race conviction', akashicEquivalent: 'cases.reduce() with groupBy', notes: 'Use reduce/groupBy for custom cross-tabs' },
    { concept: 'Linear regression (OLS)', stataCommand: 'regress y x1 x2', akashicEquivalent: 'runOLSRegression(cases, ["x1", "x2"])', notes: 'Returns coefficients, intercept, r_squared, p_values' },
    { concept: 'Logistic regression', stataCommand: 'logit y x1 x2', akashicEquivalent: 'LogisticRegression.fit()', notes: 'Currently uses OLS with binary outcome; true logit in development' },
    { concept: 'Cox proportional hazards', stataCommand: 'stcox x1 x2', akashicEquivalent: 'SurvivalAnalysis.coxPH()', notes: 'Full Cox model with time-varying covariates supported' },
    { concept: 'Kaplan-Meier survival', stataCommand: 'sts graph', akashicEquivalent: 'SurvivalAnalysis.kaplanMeier()', notes: 'Returns survival curve, median survival, confidence intervals' },
    { concept: 'Propensity score matching', stataCommand: 'psmatch2', akashicEquivalent: 'CausalInference.propensityScoreMatch()', notes: 'Supports nearest-neighbor, caliper, and kernel matching' },
    { concept: 'Difference-in-differences', stataCommand: 'reg y treat post treat#post', akashicEquivalent: 'CausalInference.diffInDiff()', notes: 'Automatic parallel trends testing included' },
    { concept: 'Fixed effects panel', stataCommand: 'xtreg y x, fe', akashicEquivalent: 'runOLSRegression() with entity dummies', notes: 'Manual dummy creation or use MixedEffectsModel' },
    { concept: 'Multiple imputation', stataCommand: 'mi impute', akashicEquivalent: 'DataNormalizer.imputeMissing()', notes: 'Supports MICE, mean, median, mode imputation' },
    { concept: 'Survey weights', stataCommand: 'svyset', akashicEquivalent: 'AnalyzeOptions.weights', notes: 'Pass weights array to any analysis function' },
    { concept: 'Bootstrap standard errors', stataCommand: 'bootstrap', akashicEquivalent: 'StatisticalTesting.bootstrap()', notes: 'Generic bootstrap for any statistic' },
    { concept: 'Margins/predicted values', stataCommand: 'margins', akashicEquivalent: 'Model.predict() with newdata', notes: 'Generate predictions for counterfactual scenarios' }
  ],
  examples: [
    {
      description: 'Basic regression with robust SEs',
      sourceCode: `use "sentencing.dta", clear
regress sentence_months i.race offense_severity prior_convictions, vce(robust)`,
      akashicCode: `import { runOLSRegression, computeDescriptiveStatistics } from 'akashic-civics/statistical';

const stats = computeDescriptiveStatistics(cases);
const regression = runOLSRegression(cases, [
  'race_ethnicity',
  'offense_severity',
  'prior_convictions'
]);
console.log('Coefficients:', regression.coefficients);
console.log('R-squared:', regression.r_squared);`,
      notes: 'Robust SEs are automatic in Akashic; no vce() option needed'
    },
    {
      description: 'Logistic regression with marginal effects',
      sourceCode: `logit convicted i.race offense_severity
margins, dydx(*)`,
      akashicCode: `import { runOLSRegression } from 'akashic-civics/statistical';

const regression = runOLSRegression(cases, [
  'race_ethnicity',
  'offense_severity'
]);
// For marginal effects, use the coefficients directly
// True logit with marginal effects coming in v1.13`,
      notes: 'OLS on binary outcome approximates linear probability model; true logit in roadmap'
    }
  ],
  gotchas: [
    'Stata uses 1-based indexing; Akashic uses 0-based',
    'Stata missing values are .; Akashic uses null/undefined',
    'Stata factor variables (i.race) must be expanded manually or use dummy coding',
    'Akashic does not have a direct .dta reader - convert to JSONL/CSV first',
    'Survey design features (svy:) require explicit weight passing in Akashic'
  ]
};

/** SAS to Akashic migration guide */
export const SAS_MIGRATION: MigrationGuide = {
  fromTool: 'sas',
  version: '9.4+',
  mappings: [
    { concept: 'Load dataset', sasProc: 'PROC IMPORT', akashicEquivalent: 'DataNormalizer.loadFromCSV()', notes: 'SAS PROC IMPORT -> Akashic CSV/JSONL loaders' },
    { concept: 'Descriptive statistics', sasProc: 'PROC MEANS', akashicEquivalent: 'computeDescriptiveStatistics()', notes: 'PROC MEANS -> descriptive stats object' },
    { concept: 'Frequency tables', sasProc: 'PROC FREQ', akashicEquivalent: 'demographic_distribution', notes: 'PROC FREQ tables are pre-computed' },
    { concept: 'Linear regression', sasProc: 'PROC REG', akashicEquivalent: 'runOLSRegression()', notes: 'PROC REG -> OLS with full diagnostics' },
    { concept: 'Logistic regression', sasProc: 'PROC LOGISTIC', akashicEquivalent: 'LogisticRegression.fit()', notes: 'PROC LOGISTIC -> logistic regression with odds ratios' },
    { concept: 'Cox regression', sasProc: 'PROC PHREG', akashicEquivalent: 'SurvivalAnalysis.coxPH()', notes: 'PROC PHREG -> Cox PH model with time-varying covariates' },
    { concept: 'Survival analysis', sasProc: 'PROC LIFETEST', akashicEquivalent: 'SurvivalAnalysis.kaplanMeier()', notes: 'PROC LIFETEST -> Kaplan-Meier with log-rank test' },
    { concept: 'Mixed models', sasProc: 'PROC MIXED', akashicEquivalent: 'MixedEffectsModel.fit()', notes: 'PROC MIXED -> linear mixed models with REML' },
    { concept: 'Generalized linear models', sasProc: 'PROC GENMOD', akashicEquivalent: 'GLM.fit()', notes: 'PROC GENMOD -> GLM with various link functions' },
    { concept: 'Propensity scoring', sasProc: 'PROC PSMATCH', akashicEquivalent: 'CausalInference.propensityScoreMatch()', notes: 'PROC PSMATCH -> PS matching with balance diagnostics' },
    { concept: 'Multiple imputation', sasProc: 'PROC MI', akashicEquivalent: 'DataNormalizer.imputeMissing()', notes: 'PROC MI -> MICE imputation' },
    { concept: 'Survey analysis', sasProc: 'PROC SURVEYREG', akashicEquivalent: 'runOLSRegression() with weights', notes: 'Survey weights passed as array parameter' }
  ],
  examples: [
    {
      description: 'PROC REG with class variables',
      sourceCode: `PROC REG DATA=sentencing;
CLASS race offense_severity;
MODEL sentence_months = race offense_severity prior_convictions / SOLUTION;
RUN;`,
      akashicCode: `import { runOLSRegression } from 'akashic-civics/statistical';

const regression = runOLSRegression(cases, [
  'race_ethnicity',
  'offense_severity',
  'prior_convictions'
]);
console.log('Coefficients:', regression.coefficients);`,
      notes: 'CLASS variables are handled automatically by string predictors'
    },
    {
      description: 'PROC PHREG for survival',
      sourceCode: `PROC PHREG DATA=sentencing;
CLASS race;
MODEL days_to_disposition * conviction(0) = race offense_severity;
RUN;`,
      akashicCode: `import { SurvivalAnalysis } from 'akashic-civics/statistical';

const survival = new SurvivalAnalysis();
const cox = survival.coxPH(cases, {
  timeVar: 'days_to_disposition',
  eventVar: 'conviction',
  predictors: ['race_ethnicity', 'offense_severity']
});
console.log('Hazard ratios:', cox.hazardRatios);`,
      notes: 'Event coding: 1=event, 0=censored (opposite of SAS)'
    }
  ],
  gotchas: [
    'SAS CLASS variables create dummy coding automatically; Akashic uses string predictor names',
    'SAS PROC PHREG uses 0=censored, 1=event; Akashic uses 1=event, 0=censored',
    'SAS date values are numeric; Akashic expects ISO strings or epoch milliseconds',
    'ODS output in SAS is replaced by JSON/structured objects in Akashic'
  ]
};

/** SPSS to Akashic migration guide */
export const SPSS_MIGRATION: MigrationGuide = {
  fromTool: 'spss',
  version: '27+',
  mappings: [
    { concept: 'Load dataset', spssCommand: 'GET FILE', akashicEquivalent: 'DataNormalizer.loadFromCSV()', notes: 'GET FILE -> loadFromJSONL/loadFromCSV' },
    { concept: 'Descriptive statistics', spssCommand: 'DESCRIPTIVES', akashicEquivalent: 'computeDescriptiveStatistics()', notes: 'DESCRIPTIVES -> descriptive stats object' },
    { concept: 'Frequencies', spssCommand: 'FREQUENCIES', akashicEquivalent: 'demographic_distribution', notes: 'FREQUENCIES -> pre-computed in descriptive stats' },
    { concept: 'Crosstabs', spssCommand: 'CROSSTABS', akashicEquivalent: 'custom groupBy/reduce', notes: 'CROSSTABS -> manual aggregation or pivot tables' },
    { concept: 'Linear regression', spssCommand: 'REGRESSION', akashicEquivalent: 'runOLSRegression()', notes: 'REGRESSION -> OLS with full output' },
    { concept: 'Logistic regression', spssCommand: 'LOGISTIC REGRESSION', akashicEquivalent: 'LogisticRegression.fit()', notes: 'LOGISTIC REGRESSION -> binary logit with odds ratios' },
    { concept: 'Cox regression', spssCommand: 'COXREG', akashicEquivalent: 'SurvivalAnalysis.coxPH()', notes: 'COXREG -> Cox PH model' },
    { concept: 'Kaplan-Meier', spssCommand: 'KM', akashicEquivalent: 'SurvivalAnalysis.kaplanMeier()', notes: 'KM -> Kaplan-Meier with log-rank test' },
    { concept: 'Mixed models', spssCommand: 'MIXED', akashicEquivalent: 'MixedEffectsModel.fit()', notes: 'MIXED -> linear mixed models' },
    { concept: 'GLM', spssCommand: 'GENLIN', akashicEquivalent: 'GLM.fit()', notes: 'GENLIN -> generalized linear models' },
    { concept: 'Propensity score', spssCommand: 'PSMATCH', akashicEquivalent: 'CausalInference.propensityScoreMatch()', notes: 'PSMATCH -> propensity score matching' }
  ],
  examples: [
    {
      description: 'REGRESSION with categorical predictors',
      sourceCode: `REGRESSION
  /DEPENDENT sentence_months
  /METHOD=ENTER race offense_severity prior_convictions
  /CAT=INCLUDE race(1) offense_severity(1).`,
      akashicCode: `import { runOLSRegression } from 'akashic-civics/statistical';

const regression = runOLSRegression(cases, [
  'race_ethnicity',
  'offense_severity',
  'prior_convictions'
]);`,
      notes: 'SPSS categorical handling is automatic with string predictors'
    },
    {
      description: 'LOGISTIC REGRESSION',
      sourceCode: `LOGISTIC REGRESSION convicted
  /METHOD=ENTER race offense_severity
  /PRINT=CI(95) ODDS RATIOS.`,
      akashicCode: `import { LogisticRegression } from 'akashic-civics/statistical';

const logit = new LogisticRegression();
const result = logit.fit(cases, {
  outcome: 'conviction',
  predictors: ['race_ethnicity', 'offense_severity']
});
console.log('Odds ratios:', result.oddsRatios);
console.log('95% CI:', result.confidenceIntervals);`,
      notes: 'SPSS /PRINT options map to result object properties'
    }
  ],
  gotchas: [
    'SPSS uses system-missing (.) for missing values; Akashic uses null/undefined',
    'SPSS variable labels are stored in metadata; Akashic uses field names',
    'SPSS syntax is case-insensitive; Akashic TypeScript is case-sensitive',
    'SPSS output is viewer-based; Akashic returns structured JSON objects'
  ]
};

/** Get all migration guides */
export function getAllMigrationGuides(): MigrationGuide[] {
  return [STATA_MIGRATION, SAS_MIGRATION, SPSS_MIGRATION];
}

/** Get specific migration guide */
export function getMigrationGuide(tool: 'stata' | 'sas' | 'spss'): MigrationGuide | undefined {
  return getAllMigrationGuides().find(g => g.fromTool === tool);
}