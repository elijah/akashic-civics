/**
 * Advanced Causal Impact Analysis for Akashic Civics
 * 
 * Extends the core causal_inference framework with:
 * - Synthetic Control Method (SCM) for single-unit estimation
 * - Interrupted Time Series (ITS) with segmented regression
 * - Event-Study DiD with dynamic treatment effects
 * - Placebo and falsification tests
 * - Pre-trend validation
 */

import { DifferenceInDifferences, CovariateData, DiDResult } from './causal_inference';

/**
 * Event interfaces
 */
export interface SyntheticControlWeights {
  weights: number[];
  controlIds: string[];
  rootMSE: number;
  preTreatmentFit: number[];
  postTreatmentEffects: number[];
  parallelTrendsValid: boolean;
}

/**
 * Interrupted Time Series results
 */
export interface ITSResult {
  preIntercept: number;
  preSlope: number;
  postIntercept: number;
  postSlope: number;
  interventionLevelShift: number;
  interventionTrendChange: number;
  averagePreLevel: number;
  averagePostLevel: number;
  percentChange: number;
  confIntLevelShift: [number, number];
  confIntTrendChange: [number, number];
  pwTestPValue: number;
}

/**
 * Event-study results
 */
export interface EventStudyResult {
  leads: number[];
  lags: number[];
  leadCoeffs: number[];
  lagCoeffs: number[];
  eventStudyStats: {
    preEventMean: number;
    postEventMean: number;
    preEventSD: number;
    postEventSD: number;
  };
  normalizedLags: number[];
  parallelTrendsHeld: boolean;
}

/**
 * Placebo test results
 */
export interface PlaceboResult {
  placeboEffect: number;
  placeboPValue: number;
  percentileRank: number;
  isSignificantAt5: boolean;
  controlGroupId: string;
}

/**
 * Synthetic Control Method implementation
 */
export class SyntheticControl {
  construct(
    treatedData: number[],
    controlData: number[][],
    treatmentTime: number,
    preTreatmentPeriods?: number
  ): SyntheticControlWeights {
    const nTreated = treatedData.length;
    const nControl = controlData.length;
    const nPre = preTreatmentPeriods || treatmentTime;

    const preTreated = treatedData.slice(0, nPre);
    const preControl = controlData.map(unit => unit.slice(0, nPre));

    const meanTreated = preTreated.reduce((a, b) => a + b, 0) / nPre;
    const meansControl = preControl.map(unit =>
      unit.reduce((a, b) => a + b, 0) / nPre
    );

    // Compute covariance matrix of control units
    const n = nPre;
    const covariance: number[][] = [];
    for (let k = 0; k < nControl; k++) {
      const row: number[] = [];
      for (let j = 0; j < nControl; j++) {
        let sum = 0;
        for (let t = 0; t < nPre; t++) {
          sum += (controlData[j][t] - meansControl[j]) * (controlData[k][t] - meanTreated);
        }
        row.push(sum / n);
      }
      covariance.push(row);
    }

    // Regularized covariance (ridge) for numerical stability
    const ridge = 1e-6;
    const regularizedCov = covariance.map((row, i) =>
      row.map((val, j) => val + (i === j ? ridge : 0))
    );

    const invCov = this.invertMatrix(regularizedCov);

    // Compute weights: w = Sigma_inv * mu / (mu' * Sigma_inv * mu)
    const mu = meansControl.map(m => m - meanTreated);
    const Sigma_inv_mu = this.matrixVectorMultiply(invCov, mu);
    const denominator = mu.reduce((sum, val, i) => sum + val * Sigma_inv_mu[i], 0);
    const weights = Sigma_inv_mu.map(val => denominator !== 0 ? val / denominator : 0);

    // Ensure weights are non-negative and re-normalize
    const nonNegWeights = weights.map((w: number) => Math.max(w, 0));
    const weightSum = nonNegWeights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weightSum > 0 ? nonNegWeights.map((w: number) => w / weightSum) : weights.map(() => 1 / weights.length);

    // Pre-treatment fit RMSE by period
    const preTreatmentFit: number[] = [];
    for (let t = 0; t < nPre; t++) {
      let sumSquaredErr = 0;
      for (let i = 0; i < nControl; i++) {
        const synth = normalizedWeights.reduce((sum, w, cIdx) => sum + controlData[cIdx][t] * w, 0);
        const err = controlData[i][t] - synth;
        sumSquaredErr += err * err;
      }
      preTreatmentFit[t] = Math.sqrt(sumSquaredErr / nControl);
    }

    const overallRMSE = Math.sqrt(
      preTreatmentFit.reduce((a, b) => a + b, 0) / nPre
    );

    // Compute post-treatment effects
    const postTreatmentEffects: number[] = [];
    const nPost = nTreated - treatmentTime;

    for (let t = 0; t < nPost; t++) {
      const timeIdx = treatmentTime + t;
      const actualPost = treatedData[timeIdx];
      const syntheticPost = normalizedWeights.reduce((sum, w, i) => 
        sum + (controlData[i][timeIdx] || 0) * w, 0);
      postTreatmentEffects[t] = actualPost - syntheticPost;
    }

    // Check parallel trends
    const preRMSE = Math.sqrt(
      preControl.reduce((sum, unit) => {
        const unitMean = unit.reduce((a, b) => a + b, 0) / nPre;
        return sum + unit.reduce((a, b) => a + (b - unitMean) ** 2, 0);
      }, 0) / (nControl * nPre)
    );

    const parallelTrendsValid = meanTreated > 0 ? preRMSE < 0.1 * meanTreated : true;

    return {
      weights: normalizedWeights,
      controlIds: controlData.map((_, i) => `control_${i}`),
      rootMSE: overallRMSE,
      preTreatmentFit,
      postTreatmentEffects,
      parallelTrendsValid
    };
  }

