/**
 * Temporal Tracking for Officials
 * Rolling performance metrics, trend detection, seasonal adjustment
 */

/* ============================================================================
 * Types
 * ============================================================================ */

export interface TimeSeriesPoint {
  period: string | number; // e.g., '2023-Q1', 2023.25, Date
  value: number;
  weight?: number;
}

export interface RollingStats {
  period: string | number;
  mean: number;
  stdDev: number;
  count: number;
  ciLower: number;
  ciUpper: number;
}

export interface TrendResult {
  slope: number;
  intercept: number;
  pValue: number;
  direction: 'improving' | 'worsening' | 'stable';
  confidence: number;
  method: 'theil-sen' | 'ols' | 'mann-kendall';
  rSquared?: number;
}

export interface SeasonalDecomposition {
  trend: TimeSeriesPoint[];
  seasonal: TimeSeriesPoint[];
  residual: TimeSeriesPoint[];
  seasonalStrength: number;
  trendStrength: number;
}

export interface OfficerTemporalProfile {
  officialId: string;
  officialName: string;
  metric: string;
  timeSeries: TimeSeriesPoint[];
  rolling: RollingStats[];
  trend: TrendResult;
  seasonal?: SeasonalDecomposition;
}

/* ============================================================================
 * Rolling Window Computation
 * ============================================================================ */

/**
 * Compute rolling mean and standard deviation over a time series.
 * Uses weighted (or unweighted) normal approximation CI.
 */
export function computeRollingStats(
  series: TimeSeriesPoint[],
  windowSize: number,
  confidence: number = 0.95
): RollingStats[] {
  if (series.length < windowSize) return [];

  const results: RollingStats[] = [];
  const z = zScore(confidence);

  for (let i = windowSize - 1; i < series.length; i++) {
    const window = series.slice(i - windowSize + 1, i + 1);
    const values = window.map(p => p.value);
    const weights = window.map(p => p.weight ?? 1);

    // Weighted mean and variance
    const wSum = weights.reduce((a, b) => a + b, 0);
    const mean = values.reduce((sum, v, i) => sum + v * weights[i], 0) / wSum;

    const variance = weights.reduce((sum, w, i) => sum + w * Math.pow(values[i] - mean, 2), 0) / wSum;
    const stdDev = Math.sqrt(variance);
    const count = values.length;
    const se = stdDev / Math.sqrt(count);

    results.push({
      period: series[i].period,
      mean,
      stdDev,
      count,
      ciLower: mean - z * se,
      ciUpper: mean + z * se,
    });
  }

  return results;
}

/**
 * Compute exponential moving average (EMA) with smoothing factor alpha.
 */
export function computeEMA(series: TimeSeriesPoint[], alpha: number = 0.3): TimeSeriesPoint[] {
  if (series.length === 0) return [];

  const result: TimeSeriesPoint[] = [];
  let ema = series[0].value;
  result.push({ period: series[0].period, value: ema });

  for (let i = 1; i < series.length; i++) {
    ema = alpha * series[i].value + (1 - alpha) * ema;
    result.push({ period: series[i].period, value: ema });
  }

  return result;
}

/* ============================================================================
 * Trend Detection
 * ============================================================================ */

/**
 * Theil-Sen estimator for robust trend slope.
 * Resistant to outliers (median of all pairwise slopes).
 */
export function theilSenSlope(series: TimeSeriesPoint[]): { slope: number; intercept: number } {
  const n = series.length;
  if (n < 2) return { slope: 0, intercept: series[0]?.value ?? 0 };

  const slopes: number[] = [];
  const xVals = series.map((_, i) => i); // ordinal time index

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dy = series[j].value - series[i].value;
      const dx = xVals[j] - xVals[i];
      if (dx !== 0) slopes.push(dy / dx);
    }
  }

  slopes.sort((a, b) => a - b);
  const medianSlope = slopes[Math.floor(slopes.length / 2)];
  const medianIntercept = median(series.map((p, i) => p.value - medianSlope * xVals[i]));

  return { slope: medianSlope, intercept: medianIntercept };
}

