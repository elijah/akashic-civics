import {
  KaplanMeierEstimator,
  NelsonAalenEstimator,
  LogRankTest,
  CoxPHModel,
  SurvivalStatistics,
  kaplanMeier,
  nelsonAalen,
  logRankTest
} from '../survival_analysis';

describe('KaplanMeierEstimator', () => {
  // Two groups with clearly different survival
  const groupA = {
    time: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    event: [1, 1, 0, 1, 0, 1, 0, 1, 0, 1]
  };

  test('should compute a survival curve', () => {
    const result = kaplanMeier(groupA);
    expect(result.time.length).toBeGreaterThan(0);
    expect(result.survival.length).toBe(result.time.length);
  });

  test('should start survival at 1.0 and be monotonically decreasing', () => {
    const result = kaplanMeier(groupA);
    expect(result.survival[0]).toBeLessThanOrEqual(1);
    for (let i = 1; i < result.survival.length; i++) {
      expect(result.survival[i]).toBeLessThanOrEqual(result.survival[i - 1]);
    }
  });

  test('should compute number at risk and events', () => {
    const result = kaplanMeier(groupA);
    expect(result.n_at_risk.length).toBe(result.time.length);
    expect(result.n_events.length).toBe(result.time.length);
    // At risk should be non-increasing
    for (let i = 1; i < result.n_at_risk.length; i++) {
      expect(result.n_at_risk[i]).toBeLessThanOrEqual(result.n_at_risk[i - 1]);
    }
  });

  test('should compute confidence intervals', () => {
    const result = kaplanMeier(groupA);
    expect(result.confidence_interval.lower.length).toBe(result.survival.length);
    expect(result.confidence_interval.upper.length).toBe(result.survival.length);
    for (let i = 0; i < result.survival.length; i++) {
      expect(result.confidence_interval.lower[i]).toBeLessThanOrEqual(result.survival[i]);
      expect(result.confidence_interval.upper[i]).toBeGreaterThanOrEqual(result.survival[i]);
    }
  });

  test('should handle empty data', () => {
    const result = kaplanMeier({ time: [], event: [] });
    expect(result.time.length).toBe(0);
    expect(result.survival.length).toBe(0);
  });

  test('class-based estimator should match convenience function', () => {
    const viaClass = new KaplanMeierEstimator(groupA).fit();
    const viaFunc = kaplanMeier(groupA);

    expect(viaClass.time.length).toBe(viaFunc.time.length);
    expect(viaClass.survival[0]).toBeCloseTo(viaFunc.survival[0], 10);
  });
});

describe('NelsonAalenEstimator', () => {
  test('should compute cumulative hazard', () => {
    const result = nelsonAalen({
      time: [1, 2, 3, 4, 5],
      event: [1, 1, 0, 1, 0]
    });
    expect(result.time.length).toBeGreaterThan(0);
    expect(result.cumulative_hazard.length).toBe(result.time.length + 1);
    expect(result.cumulative_hazard[0]).toBe(0);
  });

  test('cumulative hazard should be non-decreasing', () => {
    const result = nelsonAalen({
      time: [1, 2, 3, 4, 5],
      event: [1, 1, 0, 1, 0]
    });
    for (let i = 1; i < result.cumulative_hazard.length; i++) {
      expect(result.cumulative_hazard[i]).toBeGreaterThanOrEqual(result.cumulative_hazard[i - 1]);
    }
  });

  test('class-based estimator should match convenience function', () => {
    const data = { time: [1, 2, 3, 4, 5], event: [1, 1, 0, 1, 0] };
    const viaClass = new NelsonAalenEstimator(data).fit();
    const viaFunc = nelsonAalen(data);

    expect(viaClass.time.length).toBe(viaFunc.time.length);
    expect(viaClass.cumulative_hazard[viaClass.cumulative_hazard.length - 1])
      .toBeCloseTo(viaFunc.cumulative_hazard[viaFunc.cumulative_hazard.length - 1], 10);
  });
});

describe('LogRankTest', () => {
  test('should detect significant difference between groups', () => {
    const group1 = {
      time: [1, 2, 3, 4, 5, 6, 7, 8],
      event: [1, 1, 1, 1, 1, 1, 1, 1]
    };
    const group2 = {
      time: [1, 2, 3, 4, 5, 6, 7, 8],
      event: [0, 0, 0, 0, 0, 0, 0, 0]
    };

    const result = logRankTest(group1, group2);
    expect(result.df).toBe(1);
    expect(result.chi_square).toBeGreaterThan(0);
    expect(result.p_value).toBeGreaterThanOrEqual(0);
    expect(result.p_value).toBeLessThanOrEqual(1);
  });

  test('should not detect difference between identical groups', () => {
    const group = {
      time: [1, 2, 3, 4, 5],
      event: [1, 0, 1, 0, 1]
    };

    const result = logRankTest(group, { ...group });
    expect(result.chi_square).toBeCloseTo(0, 5);
  });

  test('should require at least 2 groups', () => {
    expect(() => logRankTest({ time: [1], event: [1] })).toThrow();
  });

  test('should compute observed and expected events', () => {
    const group1 = { time: [1, 2, 3], event: [1, 1, 0] };
    const group2 = { time: [1, 2, 3], event: [0, 0, 1] };

    const result = LogRankTest.compare(group1, group2);
    expect(result.observed_events.length).toBe(2);
    expect(result.expected_events.length).toBe(2);
  });
});

describe('CoxPHModel', () => {
  test('should fit a model', () => {
    const data = [
      { time: 1, event: 1, features: [1] },
      { time: 2, event: 0, features: [0] },
      { time: 3, event: 1, features: [1] },
      { time: 4, event: 1, features: [1] },
      { time: 5, event: 0, features: [0] }
    ];

    const model = new CoxPHModel();
    const result = model.fit(data, ['x1']);
    expect(result.coefficients.length).toBe(1);
    expect(result.se.length).toBe(1);
    expect(result.z.length).toBe(1);
    expect(result.p.length).toBe(1);
  });
});

describe('SurvivalStatistics', () => {
  test('should compute median survival', () => {
    const median = SurvivalStatistics.medianSurvival(
      [1, 2, 3, 4, 5],
      [1, 1, 1, 1, 1]
    );
    expect(median).not.toBeNull();
    expect(median!).toBeGreaterThan(0);
  });

  test('should compute cumulative incidence', () => {
    const result = SurvivalStatistics.cumulativeIncidence(
      [1, 2, 3, 4, 5],
      [1, 1, 1, 1, 1]
    );
    expect(result.incidence.length).toBe(result.time.length);
    expect(result.incidence[0]).toBeGreaterThan(0);
  });

  test('should compute restricted mean survival time', () => {
    const rmst = SurvivalStatistics.restrictedMeanSurvival(
      [1, 2, 3, 4, 5],
      [1, 1, 1, 1, 1],
      5
    );
    expect(rmst).toBeGreaterThan(0);
  });
});