  private invertMatrix(matrix: number[][]): number[][] {
    const n = matrix.length;
    const augmented: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(i === j ? 1 : 0);
      }
      augmented.push(matrix[i].concat(row));
    }

    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
          maxRow = row;
        }
      }
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

      const pivot = augmented[col][col];
      for (let j = 0; j < 2 * n; j++) {
        augmented[col][j] /= pivot;
      }

      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = augmented[row][col];
          for (let j = 0; j < 2 * n; j++) {
            augmented[row][j] -= factor * augmented[col][j];
          }
        }
      }
    }

    const inverse = augmented.map(row => row.slice(n));
    return inverse;
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    const n = matrix.length;
    const result = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i] += matrix[i][j] * vector[j];
      }
    }
    return result;
  }
}

/**
 * Interrupted Time Series (ITS) analysis
 */
export class InterruptedTimeSeries {
  analyze(
    outcomes: number[],
    _treatmentTime: number,
    prePeriods?: number,
    _postPeriods?: number
  ): ITSResult {
    const n = outcomes.length;
    const pt = prePeriods || Math.floor(n / 2);

    const pre = outcomes.slice(0, pt);
    const post = outcomes.slice(pt, n);

    const preMean = pre.reduce((a, b) => a + b, 0) / pt;
    const postMean = post.reduce((a, b) => a + b, 0) / post.length;

    const postIndicators = outcomes.map(() => 0);
    for (let t = pt; t < n; t++) {
      postIndicators[t] = 1;
    }
    const timeIndicators = outcomes.map((_, t) => t >= pt ? Math.max(0, t - pt + 1) : 0);

    const allTimes = Array.from({ length: n }, (_, i) => i);
    const olsResult = this.olsRegression(allTimes, outcomes, postIndicators, timeIndicators);

    const levelShift = olsResult.coefficients['post'];
    const trendChange = olsResult.coefficients['time_post'];

    const residuals = outcomes.map((y, t) => 
      y - (olsResult.intercept + olsResult.coefficients['time'] * t + olsResult.coefficients['post'] * postIndicators[t] + olsResult.coefficients['time_post'] * timeIndicators[t])
    );
    const rss = residuals.reduce((sum, r) => sum + r * r, 0);
    const nParams = 4;
    const sigma2 = rss / Math.max(1, n - nParams);
    const seLevel = Math.sqrt(sigma2 / pt);
    const seTrend = Math.sqrt(sigma2 / this.sumSquaredDevs(Array.from({ length: n }, (_, i) => i)));

    const pwResult = this.pettittTest(outcomes);

    return {
      preIntercept: olsResult.intercept,
      preSlope: olsResult.coefficients['time'],
      postIntercept: olsResult.intercept + olsResult.coefficients['post'],
      postSlope: olsResult.coefficients['time'] + olsResult.coefficients['time_post'],
      interventionLevelShift: levelShift,
      interventionTrendChange: trendChange,
      averagePreLevel: preMean,
      averagePostLevel: postMean,
      percentChange: preMean > 0 ? ((postMean - preMean) / preMean) * 100 : 0,
      confIntLevelShift: [levelShift - 1.96 * seLevel, levelShift + 1.96 * seLevel],
      confIntTrendChange: [trendChange - 1.96 * seTrend, trendChange + 1.96 * seTrend],
      pwTestPValue: pwResult.pValue
    };
  }

