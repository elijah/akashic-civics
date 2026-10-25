/**
 * Survival Analysis Toolkit for Akashic Civics
 * 
 * Provides survival analysis methods in pure JavaScript:
 * - Kaplan-Meier estimator for survival curves
 * - Nelson-Aalen estimator for cumulative hazard
 * - Log-rank test for comparing survival distributions
 * - Cox proportional hazards model (partial implementation)
  * - Survival statistics and diagnostics
  */

import { invertMatrix } from './logistic_regression';

/**
 * Survival data interface
 */
export interface SurvivalData {
  time: number[];
  event: number[];
  strata?: string[];
}

/**
 * Kaplan-Meier survival curve result
 */
export interface KaplanMeierResult {
  time: number[];
  survival: number[];
  standard_error: number[];
  confidence_interval: { lower: number[]; upper: number[] };
  n_events: number[];
  n_at_risk: number[];
  median_survival?: number;
  lower_quartile?: number;
  upper_quartile?: number;
}

/**
 * Nelson-Aalen cumulative hazard result
 */
export interface NelsonAalenResult {
  time: number[];
  cumulative_hazard: number[];
  standard_error: number[];
  n_events: number[];
  n_at_risk: number[];
}

/**
 * Log-rank test result
 */
export interface LogRankResult {
  chi_square: number;
  df: number;
  p_value: number;
  significant: boolean;
  observed_events: number[];
  expected_events: number[];
  variance: number[];
}

/**
 * Kaplan-Meier Estimator
 */
export class KaplanMeierEstimator {
  private data: SurvivalData;

  constructor(data: SurvivalData) {
    this.data = data;
  }

  /**
   * Compute Kaplan-Meier survival curve
   */
  fit(): KaplanMeierResult {
    const n = this.data.time.length;
    
    // Sort by time (ascending)
    const sortedIndices = [...Array(n).keys()].sort((a, b) => {
      const timeDiff = this.data.time[a] - this.data.time[b];
      if (timeDiff !== 0) return timeDiff;
      return this.data.event[b] - this.data.event[a]; // Events first
    });
    
    const times: number[] = [];
    const events: number[] = [];
    const atRisk: number[] = [];
    const deaths: number[] = [];
    
    // Walk through unique event times
    let i = 0;
    while (i < n) {
      const currentTime = this.data.time[sortedIndices[i]];
      let nAtRisk = 0;
      let nDeaths = 0;
      
      // Count at risk and deaths at this time
      for (let j = 0; j < n; j++) {
        if (this.data.time[sortedIndices[j]] >= currentTime) {
          nAtRisk++;
        }
        if (this.data.time[sortedIndices[j]] === currentTime && this.data.event[sortedIndices[j]] === 1) {
          nDeaths++;
        }
      }
      
      if (nDeaths > 0) {
        times.push(currentTime);
        atRisk.push(nAtRisk);
        deaths.push(nDeaths);
        events.push(events.length > 0 ? events[events.length - 1] + nDeaths : nDeaths);
      }
      
      i++;
    }
    
    // Compute survival probabilities
    const survival: number[] = [];
    const stdError: number[] = [];
    const nAtRiskResult = [];
    const deathsResult = [];
    
    let prevSurvival = 1;
    let greenwoodSum = 0;
    for (let j = 0; j < times.length; j++) {
      const s = 1 - deaths[j] / atRisk[j];
      const survival_j = prevSurvival * s;
      survival.push(survival_j);
      
      // Greenwood's formula: Var(S) = S^2 * sum(d_i / (n_i * (n_i - d_i)))
      const n = atRisk[j];
      const d = deaths[j];
      if (n > d) greenwoodSum += d / (n * (n - d));
      const varSurvival = survival_j ** 2 * greenwoodSum;
      stdError.push(Math.sqrt(Math.max(0, varSurvival)));
      
      nAtRiskResult.push(atRisk[j]);
      deathsResult.push(deaths[j]);
      
      prevSurvival = survival_j;
    }
    
    // Confidence intervals (log-log transform)
    const lowerCI: number[] = [];
    const upperCI: number[] = [];
    
    for (let j = 0; j < survival.length; j++) {
      if (survival[j] > 0 && survival[j] < 1) {
        const logLogLog = Math.log(-Math.log(survival[j]));
        const seLogLog = stdError[j] / (survival[j] * Math.abs(Math.log(survival[j])));
        const lower = Math.exp(-Math.exp(logLogLog + 1.96 * seLogLog));
        const upper = Math.exp(-Math.exp(logLogLog - 1.96 * seLogLog));
        lowerCI.push(Math.max(0, lower));
        upperCI.push(Math.min(1, upper));
      } else {
        lowerCI.push(Math.max(0, survival[j] - 1.96 * stdError[j]));
        upperCI.push(Math.min(1, survival[j] + 1.96 * stdError[j]));
      }
    }
    
    // Compute median survival
    let medianSurvival: number | undefined;
    for (let j = 0; j < survival.length; j++) {
      if (survival[j] <= 0.5) {
        // Linear interpolation
        if (j > 0) {
          const t0 = times[j - 1];
          const t1 = times[j];
          const s0 = survival[j - 1];
          const s1 = survival[j];
          medianSurvival = t0 + (t1 - t0) * (0.5 - s0) / (s1 - s0);
        } else {
          medianSurvival = times[j];
        }
        break;
      }
    }
    
    // Compute quartiles (if median exists)
    let lowerQuartile: number | undefined;
    let upperQuartile: number | undefined;
    
    for (let j = 0; j < survival.length; j++) {
      if (survival[j] <= 0.75 && lowerQuartile === undefined) {
        if (j > 0 && survival[j - 1] > 0.75) {
          const t0 = times[j - 1];
          const t1 = times[j];
          const s0 = survival[j - 1];
          const s1 = survival[j];
          lowerQuartile = t0 + (t1 - t0) * (0.75 - s0) / (s1 - s0);
        } else {
          lowerQuartile = times[j];
        }
      }
      if (survival[j] <= 0.25 && upperQuartile === undefined) {
        if (j > 0 && survival[j - 1] > 0.25) {
          const t0 = times[j - 1];
          const t1 = times[j];
          const s0 = survival[j - 1];
          const s1 = survival[j];
          upperQuartile = t0 + (t1 - t0) * (0.25 - s0) / (s1 - s0);
        } else {
          upperQuartile = times[j];
        }
      }
    }
    
    return {
      time: times,
      survival,
      standard_error: stdError,
      confidence_interval: { lower: lowerCI, upper: upperCI },
      n_events: deathsResult,
      n_at_risk: nAtRiskResult,
      median_survival: medianSurvival,
      lower_quartile: lowerQuartile,
      upper_quartile: upperQuartile
    };
  }
}

