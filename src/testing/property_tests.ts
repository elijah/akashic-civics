/**
 * Property-Based Testing Framework
 *
 * Uses fast-check for property-based testing of statistical methods.
 * Tests invariants and properties that should hold for all valid inputs.
 */

import * as fc from 'fast-check';

import {
  computeDescriptiveStatistics,
  runOLSRegression,
  calculateEffectSize,
  calculateOddsRatio,
  performTwoProportionZTest,
  CaseStatistics,
  SummaryStatistics,
  OLSRegressionResult,
} from '../statistical/statistical_analysis';

/** Valid race/ethnicity generator */
export const raceGenerator = fc.oneof(
  fc.constant('White'),
  fc.constant('Black'),
  fc.constant('Hispanic'),
  fc.constant('Asian'),
  fc.constant('Native American'),
  fc.constant('Other')
);

/** Valid offense severity generator */
export const severityGenerator = fc.oneof(
  fc.constant('Felony'),
  fc.constant('Misdemeanor'),
  fc.constant('Infraction')
);

/** Generate a single valid CaseStatistics record */
export const caseStatisticsGenerator = fc.record({
  case_id: fc.uuid(),
  conviction: fc.oneof(fc.boolean().map(b => (b ? 1 : 0)), fc.constant(null)),
  sentence_months: fc.oneof(fc.nat(120), fc.constant(null)),
  days_to_disposition: fc.oneof(fc.nat(365), fc.constant(null)),
  race_ethnicity: fc.oneof(raceGenerator, fc.constant(null)),
  offense_severity: fc.oneof(severityGenerator, fc.constant(null)),
  missing_fields: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
});

/** Generate an array of CaseStatistics */
export const caseArrayGenerator = (minLength = 1, maxLength = 1000) =>
  fc.array(caseStatisticsGenerator, { minLength, maxLength });

/** Compute descriptive statistics */
export function computeDescriptiveStats(cases: CaseStatistics[]): SummaryStatistics {
  return computeDescriptiveStatistics(cases);
}

/** Run OLS regression */
export function runOLS(cases: CaseStatistics[], predictors: string[]): OLSRegressionResult {
  return runOLSRegression(cases, predictors);
}

/** Calculate effect size */
export function calcEffectSize(currentRate: number, baselineRate: number): number {
  return calculateEffectSize(currentRate, baselineRate);
}

/** Calculate odds ratio */
export function calcOddsRatio(currentConvictions: number, currentTotal: number, baselineConvictions: number, baselineTotal: number): number {
  return calculateOddsRatio(currentConvictions, currentTotal, baselineConvictions, baselineTotal);
}

/** Perform two-proportion Z-test */
export function zTest(p1: number, n1: number, p2: number, n2: number): { p_value: number; effect_size: number } {
  return performTwoProportionZTest(p1, n1, p2, n2);
}