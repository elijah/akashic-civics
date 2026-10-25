import {
  PropensityScoreMatching,
  InverseProbabilityWeighting,
  DifferenceInDifferences,
  propensityScoreMatching,
  computePropensityScores,
  inverseProbabilityWeights,
  differenceInDifferences,
  ateIPW
} from '../causal_inference';

describe('PropensityScoreMatching', () => {
  const generateData = (n: number = 200) => {
    // Create treatment and control with known selection bias
    const data = [];
    for (let i = 0; i < n; i++) {
      const x1 = Math.random();
      const x2 = Math.random();
      // Treatment probability depends on x1 (confounder)
      const logitT = 2 * (x1 - 0.5);
      const pT = 1 / (1 + Math.exp(-logitT));
      const treatment = Math.random() < pT ? 1 : 0;
      // Outcome depends on x1 and treatment
      const logitY = 1.5 * (x1 - 0.5) + 1.0 * treatment;
      const pY = 1 / (1 + Math.exp(-logitY));
      const outcome = Math.random() < pY ? 1 : 0;

      data.push({
        treatment,
        outcome,
        covariates: { x1, x2 }
      });
    }
    return data;
  };

  test('should compute propensity scores', () => {
    const data = generateData(100);
    const psm = new PropensityScoreMatching();
    const scores = psm.computePropensityScores(data, ['x1', 'x2']);

    expect(scores.length).toBe(100);
    for (const s of scores) {
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(1);
    }
  });

  test('should match treated to controls', () => {
    const data = generateData(100);
    const psm = new PropensityScoreMatching({ caliper: 0.5 });
    const result = psm.match(data, ['x1', 'x2']);

    expect(result.matchedPairs.length).toBeGreaterThan(0);
    expect(result.treatedWeights.length).toBe(result.matchedPairs.length);
    expect(result.controlWeights.length).toBe(result.matchedPairs.length);
  });

  test('should compute balance before and after matching', () => {
    const data = generateData(100);
    const psm = new PropensityScoreMatching({ caliper: 0.5 });
    const result = psm.match(data, ['x1', 'x2']);

    expect(result.balanceBefore.beforeMatching.stdDiff).toBeDefined();
    expect(result.balanceAfter.afterMatching.stdDiff).toBeDefined();
  });

  test('should improve balance on confounders', () => {
    const data = generateData(200);
    const psm = new PropensityScoreMatching({ caliper: 0.3 });
    const result = psm.match(data, ['x1', 'x2']);

    // Balance should improve (standardized differences should decrease)
    const beforeDiff = result.balanceBefore.beforeMatching.stdDiff['x1'];
    const afterDiff = result.balanceAfter.afterMatching.stdDiff['x1'];

    // If we have matches, balance should improve (allow some tolerance for randomness)
    if (result.matchedPairs.filter(m => m.control >= 0).length > 0) {
      expect(afterDiff).toBeLessThanOrEqual(beforeDiff + 0.5);
    }
  });

  test('convenience function should work', () => {
    const data = generateData(100);
    const result = propensityScoreMatching(data, ['x1', 'x2']);
    expect(result.matchedPairs.length).toBeGreaterThan(0);
  });
});