/**
 * Nelson-Aalen Cumulative Hazard Estimator
 */
export class NelsonAalenEstimator {
  private data: SurvivalData;

  constructor(data: SurvivalData) {
    this.data = data;
  }

  fit(): NelsonAalenResult {
    // Get unique event times (sorted ascending)
    const uniqueTimes = [...new Set(this.data.time.filter((_, i) => this.data.event[i] === 1))].sort((a, b) => a - b);
    
    const times: number[] = [];
    const cumulativeHazards: number[] = [];
    const stdErrors: number[] = [];
    const nEvents: number[] = [];
    const nAtRisk: number[] = [];
    
    let cumulativeHazard = 0;
    
    for (const t of uniqueTimes) {
      const nAtRisk_t = this.data.time.filter(time => time >= t).length;
      const nEvents_t = this.data.time.filter((time, i) => time === t && this.data.event[i] === 1).length;
      
      const hazard_t = nEvents_t / nAtRisk_t;
      cumulativeHazard += hazard_t;
      
      // Standard error for Nelson-Aalen cumulative hazard
      const se_t = Math.sqrt(nEvents_t) / nAtRisk_t;
      
      times.push(t);
      cumulativeHazards.push(cumulativeHazard);
      stdErrors.push(se_t);
      nEvents.push(nEvents_t);
      nAtRisk.push(nAtRisk_t);
    }
    
    return {
      time: times,
      cumulative_hazard: [0, ...cumulativeHazards],
      standard_error: [0, ...stdErrors],
      n_events: nEvents,
      n_at_risk: nAtRisk
    };
  }
}

/**
 * Log-rank Test for Comparing Survival Distributions
 */
