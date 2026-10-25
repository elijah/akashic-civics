/**
 * Predictive Models Tests
 */

import {
  exponentialSmoothingForecast,
  extrapolateTrend,
  simulateIntervention,
  compareInterventions,
  InterventionScenario,
} from '../predictive_models';

describe('PredictiveModels: exponentialSmoothingForecast', () => {
  it('should return empty forecast for empty input', () => {
    const result = exponentialSmoothingForecast([], 4);
    expect(result.pointForecast).toHaveLength(4);
    expect(result.description).toContain('No historical');
  });

  it('should compute level forecast from historical data', () => {
    const data = [
      { period: 1, value: 10 },
      { period: 2, value: 12 },
      { period: 3, value: 11 },
      { period: 4, value: 13 },
    ];

    const result = exponentialSmoothingForecast(data, 3);

    expect(result.pointForecast).toHaveLength(3);
    expect(result.forecastPeriods).toBe(3);
    expect(result.model).toBe('single exponential smoothing');
  });

  it('should produce confidence intervals that widen with horizon', () => {
    const data = [
      { period: 1, value: 5 },
      { period: 2, value: 6 },
      { period: 3, value: 4 },
      { period: 4, value: 7 },
    ];

    const result = exponentialSmoothingForecast(data, 5);

    expect(result.confidenceInterval.length).toBe(5);
    // First CI should be narrower than last
    const firstWidth = result.confidenceInterval[0].upper - result.confidenceInterval[0].lower;
    const lastWidth = result.confidenceInterval[4].upper - result.confidenceInterval[4].lower;
    expect(lastWidth).toBeGreaterThan(firstWidth);
  });

  it('should compute accuracy metrics', () => {
    const data = [
      { period: 1, value: 10 },
      { period: 2, value: 12 },
      { period: 3, value: 11 },
    ];

    const result = exponentialSmoothingForecast(data, 2);

    expect(result.accuracy.mae).toBeDefined();
    expect(result.accuracy.rmse).toBeDefined();
    expect(result.accuracy.mape).toBeDefined();
  });
});

describe('PredictiveModels: extrapolateTrend', () => {
  it('should return zero values for single-point input', () => {
    const result = extrapolateTrend([{ period: 1, value: 10 }], 3);
    expect(result.currentValue).toBe(10);
    expect(result.trendSlope).toBe(0);
  });

  it('should detect positive trend from increasing series', () => {
    const data = [
      { period: 1, value: 10 },
      { period: 2, value: 12 },
      { period: 3, value: 14 },
      { period: 4, value: 16 },
    ];

    const result = extrapolateTrend(data, 3);

    expect(result.trendSlope).toBeGreaterThan(0);
    expect(result.trendSlope).toBeCloseTo(2, 6);
  });

  it('should detect negative trend from decreasing series', () => {
    const data = [
      { period: 1, value: 16 },
      { period: 2, value: 14 },
      { period: 3, value: 12 },
      { period: 4, value: 10 },
    ];

    const result = extrapolateTrend(data, 3);

    expect(result.trendSlope).toBeLessThan(0);
  });

  it('should produce uncertainty band that widens with horizon', () => {
    const data = [
      { period: 1, value: 10 },
      { period: 2, value: 11 },
      { period: 3, value: 12 },
      { period: 4, value: 13 },
    ];

    const result = extrapolateTrend(data, 5);

    expect(result.uncertaintyBand.length).toBe(5);
    const firstWidth = result.uncertaintyBand[0].upper - result.uncertaintyBand[0].lower;
    const lastWidth = result.uncertaintyBand[4].upper - result.uncertaintyBand[4].lower;
    expect(lastWidth).toBeGreaterThan(firstWidth);
  });
});

describe('PredictiveModels: simulateIntervention', () => {
  it('should return intervention with baseline comparison', () => {
    const baselineForecast = [
      { period: 1, value: 10 },
      { period: 2, value: 11 },
      { period: 3, value: 12 },
      { period: 4, value: 13 },
    ];

    const result = simulateIntervention(
      baselineForecast,
      2,
      0.1,
      3
    );

    expect(result.baselineOutcome).toHaveLength(4);
    expect(result.projectedOutcome).toHaveLength(4);
    expect(result.impactReduction).toBeGreaterThan(0);
    expect(result.confidenceInterval).toHaveLength(2);
  });

  it('should reduce values after intervention period', () => {
    const baseline = [
      { period: 1, value: 5 },
      { period: 2, value: 5 },
      { period: 3, value: 5 },
    ];

    const result = simulateIntervention(baseline, 2, 1.0, 2);

    // Period 1: baseline only
    expect(result.projectedOutcome[0].value).toBe(5);
    // Period 2: intervention starts, full effect
    expect(result.projectedOutcome[1].value).toBe(4);
    // Period 3: intervention, half effect left
    expect(result.projectedOutcome[2].value).toBeCloseTo(4.5, 10);
  });

  it('should have effect decay over time', () => {
    const baseline = Array(10).fill(null).map((_, i) => ({ period: i + 1, value: 10 }));

    const result = simulateIntervention(baseline, 5, 2.0, 5);

    // After persistencePeriods, effect should be 0
    const afterEffect = result.projectedOutcome[9].value;
    expect(afterEffect).toBeCloseTo(10, 1);
  });
});

describe('PredictiveModels: compareInterventions', () => {
  it('should return null for empty scenarios', () => {
    const result = compareInterventions([]);
    expect(result.bestScenario).toBeNull();
    expect(result.worstScenario).toBeNull();
    expect(result.averageImpact).toBe(0);
  });

  it('should identify best scenario by impact reduction', () => {
    const scenarios: InterventionScenario[] = [
      {
        scenarioId: 's1',
        scenarioName: 'Scenario 1',
        description: 'Test 1',
        assumedEffectSize: 0.5,
        projectedOutcome: [{ period: 1, value: 5 }],
        baselineOutcome: [{ period: 1, value: 10 }],
        impactReduction: 5,
        confidenceInterval: [4, 6],
      },
      {
        scenarioId: 's2',
        scenarioName: 'Scenario 2',
        description: 'Test 2',
        assumedEffectSize: 0.1,
        projectedOutcome: [{ period: 1, value: 8 }],
        baselineOutcome: [{ period: 1, value: 10 }],
        impactReduction: 2,
        confidenceInterval: [1, 3],
      },
    ];

    const result = compareInterventions(scenarios);
    expect(result.bestScenario?.impactReduction).toBe(5);
    expect(result.worstScenario?.impactReduction).toBe(2);
    expect(result.averageImpact).toBeCloseTo(3.5);
  });
});