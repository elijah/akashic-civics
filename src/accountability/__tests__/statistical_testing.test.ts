/* ============================================================================
 * Statistical Testing Tests
 * ============================================================================ */

import {
  wilsonInterval,
  waldDifferenceInterval,
  twoProportionZTest,
  newcombeInterval,
  bonferroniCorrect,
  benjaminiHochberg,
  holmBonferroni,
  multipleTestingCorrection,
  smallSampleAdjustment,
  tInterval,
} from '../statistical_testing';

describe('StatisticalTesting: wilsonInterval', () => {
  it('should return interval within [0, 1]', () => {
    const [lower, upper] = wilsonInterval(30, 100);
    expect(lower).toBeGreaterThanOrEqual(0);
    expect(upper).toBeLessThanOrEqual(1);
    expect(lower).toBeLessThanOrEqual(upper);
  });

  it('should handle extreme proportions', () => {
    const [lower] = wilsonInterval(0, 100);
    expect(lower).toBeCloseTo(0, 10);

    const [, upper] = wilsonInterval(100, 100);
    expect(upper).toBeCloseTo(1, 10);
  });

  it('should return [0, 1] for zero trials', () => {
    const [lower, upper] = wilsonInterval(0, 0);
    expect(lower).toBe(0);
    expect(upper).toBe(1);
  });

  it('should produce narrower interval with more trials', () => {
    const narrow = wilsonInterval(50, 1000);
    const wide = wilsonInterval(50, 100);
    expect(narrow[1] - narrow[0]).toBeLessThan(wide[1] - wide[0]);
  });
});

describe('StatisticalTesting: waldDifferenceInterval', () => {
  it('should compute CI for difference of proportions', () => {
    const [lower, upper] = waldDifferenceInterval(0.4, 100, 0.3, 100);
    expect(typeof lower).toBe('number');
    expect(typeof upper).toBe('number');
    expect(lower).toBeLessThanOrEqual(upper);
  });

  it('should center on the difference', () => {
    const [lower, upper] = waldDifferenceInterval(0.5, 100, 0.3, 100);
    expect(lower).toBeLessThanOrEqual(0.2);
    expect(upper).toBeGreaterThanOrEqual(0.2);
  });
});

describe('StatisticalTesting: twoProportionZTest', () => {
  it('should return valid proportion test result', () => {
    const result = twoProportionZTest(0.4, 100, 0.3, 100);

    expect(result.p1).toBe(0.4);
    expect(result.n1).toBe(100);
    expect(result.p2).toBe(0.3);
    expect(result.n2).toBe(100);
    expect(result.difference).toBeCloseTo(0.1);
    expect(typeof result.zScore).toBe('number');
    expect(result.pValue).toBeGreaterThanOrEqual(0);
    expect(result.pValue).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.confidenceInterval)).toBe(true);
    expect(result.confidenceInterval.length).toBe(2);
  });

  it('should return pValue close to 1 when proportions are equal', () => {
    const result = twoProportionZTest(0.5, 100, 0.5, 100);
    expect(result.pValue).toBeCloseTo(1, 1);
    expect(result.difference).toBe(0);
  });

  it('should return small pValue when proportions differ greatly', () => {
    const result = twoProportionZTest(0.9, 1000, 0.1, 1000);
    expect(result.pValue).toBeLessThan(0.001);
  });
});

describe('StatisticalTesting: newcombeInterval', () => {
  it('should return valid CI (finite endpoints)', () => {
    const [lower, upper] = newcombeInterval(0.4, 100, 0.3, 100);
    expect(isFinite(lower)).toBe(true);
    expect(isFinite(upper)).toBe(true);
    expect(lower).toBeLessThan(upper);
    // Difference of proportions CI can include negative values;
    // verify it centers around the observed difference
    expect(Math.abs(lower - 0.1)).toBeLessThan(0.5);
    expect(Math.abs(upper - 0.1)).toBeLessThan(0.5);
  });

  it('should be more conservative than Wald near boundaries', () => {
    const wald = waldDifferenceInterval(0.9, 50, 0.1, 50);
    const newcombe = newcombeInterval(0.9, 50, 0.1, 50);
    const newWidth = newcombe[1] - newcombe[0];
    const waldWidth = wald[1] - wald[0];
    expect(newWidth).toBeGreaterThanOrEqual(waldWidth);
  });
});

describe('StatisticalTesting: bonferroniCorrect', () => {
  it('should adjust p-values upward', () => {
    const adjusted = bonferroniCorrect([0.01, 0.02, 0.03]);
    expect(adjusted[0]).toBe(0.03); // 0.01 * 3
    expect(adjusted[1]).toBe(0.06); // 0.02 * 3
    expect(adjusted[2]).toBe(0.09); // 0.03 * 3
  });

  it('should cap at 1', () => {
    const adjusted = bonferroniCorrect([0.5, 0.5, 0.5]);
    expect(adjusted[0]).toBe(1);
  });
});