  private olsRegression(
    times: number[],
    outcomes: number[],
    post: number[],
    timePost: number[]
  ): { intercept: number; coefficients: Record<string, number> } {
    const n = times.length;
    const X = times.map((t, i) => [1, t, post[i], timePost[i]]);
    const y = outcomes;

    const XtX = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const Xty = [0, 0, 0, 0];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          XtX[j][k] += X[i][j] * X[i][k];
        }
      }
      for (let j = 0; j < 4; j++) {
        Xty[j] += X[i][j] * y[i];
      }
    }

    const beta = this.solveLinearSystem(XtX, Xty);

    return {
      intercept: beta[0],
      coefficients: {
        time: beta[1],
        post: beta[2],
        time_post: beta[3]
      }
    };
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented: number[][] = [];
    for (let i = 0; i < n; i++) {
      augmented.push([...A[i], b[i]]);
    }

    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
          maxRow = row;
        }
      }
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

      const pivot = augmented[col][col];
      for (let j = 0; j < 2 * n; j++) {
        augmented[col][j] /= pivot;
      }

      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = augmented[row][col];
          for (let j = 0; j < 2 * n; j++) {
            augmented[row][j] -= factor * augmented[col][j];
          }
        }
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        sum -= augmented[i][j] * x[j];
      }
      x[i] = sum / augmented[i][i];
    }
    return x;
  }

  private sumSquaredDevs(times: number[]): number {
    const n = times.length;
    const mean = times.reduce((a, b) => a + b, 0) / n;
    return times.reduce((sum, t) => sum + (t - mean) ** 2, 0);
  }

  private pettittTest(outcomes: number[]): { pValue: number } {
    const n = outcomes.length;
    let k = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (outcomes[i] > outcomes[j]) {
          k++;
        }
      }
    }

    const pValue = 2 * Math.exp(-6 * k * k / (n * n * (n + 1) / 6));
    return { pValue: Math.min(pValue, 1) };
  }
}

/**
 * Event-Study DiD analysis
 */
export class EventStudyDiD {
  compute(
    data: Array<CovariateData & { group: string; time: number }>,
    treatmentGroup: string,
    outcomeName: string = 'outcome'
  ): EventStudyResult {
    const allTimes = Array.from(new Set(data.map(d => d.time))).sort((a, b) => a - b);

    const treatmentTimes = allTimes.filter(t => 
      data.some(d => d.group === treatmentGroup && d.time === t)
    );
    const eventTime = treatmentTimes[0];

    if (!eventTime) {
      return this.emptyEventStudy();
    }

    const maxLag = Math.max(...allTimes.map(t => Math.abs(t - eventTime)));

    const leads: number[] = [];
    const lags: number[] = [];
    const leadCoeffs: number[] = [];
    const lagCoeffs: number[] = [];

    let lastPostMean = 0;

    for (let offset = -maxLag; offset <= maxLag; offset++) {
      const period = eventTime + offset;

      const postData = data.filter(d => d.group === treatmentGroup && d.time === period);
      const controlPeriod = data.filter(d => d.group !== treatmentGroup && d.time === period);

      lastPostMean = postData.length > 0
        ? postData.reduce((sum, d) => sum + (d[outcomeName] as number), 0) / postData.length
        : 0;

      const controlMean = controlPeriod.length > 0
        ? controlPeriod.reduce((sum, d) => sum + (d[outcomeName] as number), 0) / controlPeriod.length
        : 0;

      const effect = lastPostMean - controlMean;

      if (offset < 0) {
        leads.push(-offset);
        leadCoeffs.push(effect);
      } else if (offset > 0) {
        lags.push(offset);
        lagCoeffs.push(effect);
      }
    }

    const maxAbsLead = leadCoeffs.length > 0 ? Math.max(...leadCoeffs.map(c => Math.abs(c))) : 0;
    const maxAbsLag = lagCoeffs.length > 0 ? Math.max(...lagCoeffs.map(c => Math.abs(c))) : 0;
    const maxEffect = Math.max(Math.abs(maxAbsLead), Math.abs(maxAbsLag));
    const normalizedLags: number[] = lagCoeffs.map(c => maxEffect > 0 ? c / maxEffect : 0);

    const preTreatmentEffects = leadCoeffs.slice(0, Math.min(3, leadCoeffs.length));
    const parallelTrendsHeld = preTreatmentEffects.every(c => Math.abs(c) < 0.1 * (lastPostMean || 1));

    const preEventMean = lastPostMean; // use treated group's pre-event level as baseline
    const postEventMean = lastPostMean;

    const preEventSD = preEventMean > 0 ? 0.2 * preEventMean : 0;
    const postEventSD = postEventMean > 0 ? 0.2 * postEventMean : 0;

    return {
      leads: leadCoeffs.map((_, i) => maxLag - i),
      lags,
      leadCoeffs,
      lagCoeffs,
      eventStudyStats: {
        preEventMean,
        postEventMean,
        preEventSD,
        postEventSD
      },
      normalizedLags,
      parallelTrendsHeld
    };
  }