export class LogRankTest {
  /**
   * Perform log-rank test comparing multiple groups
   */
  static compare(...groups: SurvivalData[]): LogRankResult {
    if (groups.length < 2) {
      throw new Error('Log-rank test requires at least 2 groups');
    }
    
    // Collect all event times
    const allTimes = new Set<number>();
    for (const group of groups) {
      group.time.forEach(t => allTimes.add(t));
    }
    const uniqueTimes = Array.from(allTimes).sort((a, b) => b - a);
    
    const numGroups = groups.length;
    const observedEvents: number[] = new Array(numGroups).fill(0);
    const expectedEvents: number[] = new Array(numGroups).fill(0);
    const varianceSum: number[] = new Array(numGroups).fill(0);
    
    // For overall chi-square test, we need the covariance matrix
    let chiSquare = 0;
    
    for (const t of uniqueTimes) {
      const nAtRisk = groups.map(g => g.time.filter(time => time >= t).length);
      const nEvents = groups.map((g) => g.time.filter((time, idx) => time === t && g.event[idx] === 1).length);
      const totalAtRisk = nAtRisk.reduce((a, b) => a + b, 0);
      const totalEvents = nEvents.reduce((a, b) => a + b, 0);
      
      if (totalEvents === 0) continue;
      
      // Expected events under null hypothesis
      const expected = nAtRisk.map(n => n * totalEvents / totalAtRisk);
      
      for (let i = 0; i < numGroups; i++) {
        observedEvents[i] += nEvents[i];
        expectedEvents[i] += expected[i];
      }
    }
    
    // Compute chi-square statistic
    for (let i = 0; i < numGroups; i++) {
      const diff = observedEvents[i] - expectedEvents[i];
      chiSquare += diff ** 2 / expectedEvents[i];
    }
    
    const df = numGroups - 1;
    const pValue = chiSquarePValue(chiSquare, df);
    
    return {
      chi_square: chiSquare,
      df,
      p_value: pValue,
      significant: pValue < 0.05,
      observed_events: observedEvents,
      expected_events: expectedEvents,
      variance: varianceSum
    };
  }
  
  /**
   * Two-sample log-rank test
   */
  static twoSample(group1: SurvivalData, group2: SurvivalData): LogRankResult {
    return LogRankTest.compare(group1, group2);
  }
}

/**
 * Cox Proportional Hazards Model (partial likelihood)
 */
export class CoxPHModel {
  private coefficients: number[] = [];

  /**
   * Fit Cox proportional hazards model using partial likelihood
   */
  fit(
    data: Array<{ time: number; event: number; features: number[] }>,
    featureNames: string[],
    maxIterations: number = 100,
    tolerance: number = 1e-6
  ): { coefficients: number[]; se: number[]; z: number[]; p: number[]; converged: boolean } {
    const n = data.length;
    const k = featureNames.length;
    
    // Initialize coefficients
    let beta = new Array(k).fill(0);
    let converged = false;
    let finalHessian: number[][] = Array(k).fill(0).map(() => new Array(k).fill(0));
    
    // Partial likelihood iterations
    for (let iter = 0; iter < maxIterations; iter++) {
      // Compute risk scores and partial likelihood gradient/hessian
      const riskScores = data.map(d => d.features.reduce((sum, f, j) => sum + f * beta[j], 0));
      
      // Gradient and Hessian
      const gradient = new Array(k).fill(0);
      const hessian: number[][] = Array(k).fill(0).map(() => new Array(k).fill(0));
      
      for (let i = 0; i < n; i++) {
        if (data[i].event === 1) {
          // Risk set denominator
          let sigma = 0;
          let sigmaXi: number[] = new Array(k).fill(0);
          let sigmaXiXij: number[][] = Array(k).fill(0).map(() => new Array(k).fill(0));
          
          for (let j = 0; j < n; j++) {
            if (data[j].time >= data[i].time) {
              const er = Math.exp(riskScores[j]);
              sigma += er;
              
              for (let l = 0; l < k; l++) {
                sigmaXi[l] += data[j].features[l] * er;
                for (let m = l; m < k; m++) {
                  sigmaXiXij[l][m] += data[j].features[l] * er * data[j].features[m];
                  if (l !== m) sigmaXiXij[m][l] = sigmaXiXij[l][m];
                }
              }
            }
          }
          
          // Add to gradient and hessian
          for (let j = 0; j < k; j++) {
            gradient[j] += data[i].features[j] - sigmaXi[j] / sigma;
          }
          
          // Accumulate negative second derivative of partial log-likelihood
          for (let l = 0; l < k; l++) {
            for (let m = 0; m < k; m++) {
              hessian[l][m] -= (sigmaXiXij[l][m] / sigma) - (sigmaXi[l] * sigmaXi[m]) / (sigma * sigma);
            }
          }
        }
      }
      
      // Check convergence
      const gradNorm = Math.sqrt(gradient.reduce((a, b) => a + b ** 2, 0));
      finalHessian = hessian;
      if (gradNorm < tolerance) {
        converged = true;
        break;
      }
      
      // Newton-Raphson update (simplified - would need proper hessian inversion)
      // This is a simplified version for demonstration
      for (let j = 0; j < k; j++) {
        beta[j] += gradient[j] * 0.1; // Simple gradient ascent
      }
    }
    
    this.coefficients = beta;
    
    // Standard errors from the inverse of the observed information matrix
    const se = new Array(k).fill(0.1);
    try {
      const infoInverse = invertMatrix(finalHessian);
      for (let j = 0; j < k; j++) {
        const v = infoInverse[j][j];
        se[j] = v > 0 ? Math.sqrt(v) : 0.1;
      }
    } catch {
      // Fall back to placeholder SEs if the information matrix is singular
    }
    
    const z = beta.map((b, i) => b / se[i]);
    const p = z.map(zi => 2 * (1 - normalCDF(Math.abs(zi))));
    
    return { coefficients: beta, se, z, p, converged };
  }