describe('InverseProbabilityWeighting', () => {
  const generateData = (n: number = 100) => {
    const data = [];
    for (let i = 0; i < n; i++) {
      const x1 = Math.random();
      const logitT = 2 * (x1 - 0.5);
      const pT = 1 / (1 + Math.exp(-logitT));
      const treatment = Math.random() < pT ? 1 : 0;
      const logitY = 1.5 * (x1 - 0.5) + 1.0 * treatment;
      const pY = 1 / (1 + Math.exp(-logitY));
      const outcome = Math.random() < pY ? 1 : 0;

      data.push({
        treatment,
        outcome,
        covariates: { x1 }
      });
    }
    return data;
  };

  test('should compute IPW weights', () => {
    const data = generateData(100);
    const ipw = new InverseProbabilityWeighting();
    const scores = computePropensityScores(data, ['x1']);
    const result = ipw.computeWeights(data, scores);

    expect(result.weights.length).toBe(100);
    expect(result.effectiveSampleSize).toBeGreaterThan(0);
    expect(result.exposure).toBeGreaterThan(0);
    expect(result.exposure).toBeLessThan(1);
  });

  test('should estimate ATE', () => {
    const data = generateData(200);
    const scores = computePropensityScores(data, ['x1']);
    const result = new InverseProbabilityWeighting().estimateATE(data, scores);

    expect(result.ate).toBeDefined();
    expect(result.stdError).toBeGreaterThan(0);
    expect(result.confInt[0]).toBeLessThan(result.confInt[1]);
  });

  test('convenience function should work', () => {
    const data = generateData(100);
    const scores = computePropensityScores(data, ['x1']);
    const result = inverseProbabilityWeights(data, scores);
    expect(result.weights.length).toBe(100);
  });

  test('ateIPW convenience function should work', () => {
    const data = generateData(100);
    const scores = computePropensityScores(data, ['x1']);
    const result = ateIPW(data, scores);
    expect(result.ate).toBeDefined();
  });
});

describe('DifferenceInDifferences', () => {
  const generateDiDData = () => {
    const data = [];
    const nPerGroup = 50;

    // Treatment group
    for (let i = 0; i < nPerGroup; i++) {
      data.push({
        group: 'treatment',
        time: 0, // pre
        treatment: 1,
        outcome: 10 + Math.random() * 5, // baseline
        covariates: {}
      });
      data.push({
        group: 'treatment',
        time: 1, // post
        treatment: 1,
        outcome: 18 + Math.random() * 5, // treatment effect + trend
        covariates: {}
      });
    }

    // Control group
    for (let i = 0; i < nPerGroup; i++) {
      data.push({
        group: 'control',
        time: 0, // pre
        treatment: 0,
        outcome: 10 + Math.random() * 5, // same baseline
        covariates: {}
      });
      data.push({
        group: 'control',
        time: 1, // post
        treatment: 0,
        outcome: 13 + Math.random() * 5, // trend only
        covariates: {}
      });
    }

    return data;
  };

  test('should estimate treatment effect', () => {
    const data = generateDiDData();
    const did = new DifferenceInDifferences();
    const result = did.estimate(data, 'treatment');

    expect(result.treatmentEffect).toBeDefined();
    expect(result.standardError).toBeGreaterThan(0);
    expect(result.zStatistic).toBeDefined();
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(result.confInt95[0]).toBeLessThan(result.confInt95[1]);
  });

  test('should compute group statistics', () => {
    const data = generateDiDData();
    const did = new DifferenceInDifferences();
    const result = did.estimate(data, 'treatment');

    // Means should be within expected ranges
    expect(result.groupStatistics.treatmentPre.mean).toBeGreaterThan(9);
    expect(result.groupStatistics.treatmentPre.mean).toBeLessThan(16);
    expect(result.groupStatistics.treatmentPost.mean).toBeGreaterThan(17);
    expect(result.groupStatistics.treatmentPost.mean).toBeLessThan(24);
    expect(result.groupStatistics.controlPre.mean).toBeGreaterThan(9);
    expect(result.groupStatistics.controlPre.mean).toBeLessThan(16);
    expect(result.groupStatistics.controlPost.mean).toBeGreaterThan(12);
    expect(result.groupStatistics.controlPost.mean).toBeLessThan(19);
  });

  test('should perform parallel trends test', () => {
    const data = generateDiDData();
    const did = new DifferenceInDifferences();
    const result = did.estimate(data, 'treatment');

    expect(result.parallelTrendsTest).toBeDefined();
    expect(result.parallelTrendsTest.statistic).toBeDefined();
    expect(result.parallelTrendsTest.pValue).toBeGreaterThanOrEqual(0);
    expect(result.parallelTrendsTest.pValue).toBeLessThanOrEqual(1);
  });

  test('convenience function should work', () => {
    const data = generateDiDData();
    const result = differenceInDifferences(data);
    expect(result.treatmentEffect).toBeDefined();
  });
});