/**
 * Mann-Kendall trend test for monotonic trend.
 * Non-parametric, robust to non-normal data.
 */
export function mannKendallTest(series: TimeSeriesPoint[]): {
  tau: number;
  pValue: number;
  direction: 'increasing' | 'decreasing' | 'no trend';
  S: number;
} {
  const n = series.length;
  if (n < 4) return { tau: 0, pValue: 1, direction: 'no trend', S: 0 };

  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = series[j].value - series[i].value;
      if (diff > 0) S++;
      else if (diff < 0) S--;
    }
  }

  // Variance of S (no ties correction for simplicity)
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;

  // Normal approximation
  const z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  let direction: 'increasing' | 'decreasing' | 'no trend' = 'no trend';
  if (pValue < 0.05) {
    direction = S > 0 ? 'increasing' : 'decreasing';
  }

  // Kendall's tau
  const tau = S / (n * (n - 1) / 2);

  return { tau, pValue, direction, S };
}

/**
 * Unified trend detection using multiple methods.
 * Returns consensus direction with confidence.
 */
export function detectTrend(
  series: TimeSeriesPoint[],
  options: { method?: 'theil-sen' | 'ols' | 'mann-kendall'; alpha?: number } = {}
): TrendResult {
  const { method = 'theil-sen', alpha = 0.05 } = options;

  if (series.length < 3) {
    return { slope: 0, intercept: 0, pValue: 1, direction: 'stable', confidence: 0, method };
  }

  let slope = 0, intercept = 0, pValue = 1, rSquared: number | undefined;
  const methodUsed = method;

  if (method === 'ols') {
    const xs = series.map((_, i) => i);
    const ys = series.map(p => p.value);
    // Simple linear regression: y = intercept + slope * x
    const n = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    const covXY = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
    const varX = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
    slope = varX > 0 ? covXY / varX : 0;
    intercept = meanY - slope * meanX;
    const ssTot = ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
    const ssRes = ys.reduce((sum, y, i) => sum + (y - (intercept + slope * xs[i])) ** 2, 0);
    rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const seSlope = varX > 0 ? Math.sqrt(ssRes / (n - 2) / varX) : 0;
    pValue = 2 * (1 - normalCDF(Math.abs(slope / seSlope)));
  } else if (method === 'theil-sen') {
    const ts = theilSenSlope(series);
    slope = ts.slope;
    intercept = ts.intercept;
    // Approximate p-value via bootstrap or use Mann-Kendall
    const mk = mannKendallTest(series);
    pValue = mk.pValue;
  } else { // mann-kendall
    const mk = mannKendallTest(series);
    pValue = mk.pValue;
    slope = mk.direction === 'increasing' ? 1 : mk.direction === 'decreasing' ? -1 : 0;
    intercept = series[0].value;
  }

  let direction: TrendResult['direction'] = 'stable';
  if (pValue < alpha) {
    direction = slope > 0 ? 'worsening' : 'improving';
  }
  // For disparity metrics, "improving" means disparity decreasing
  // The user can invert if their metric is "good when higher"

  const confidence = Math.max(0, 1 - pValue);

  return { slope, intercept, pValue, direction, confidence, method: methodUsed, rSquared };
}

/* ============================================================================
 * Seasonal Adjustment (Simple Decomposition)
 * ============================================================================ */

/**
 * Naive seasonal decomposition for quarterly/monthly data.
 * Periods must be evenly spaced and ordered.
 */