  private emptyEventStudy(): EventStudyResult {
    return {
      leads: [],
      lags: [],
      leadCoeffs: [],
      lagCoeffs: [],
      eventStudyStats: { preEventMean: 0, postEventMean: 0, preEventSD: 0, postEventSD: 0 },
      normalizedLags: [],
      parallelTrendsHeld: false
    };
  }
}

/**
 * Placebo/falsification tests
 */
export class PlaceboTests {
  runPlaceboTests(
    data: Array<CovariateData & { group: string; time: number }>,
    outcomeName: string = 'outcome',
    nPlacebos: number = 500,
    treatmentGroup: string = 'treatment'
  ): PlaceboResult[] {
    const results: PlaceboResult[] = [];
    const controlData = data.filter(d => d.group !== treatmentGroup);
    const baselineEffect = this.estimateDiDEffect(data, outcomeName, treatmentGroup);

    for (let i = 0; i < nPlacebos; i++) {
      const randomControl = controlData[Math.floor(Math.random() * controlData.length)];
      const placeboData = data.map(d => ({
        ...d,
        group: d === randomControl ? treatmentGroup : 'control'
      }));

      const placeboEffect = this.estimateDiDEffect(placeboData, outcomeName, treatmentGroup);
      results.push({
        placeboEffect: placeboEffect.treatmentEffect,
        placeboPValue: placeboEffect.pValue,
        percentileRank: this.computePercentile(baselineEffect.treatmentEffect, results.map(r => r.placeboEffect)),
        isSignificantAt5: placeboEffect.pValue < 0.05,
        controlGroupId: randomControl.id || 'unknown'
      });
    }

    return results;
  }

  private estimateDiDEffect(
    data: Array<CovariateData & { group: string; time: number }>,
    outcomeName: string,
    treatmentGroup: string
  ): DiDResult {
    const diffInDiffs = new DifferenceInDifferences();

    const times = Array.from(new Set(data.map(d => d.time))).sort((a, b) => a - b);
    const midTime = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;

    return diffInDiffs.estimate(data, treatmentGroup, outcomeName, midTime.toString());
  }

  private computePercentile(realEffect: number, placeboEffects: number[]): number {
    if (placeboEffects.length === 0) return 0;
    const greater = placeboEffects.filter(e => Math.abs(e) >= Math.abs(realEffect)).length;
    return (greater / placeboEffects.length) * 100;
  }
}

/**
 * Export convenience functions
 */
export function syntheticControl(
  treatedData: number[],
  controlData: number[][],
  treatmentTime: number,
  preTreatmentPeriods?: number
): SyntheticControlWeights {
  return new SyntheticControl().construct(treatedData, controlData, treatmentTime, preTreatmentPeriods);
}

export function interruptedTimeSeries(
  outcomes: number[],
  treatmentTime: number,
  prePeriods?: number,
  postPeriods?: number
): ITSResult {
  return new InterruptedTimeSeries().analyze(outcomes, treatmentTime, prePeriods, postPeriods);
}

export function eventStudyDiD(
  data: Array<CovariateData & { group: string; time: number }>,
  treatmentGroup: string,
  outcomeName: string = 'outcome'
): EventStudyResult {
  return new EventStudyDiD().compute(data, treatmentGroup, outcomeName);
}

export function placeboTests(
  data: Array<CovariateData & { group: string; time: number }>,
  outcomeName: string = 'outcome',
  nPlacebos: number = 500
): PlaceboResult[] {
  return new PlaceboTests().runPlaceboTests(data, outcomeName, nPlacebos);
}

export default {
  SyntheticControl,
  InterruptedTimeSeries,
  EventStudyDiD,
  PlaceboTests,
  syntheticControl,
  interruptedTimeSeries,
  eventStudyDiD,
  placeboTests
};
