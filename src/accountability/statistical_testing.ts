/**
 * Statistical Testing for Officials
 * Confidence intervals, multiple testing corrections, small-sample methods
 */

/* ============================================================================
 * Types
 * ============================================================================ */

export interface ProportionTest {
  p1: number;
  n1: number;
  p2: number;
  n2: number;
  difference: number;
  zScore: number;
  pValue: number;
  confidenceInterval: [number, number];
}

export interface MultipleTestingCorrection {
  originalPValues: number[];
  adjustedPValues: number[];
  method: 'bonferroni' | 'benjamini-hochberg' | 'benjamini-yekutieli' | 'holm-bonferroni';
  rejected: boolean[];
  numRejected: number;
}

export interface SmallSampleAdjustment {
  rawEstimate: number;
  adjustedEstimate: number;
  shrinkage: number;
  reason: string;
}

/* ============================================================================
 * Confidence Intervals for Proportions
 * ============================================================================ */

/**
 * Wilson score interval for a single proportion.
 * Accurate even for small samples and extreme proportions.
 */
export function wilsonInterval(
  successes: number,
  trials: number,
  confidence: number = 0.95
): [number, number] {
  if (trials === 0) return [0, 1];

  const p = successes / trials;
  const z = zScore(confidence);
  const denom = 1 + z ** 2 / trials;
  const centre = (p + z ** 2 / (2 * trials)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z ** 2 / (4 * trials)) / trials)) / denom;

  return [Math.max(0, centre - margin), Math.min(1, centre + margin)];
}

/**
 * Wald interval for difference of two proportions.
 */
export function waldDifferenceInterval(
  p1: number,
  n1: number,
  p2: number,
  n2: number,
  confidence: number = 0.95
): [number, number] {
  const diff = p1 - p2;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const z = zScore(confidence);
  return [diff - z * se, diff + z * se];
}

/**
 * Two-proportion z-test (Wald).
 */
export function twoProportionZTest(
  p1: number,
  n1: number,
  p2: number,
  n2: number
): ProportionTest {
  const diff = p1 - p2;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const z = se > 0 ? diff / se : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const ci = waldDifferenceInterval(p1, n1, p2, n2);

  return { p1, n1, p2, n2, difference: diff, zScore: z, pValue, confidenceInterval: ci };
}

/**
 * Newcombe (Agresti-Coull) improved interval for difference of proportions.
 * More accurate than Wald near boundaries.
 */
export function newcombeInterval(p1: number, n1: number, p2: number, n2: number, confidence: number = 0.95): [number, number] {
  const [l1, u1] = wilsonInterval(p1 * n1, n1, confidence);
  const [l2, u2] = wilsonInterval(p2 * n2, n2, confidence);
  const diff = p1 - p2;
  const lower = diff - Math.sqrt((p1 - l1) ** 2 + (u2 - p2) ** 2);
  const upper = diff + Math.sqrt((u1 - p1) ** 2 + (p2 - l2) ** 2);
  return [lower, upper];
}

/* ============================================================================
 * Multiple Testing Corrections
 * ============================================================================ */

export function bonferroniCorrect(pValues: number[]): number[] {
  const m = pValues.length;
  return pValues.map(p => Math.min(1, p * m));
}

export function benjaminiHochberg(pValues: number[]): number[] {
  const m = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p - b.p);

  const adjusted = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    const rank = i + 1;
    adjusted[indexed[i].i] = Math.min(1, indexed[i].p * m / rank);
  }

  for (let i = m - 2; i >= 0; i--) {
    const sortedIdx = indexed[i].i;
    const nextSortedIdx = indexed[i + 1].i;
    if (adjusted[sortedIdx] > adjusted[nextSortedIdx]) {
      adjusted[sortedIdx] = adjusted[nextSortedIdx];
    }
  }

  return adjusted;
}

export function holmBonferroni(pValues: number[]): number[] {
  const m = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p - b.p);

  const adjusted = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    const rank = i + 1;
    adjusted[indexed[i].i] = Math.min(1, indexed[i].p * (m - rank + 1));
  }

  for (let i = m - 2; i >= 0; i--) {
    const sortedIdx = indexed[i].i;
    const nextSortedIdx = indexed[i + 1].i;
    if (adjusted[sortedIdx] > adjusted[nextSortedIdx]) {
      adjusted[sortedIdx] = adjusted[nextSortedIdx];
    }
  }

  return adjusted;
}

export function multipleTestingCorrection(
  pValues: number[],
  method: 'bonferroni' | 'benjamini-hochberg' | 'holm-bonferroni' = 'benjamini-hochberg',
  alpha: number = 0.05
): MultipleTestingCorrection {
  let adjusted: number[];
  switch (method) {
    case 'bonferroni':
      adjusted = bonferroniCorrect(pValues);
      break;
    case 'holm-bonferroni':
      adjusted = holmBonferroni(pValues);
      break;
    case 'benjamini-hochberg':
    default:
      adjusted = benjaminiHochberg(pValues);
  }

  const rejected = adjusted.map(p => p < alpha);
  return {
    originalPValues: pValues,
    adjustedPValues: adjusted,
    method,
    rejected,
    numRejected: rejected.filter(r => r).length,
  };
}

/* ============================================================================
 * Small-Sample Adjustments
 * ============================================================================ */

export function smallSampleAdjustment(
  rawEstimate: number,
  sampleSize: number,
  populationEstimate: number,
  shrinkageThreshold: number = 30
): SmallSampleAdjustment {
  if (sampleSize >= shrinkageThreshold) {
    return {
      rawEstimate,
      adjustedEstimate: rawEstimate,
      shrinkage: 0,
      reason: 'Sample size sufficient; no adjustment needed.',
    };
  }

  const shrinkage = Math.max(0, 1 - (shrinkageThreshold - sampleSize) / shrinkageThreshold);
  const adjustedEstimate = rawEstimate * (1 - shrinkage) + populationEstimate * shrinkage;

  return {
    rawEstimate,
    adjustedEstimate,
    shrinkage,
    reason: `Small sample (n=${sampleSize}); shrunk toward population mean by ${(shrinkage * 100).toFixed(0)}%.`,
  };
}

export function tInterval(sampleMean: number, sampleStdDev: number, sampleSize: number, confidence: number = 0.95): [number, number] {
  if (sampleSize < 2) return [sampleMean, sampleMean];

  const df = sampleSize - 1;
  const t = tQuantile(1 - (1 - confidence) / 2, df);
  const se = sampleStdDev / Math.sqrt(sampleSize);

  return [sampleMean - t * se, sampleMean + t * se];
}

/* ============================================================================
 * Helpers
 * ============================================================================ */

function zScore(confidence: number): number {
  if (confidence >= 0.999) return 3.29;
  if (confidence >= 0.99) return 2.576;
  if (confidence >= 0.95) return 1.96;
  if (confidence >= 0.90) return 1.645;
  if (confidence >= 0.80) return 1.282;
  return 1.96;
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.39894228 * Math.exp(-x * x / 2);
  const prob = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - prob : prob;
}

function tQuantile(p: number, df: number): number {
  if (df > 30) return normalQuantile(p);
  const x = normalQuantile(p);
  return x + (x ** 3 + x) / (4 * df) + (5 * x ** 5 + 16 * x ** 3 + 3 * x) / (96 * df ** 2);
}

function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Bisection on normalCDF: robust and monotone for the full range
  let lo = -10;
  let hi = 10;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (normalCDF(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}