export function decomposeSeasonal(
  series: TimeSeriesPoint[],
  seasonLength: number = 4 // 4 for quarterly, 12 for monthly
): SeasonalDecomposition {
  if (series.length < 2 * seasonLength) {
    return {
      trend: [], seasonal: [], residual: [],
      seasonalStrength: 0, trendStrength: 0,
    };
  }

  const values = series.map(p => p.value);
  const periods = series.map(p => p.period);

  // Step 1: Trend via moving average (centered)
  const trend = movingAverage(values, seasonLength);

  // Step 2: Detrend
  const detrended = values.map((v, i) => v - (trend[i] ?? v));

  // Step 3: Seasonal indices (average detrended value per season)
  const seasonalIndices = new Array(seasonLength).fill(0);
  const seasonalCounts = new Array(seasonLength).fill(0);

  for (let i = 0; i < detrended.length; i++) {
    const s = i % seasonLength;
    seasonalIndices[s] += detrended[i];
    seasonalCounts[s]++;
  }
  for (let s = 0; s < seasonLength; s++) {
    if (seasonalCounts[s] > 0) seasonalIndices[s] /= seasonalCounts[s];
  }

  // Normalize seasonal indices to sum to zero
  const seasonalMean = seasonalIndices.reduce((a, b) => a + b, 0) / seasonLength;
  for (let s = 0; s < seasonLength; s++) seasonalIndices[s] -= seasonalMean;

  // Step 4: Build seasonal component
  const seasonal = detrended.map((_, i) => seasonalIndices[i % seasonLength]);

  // Step 5: Residual
  const residual = detrended.map((d, i) => d - seasonal[i]);

  // Strength metrics
  const varResidual = variance(residual);
  const varDetrended = variance(detrended);
  const varTrend = variance(trend.filter((v): v is number => v !== undefined));

  const seasonalStrength = 1 - varResidual / varDetrended;
  const trendStrength = 1 - varResidual / varTrend;

  return {
    trend: trend.map((v, i) => ({ period: periods[i], value: v ?? 0 })),
    seasonal: seasonal.map((v, i) => ({ period: periods[i], value: v })),
    residual: residual.map((v, i) => ({ period: periods[i], value: v })),
    seasonalStrength: Math.max(0, Math.min(1, seasonalStrength)),
    trendStrength: Math.max(0, Math.min(1, trendStrength)),
  };
}

/* ============================================================================
 * Officer Temporal Profile Builder
 * ============================================================================ */

/**
 * Build a full temporal profile for an officer on a given metric.
 */
export function buildOfficerTemporalProfile(
  officialId: string,
  officialName: string,
  metric: string,
  timeSeries: TimeSeriesPoint[],
  options: {
    rollingWindow?: number;
    trendMethod?: 'theil-sen' | 'ols' | 'mann-kendall';
    seasonalPeriod?: number;
  } = {}
): OfficerTemporalProfile {
  const { rollingWindow = 4, trendMethod = 'theil-sen', seasonalPeriod = 4 } = options;

  const rolling = computeRollingStats(timeSeries, rollingWindow);
  const trend = detectTrend(timeSeries, { method: trendMethod });
  let seasonal: SeasonalDecomposition | undefined;

  if (timeSeries.length >= 2 * seasonalPeriod) {
    seasonal = decomposeSeasonal(timeSeries, seasonalPeriod);
  }

  return {
    officialId,
    officialName,
    metric,
    timeSeries,
    rolling,
    trend,
    seasonal,
  };
}

/* ============================================================================
 * Helpers
 * ============================================================================ */

function zScore(confidence: number): number {
  // Approximate z-scores for common confidence levels
  if (confidence >= 0.999) return 3.29;
  if (confidence >= 0.99) return 2.576;
  if (confidence >= 0.95) return 1.96;
  if (confidence >= 0.90) return 1.645;
  if (confidence >= 0.80) return 1.282;
  return 1.96;
}

function normalCDF(x: number): number {
  // Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.39894228 * Math.exp(-x * x / 2);
  const prob = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - prob : prob;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function movingAverage(values: number[], window: number): (number | undefined)[] {
  const half = Math.floor(window / 2);
  const result: (number | undefined)[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < half || i >= values.length - half) {
      result.push(undefined);
      continue;
    }
    const slice = values.slice(i - half, i + half + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    result.push(sum / slice.length);
  }

  return result;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
}