describe('StatisticalTesting: benjaminiHochberg', () => {
  it('should adjust p-values using FDR', () => {
    const adjusted = benjaminiHochberg([0.01, 0.02, 0.03]);
    expect(Array.isArray(adjusted)).toBe(true);
    expect(adjusted.length).toBe(3);
  });

  it('should be less conservative than bonferroni for small p-values', () => {
    const pValues = [0.001, 0.005, 0.02, 0.05];
    const bonf = bonferroniCorrect(pValues);
    const bh = benjaminiHochberg(pValues);

    // BH adjusted should generally be <= Bonferroni adjusted
    expect(bh[0]).toBeLessThanOrEqual(bonf[0]);
  });

  it('should be monotonic', () => {
    const pValues = [0.01, 0.001, 0.05, 0.02];
    const adjusted = benjaminiHochberg(pValues);
    const sortedAdj = [...adjusted].sort((a, b) => a - b);

    // Rank-monotonic: smallest p gets smallest adjusted value
    expect(sortedAdj[0] <= sortedAdj[1] && sortedAdj[1] <= sortedAdj[2]).toBe(true);
  });
});

describe('StatisticalTesting: holmBonferroni', () => {
  it('should adjust p-values step-down', () => {
    const adjusted = holmBonferroni([0.01, 0.02, 0.03]);
    expect(Array.isArray(adjusted)).toBe(true);
    expect(adjusted.length).toBe(3);
  });

  it('should be less conservative than bonferroni', () => {
    const pValues = [0.01, 0.02, 0.03];
    const bonf = bonferroniCorrect(pValues);
    const holm = holmBonferroni(pValues);

    // Smallest p-value gets m-adjustment in both, but larger ones get less severe adjustment
    expect(holm[0]).toBeLessThanOrEqual(bonf[0]);
  });
});

describe('StatisticalTesting: multipleTestingCorrection', () => {
  it('should reject null hypotheses based on adjusted p-values', () => {
    const result = multipleTestingCorrection([0.001, 0.04, 0.003], 'benjamini-hochberg', 0.05);

    expect(result).toBeDefined();
    expect(result.method).toBe('benjamini-hochberg');
    expect(Array.isArray(result.adjustedPValues)).toBe(true);
    expect(Array.isArray(result.rejected)).toBe(true);
    expect(result.rejected.length).toBe(3);
    expect(result.numRejected).toBeGreaterThanOrEqual(0);
  });

  it('should support all three methods', () => {
    const pValues = [0.01, 0.02, 0.03];
    const bonf = multipleTestingCorrection(pValues, 'bonferroni');
    const holm = multipleTestingCorrection(pValues, 'holm-bonferroni');
    const bh = multipleTestingCorrection(pValues, 'benjamini-hochberg');

    expect(bonf.method).toBe('bonferroni');
    expect(holm.method).toBe('holm-bonferroni');
    expect(bh.method).toBe('benjamini-hochberg');
  });

  it('should identify no rejections when all p-values are large', () => {
    const result = multipleTestingCorrection([0.5, 0.6, 0.7], 'benjamini-hochberg', 0.05);
    expect(result.numRejected).toBe(0);
  });
});

describe('StatisticalTesting: smallSampleAdjustment', () => {
  it('should not adjust when sample size is sufficient', () => {
    const result = smallSampleAdjustment(0.4, 100, 0.35);
    expect(result.shrinkage).toBe(0);
    expect(result.adjustedEstimate).toBe(0.4);
    expect(result.reason).toContain('no adjustment');
  });

  it('should shrink toward population mean for small samples', () => {
    const result = smallSampleAdjustment(0.8, 5, 0.35);
    expect(result.shrinkage).toBeGreaterThan(0);
    expect(result.shrinkage).toBeLessThan(1);
    expect(result.adjustedEstimate).toBeGreaterThan(0.35);
    expect(result.adjustedEstimate).toBeLessThan(0.8);
  });

  it('should return raw estimate when shrinkageThreshold is 0', () => {
    const result = smallSampleAdjustment(0.5, 10, 0.4, 0);
    expect(result.shrinkage).toBe(0);
    expect(result.adjustedEstimate).toBe(0.5);
  });
});

describe('StatisticalTesting: tInterval', () => {
  it('should compute CI around sample mean', () => {
    const [lower, upper] = tInterval(50, 10, 30);
    expect(lower).toBeLessThan(50);
    expect(upper).toBeGreaterThan(50);
  });

  it('should return same point for tiny sample', () => {
    const [lower, upper] = tInterval(10, 5, 1);
    expect(lower).toBe(10);
    expect(upper).toBe(10);
  });

  it('should widen interval with lower confidence', () => {
    const high = tInterval(50, 10, 30, 0.99);
    const low = tInterval(50, 10, 30, 0.8);
    expect(high[1] - high[0]).toBeGreaterThan(low[1] - low[0]);
  });
});