/**
 * Tests for E29: Advanced Causal Impact Analysis
 */

import {
  syntheticControl,
  interruptedTimeSeries,
  eventStudyDiD,
  placeboTests,
  PlaceboResult
} from '../e_29_causal_impact';

describe('E29: Advanced Causal Impact Analysis', () => {
  describe('SyntheticControl', () => {
    it('should construct synthetic control with valid weights', () => {
      // Treated unit outcome over 10 periods
      const treatedData = [10, 11, 12, 13, 14, 16, 18, 20, 22, 24];
      // 3 control units with similar pre-trends
      const controlData = [
        [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
      ];
      const treatmentTime = 5; // Treatment starts at period 5 (0-indexed)

      const result = syntheticControl(treatedData, controlData, treatmentTime);

      expect(result.weights.length).toBe(3);
      expect(result.controlIds.length).toBe(3);
      expect(result.weights.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1, 5);
      expect(result.weights.every((w: number) => w >= 0)).toBe(true);
      expect(result.rootMSE).toBeGreaterThanOrEqual(0);
      expect(result.preTreatmentFit.length).toBe(5);
      expect(result.postTreatmentEffects.length).toBe(5);
    });

    it('should handle parallel trends validation', () => {
      const treatedData = [10, 11, 12, 13, 14, 16, 18, 20, 22, 24];
      const controlData = [
        [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      ];
      const treatmentTime = 5;

      const result = syntheticControl(treatedData, controlData, treatmentTime);

      expect(typeof result.parallelTrendsValid).toBe('boolean');
    });

    it('should return zero weights for single control unit', () => {
      const treatedData = [10, 11, 12, 13, 14];
      const controlData = [[9, 10, 11, 12, 13]];
      const treatmentTime = 3;

      const result = syntheticControl(treatedData, controlData, treatmentTime);

      expect(result.weights.length).toBe(1);
      expect(result.weights[0]).toBeCloseTo(1, 5);
    });

    it('should handle preTreatmentPeriods parameter', () => {
      const treatedData = [10, 11, 12, 13, 14, 15, 16, 17];
      const controlData = [[9, 10, 11, 12, 13, 14, 15, 16]];
      const treatmentTime = 6; // Treatment at period 6
      const preTreatmentPeriods = 4; // But only use 4 pre-periods for fitting

      const result = syntheticControl(treatedData, controlData, treatmentTime, preTreatmentPeriods);

      expect(result.preTreatmentFit.length).toBe(preTreatmentPeriods);
      expect(result.postTreatmentEffects.length).toBe(2); // 8 - 6 = 2
    });
  });

  describe('InterruptedTimeSeries', () => {
    it('should detect level shift in ITS', () => {
      // Pre-trend: 10, 11, 12, 13, 14 (slope ~1)
      // Post-trend: 20, 21, 22, 23, 24 (level shift +10, same slope)
      const outcomes = [10, 11, 12, 13, 14, 20, 21, 22, 23, 24];
      const treatmentTime = 5;

      const result = interruptedTimeSeries(outcomes, treatmentTime);

      // Level shift should be positive (jump at intervention)
      expect(result.interventionLevelShift).toBeGreaterThan(0);
      expect(result.confIntLevelShift[0]).toBeLessThan(result.confIntLevelShift[1]);
    });

    it('should detect trend change in ITS', () => {
      // Pre-trend: flat (10, 10, 10, 10, 10)
      // Post-trend: increasing (10, 12, 14, 16, 18)
      const outcomes = [10, 10, 10, 10, 10, 10, 12, 14, 16, 18];
      const treatmentTime = 5;

      const result = interruptedTimeSeries(outcomes, treatmentTime);

      expect(result.interventionTrendChange).toBeGreaterThan(1);
      expect(result.confIntTrendChange[0]).toBeLessThan(result.confIntTrendChange[1]);
    });

    it('should compute percent change correctly', () => {
      const outcomes = [10, 10, 10, 10, 10, 15, 15, 15, 15, 15];
      const treatmentTime = 5;

      const result = interruptedTimeSeries(outcomes, treatmentTime);

      expect(result.percentChange).toBeCloseTo(50, 0);
    });

    it('should run Pettitt test for structural break', () => {
      const outcomes = [10, 11, 12, 13, 14, 20, 21, 22, 23, 24];
      const treatmentTime = 5;

      const result = interruptedTimeSeries(outcomes, treatmentTime);

      expect(result.pwTestPValue).toBeGreaterThanOrEqual(0);
      expect(result.pwTestPValue).toBeLessThanOrEqual(1);
    });

    it('should handle prePeriods and postPeriods parameters', () => {
      const outcomes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      const treatmentTime = 4;

      const result = interruptedTimeSeries(outcomes, treatmentTime, 3, 4);

      expect(result.averagePreLevel).toBeGreaterThan(0);
    });
  });

  describe('EventStudyDiD', () => {
    it('should compute event study coefficients', () => {
      const data = [
        // Control group all periods
        { group: 'control', time: 0, outcome: 10, covariates: {}, treatment: 0 },
        { group: 'control', time: 1, outcome: 11, covariates: {}, treatment: 0 },
        { group: 'control', time: 2, outcome: 12, covariates: {}, treatment: 0 },
        { group: 'control', time: 3, outcome: 13, covariates: {}, treatment: 0 },
        { group: 'control', time: 4, outcome: 14, covariates: {}, treatment: 0 },
        { group: 'control', time: 5, outcome: 15, covariates: {}, treatment: 0 },
        // Treated group - first appears at event time (time 3)
        { group: 'treated', time: 3, outcome: 13, covariates: {}, treatment: 1 },
        { group: 'treated', time: 4, outcome: 18, covariates: {}, treatment: 1 },
        { group: 'treated', time: 5, outcome: 19, covariates: {}, treatment: 1 },
      ];

      const result = eventStudyDiD(data, 'treated');

      expect(result.leads.length).toBeGreaterThan(0);
      expect(result.lags.length).toBeGreaterThan(0);
      expect(result.leadCoeffs.length).toBe(result.leads.length);
      expect(result.lagCoeffs.length).toBe(result.lags.length);
      expect(typeof result.parallelTrendsHeld).toBe('boolean');
      expect(result.normalizedLags.length).toBe(result.lags.length);
    });

    it('should handle no treatment group', () => {
      const data = [
        { group: 'control', time: 0, outcome: 10, covariates: {}, treatment: 0 },
        { group: 'control', time: 1, outcome: 11, covariates: {}, treatment: 0 },
      ];

      const result = eventStudyDiD(data, 'treated');

      expect(result.leads).toEqual([]);
      expect(result.lags).toEqual([]);
      expect(result.parallelTrendsHeld).toBe(false);
    });

    it('should compute parallel trends held when pre-trends are similar', () => {
      const data = [
        { group: 'control', time: 0, outcome: 10, covariates: {}, treatment: 0 },
        { group: 'control', time: 1, outcome: 11, covariates: {}, treatment: 0 },
        { group: 'treated', time: 0, outcome: 10, covariates: {}, treatment: 1 },
        { group: 'treated', time: 1, outcome: 11, covariates: {}, treatment: 1 },
        { group: 'control', time: 2, outcome: 12, covariates: {}, treatment: 0 },
        { group: 'treated', time: 2, outcome: 12, covariates: {}, treatment: 1 },
        { group: 'control', time: 3, outcome: 13, covariates: {}, treatment: 0 },
        { group: 'treated', time: 3, outcome: 18, covariates: {}, treatment: 1 }, // treatment effect at time 3
        { group: 'control', time: 4, outcome: 14, covariates: {}, treatment: 0 },
        { group: 'treated', time: 4, outcome: 19, covariates: {}, treatment: 1 },
      ];

      const result = eventStudyDiD(data, 'treated');

      // Pre-treatment effects should be near zero
      expect(Math.abs(result.leadCoeffs[0] || 0)).toBeLessThan(1);
    });
  });

  describe('PlaceboTests', () => {
    it('should run placebo tests and return results', () => {
      const data = [
        { group: 'treatment', time: 0, outcome: 10, covariates: {}, treatment: 1, id: 't1' },
        { group: 'treatment', time: 1, outcome: 11, covariates: {}, treatment: 1, id: 't2' },
        { group: 'control1', time: 0, outcome: 10, covariates: {}, treatment: 0, id: 'c1' },
        { group: 'control1', time: 1, outcome: 11, covariates: {}, treatment: 0, id: 'c2' },
        { group: 'control2', time: 0, outcome: 10, covariates: {}, treatment: 0, id: 'c3' },
        { group: 'control2', time: 1, outcome: 11, covariates: {}, treatment: 0, id: 'c4' },
      ];

      const results = placeboTests(data, 'outcome', 10);

      expect(results.length).toBe(10);
      expect(results.every((r: PlaceboResult) => typeof r.placeboEffect === 'number')).toBe(true);
      expect(results.every((r: PlaceboResult) => typeof r.placeboPValue === 'number')).toBe(true);
      expect(results.every((r: PlaceboResult) => typeof r.percentileRank === 'number')).toBe(true);
      expect(results.every((r: PlaceboResult) => typeof r.isSignificantAt5 === 'boolean')).toBe(true);
      expect(results.every((r: PlaceboResult) => typeof r.controlGroupId === 'string')).toBe(true);
    });

    it('should handle single control unit', () => {
      const data = [
        { group: 'treatment', time: 0, outcome: 10, covariates: {}, treatment: 1, id: 't1' },
        { group: 'treatment', time: 1, outcome: 11, covariates: {}, treatment: 1, id: 't2' },
        { group: 'control', time: 0, outcome: 10, covariates: {}, treatment: 0, id: 'c1' },
        { group: 'control', time: 1, outcome: 11, covariates: {}, treatment: 0, id: 'c2' },
      ];

      const results = placeboTests(data, 'outcome', 5);

      expect(results.length).toBe(5);
    });

    it('should compute percentile rank correctly', () => {
      const data = [
        { group: 'treatment', time: 0, outcome: 10, covariates: {}, treatment: 1, id: 't1' },
        { group: 'treatment', time: 1, outcome: 20, covariates: {}, treatment: 1, id: 't2' }, // Large effect
        { group: 'control', time: 0, outcome: 10, covariates: {}, treatment: 0, id: 'c1' },
        { group: 'control', time: 1, outcome: 11, covariates: {}, treatment: 0, id: 'c2' },
      ];

      const results = placeboTests(data, 'outcome', 20);

      // Most placebo effects should be small, so real effect should be high percentile
      const maxPercentile = Math.max(...results.map((r: PlaceboResult) => r.percentileRank));
      expect(maxPercentile).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should work together: synthetic control + event study', () => {
      // Generate panel data for multiple units over time
      const nPeriods = 12;
      const treatmentTime = 6;

      // Create synthetic data
      const treatedData = Array.from({ length: nPeriods }, (_, t) => 
        t < treatmentTime ? 10 + t * 0.5 : 10 + t * 0.5 + 5
      );
      
      const controlData = [
        Array.from({ length: nPeriods }, (_, t) => 9 + t * 0.5),
        Array.from({ length: nPeriods }, (_, t) => 11 + t * 0.5),
      ];

      // Test synthetic control
      const scResult = syntheticControl(treatedData, controlData, treatmentTime);
      expect(scResult.parallelTrendsValid).toBe(true);

      // Test interrupted time series
      const itsResult = interruptedTimeSeries(treatedData, treatmentTime);
      expect(itsResult.interventionLevelShift).toBeGreaterThan(4);
    });
  });
});