  /**
   * Compute partial survival ratios for groups
   */
  partialLikelihood(data: Array<{ time: number; event: number; features: number[] }>): number {
    let logPL = 0;
    
    data.sort((a, b) => b.time - a.time);
    
    for (let i = 0; i < data.length; i++) {
      if (data[i].event === 1) {
        const expBetaX = Math.exp(data[i].features.reduce((sum, f, j) => sum + f * this.coefficients[j], 0));
        
        let denom = 0;
        for (let j = i; j < data.length; j++) {
          const risk = data[j].features.reduce((sum, f, m) => sum + f * this.coefficients[m], 0);
          denom += Math.exp(risk);
        }
        
        logPL += Math.log(expBetaX / denom);
      }
    }
    
    return logPL;
  }
}

/**
 * Utility: Normal CDF
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4 * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));

  return 0.5 * (1.0 + sign * y);
}

/**
 * Chi-square p-value calculation
 */
function chiSquarePValue(chiSquare: number, df: number): number {
  // Approximate chi-square CDF using Wilson-Hilferty transformation
  if (df === 1) {
    return 2 * (1 - normalCDF(Math.sqrt(chiSquare)));
  }
  
  const z = Math.pow(chiSquare / df, 1/3) - (1 - 2/(9*df)) / Math.sqrt(2/(9*df));
  return 2 * (1 - normalCDF(Math.abs(z)));
}

/**
 * Survival Statistics Calculator
 */
export class SurvivalStatistics {
  /**
   * Compute median survival time
   */
  static medianSurvival(time: number[], event: number[]): number | null {
    const km = new KaplanMeierEstimator({ time, event });
    const result = km.fit();
    return result.median_survival ?? null;
  }
  
  /**
   * Compute cumulative incidence function
   */
  static cumulativeIncidence(time: number[], event: number[], _censorCode: number = 0): { time: number[]; incidence: number[] } {
    const km = new KaplanMeierEstimator({ time, event });
    const kmResult = km.fit();
    
    // Cumulative incidence = 1 - survival
    return {
      time: kmResult.time,
      incidence: kmResult.survival.map((s: number) => 1 - s)
    };
  }
  
  /**
   * Compute restricted mean survival time
   */
  static restrictedMeanSurvival(time: number[], event: number[], tau: number): number {
    // RMST = integral of survival function up to time tau
    const km = new KaplanMeierEstimator({ time, event });
    const result = km.fit();
    
    let rmst = 0;
    for (let i = 1; i < result.time.length; i++) {
      const tPrev = result.time[i - 1];
      const tCurr = result.time[i];
      if (tCurr > tau) {
        rmst += (tau - tPrev) * result.survival[i - 1];
        break;
      }
      rmst += (tCurr - tPrev) * result.survival[i - 1];
    }
    
    return rmst;
  }
}

// Export convenience functions
export function kaplanMeier(data: SurvivalData): KaplanMeierResult {
  return new KaplanMeierEstimator(data).fit();
}

export function nelsonAalen(data: SurvivalData): NelsonAalenResult {
  return new NelsonAalenEstimator(data).fit();
}

export function logRankTest(...groups: SurvivalData[]): LogRankResult {
  return LogRankTest.compare(...groups);
}

export function coxPH(data: any[], featureNames: string[]): any {
  const model = new CoxPHModel();
  return model.fit(data, featureNames);
}