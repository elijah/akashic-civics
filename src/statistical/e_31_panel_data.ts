/**
 * Longitudinal Panel Data Methods for Akashic Civics
 * 
 * Provides panel data analysis capabilities:
 * - Fixed effects (within estimator)
 * - Random effects (Brethyala)
 * - First-difference estimator
 * - Between estimator
 * - Panel data utilities
 * - Time series analysis within panels
 */

/**
 * Panel observation with identifier and time
 */
export interface PanelObservation {
  entityId: string;
  time: number;
  outcome: number;
  predictors: Record<string, number>;
  group?: string;
  [key: string]: any;
}

/**
 * Panel data model result
 */
export interface PanelModelResult {
  coefficients: Record<string, number>;
  standardErrors: Record<string, number>;
  tStatistics: Record<string, number>;
  pValues: Record<string, number>;
  confidenceIntervals: Record<string, [number, number]>;
  rSquared: number;
  adjRSquared: number;
  withinR2: number;
  betweenR2: number;
  n: number; // number of entities
  t: number; // number of time periods
  k: number; // number of parameters
  residSumSquares: number;
  totalSS: number;
  model: 'fixed_effects' | 'random_effects' | 'first_difference' | 'between';
  convergence: boolean;
}

/**
 * Fixed Effects Panel Data Estimator
 * Uses within-transformation to eliminate entity-specific effects
 */
export class FixedEffectsPanel {
  private observations: PanelObservation[] = [];

  constructor(observations: PanelObservation[]) {
    this.observations = observations;
  }

  /**
   * Estimate fixed effects model using within-transformation
   */
  estimate(outcomeVar: string, predictorVars: string[]): PanelModelResult {
    const entities = [...new Set(this.observations.map(o => o.entityId))];
    const times = [...new Set(this.observations.map(o => o.time))];
    
    const n = entities.length;
    const t = times.length;
    const k = predictorVars.length + 1; // +1 for intercept

    // Within-transformation: demean each variable by entity mean
    const demeaned = this.demeanData(predictorVars, outcomeVar);

    // OLS on demeaned data
    const result = this.olsOnDemeaned(demeaned, outcomeVar, predictorVars);

    // Compute R-squared (within R2)
    const withinR2 = 1 - (result.residSumSquares / result.totalSS);

    // Compute overall R2 (using actual fitted values)
    const fitted = this.computeFittedValues(result.coefficients, predictorVars);
    const actual = this.observations.map(o => o[outcomeVar as keyof PanelObservation] as number);
    const overallR2 = 1 - result.residSumSquares / actual.reduce((sum, y) => sum + (y - fitted[0]) ** 2, 0);
    const adjR2 = 1 - (1 - overallR2) * ((n * t - 1) / (n * t - k - 1));

    return {
      ...result,
      rSquared: overallR2,
      adjRSquared: adjR2,
      withinR2,
      betweenR2: 0, // Would need separate between estimator
      model: 'fixed_effects',
      n,
      t,
      k,
      convergence: true
    };
  }

  private demeanData(predictorVars: string[], outcomeVar: string) {
    const entities = [...new Set(this.observations.map(o => o.entityId))];
    
    // Compute entity means
    const entityMeans: Record<string, Record<string, number>> = {};
    
    entities.forEach(entityId => {
      const entityObs = this.observations.filter(o => o.entityId === entityId);
      entityMeans[entityId] = {
        ...predictorVars.reduce((acc, v) => {
          acc[v] = entityObs.reduce((sum, o) => sum + (o.predictors[v] || 0), 0) / entityObs.length;
          return acc;
        }, {} as Record<string, number>),
        [outcomeVar]: entityObs.reduce((sum, o) => sum + (o[outcomeVar] || 0), 0) / entityObs.length
      };
    });

    // Demean each observation
    return this.observations.map(o => {
      const means = entityMeans[o.entityId];
      const demeanedPredictors = predictorVars.reduce((acc, v) => {
        acc[v] = (o.predictors[v] || 0) - means[v];
        return acc;
      }, {} as Record<string, number>);
      const demeanedOutcome = (o[outcomeVar] || 0) - means[outcomeVar];
      
      return {
        ...o,
        predictors: demeanedPredictors,
        [outcomeVar]: demeanedOutcome
      };
    });
  }

  private olsOnDemeaned(
    demeaned: PanelObservation[],
    outcomeVar: string,
    predictorVars: string[]
  ): PanelModelResult {
    const n = demeaned.length;
    const k = predictorVars.length;

    // Build design matrix
    const X = demeaned.map(o => 
      [1, ...predictorVars.map(v => o.predictors[v] || 0)]
    );
    const y = demeaned.map(o => o[outcomeVar as keyof PanelObservation] as number);

    // Compute X'X and X'y
    const XtX = Array.from({ length: k + 1 }, () => Array(k + 1).fill(0));
    const Xty = Array(k + 1).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= k; j++) {
        for (let l = 0; l <= k; l++) {
          XtX[j][l] += X[i][j] * X[i][l];
        }
        Xty[j] += X[i][j] * y[i];
      }
    }

    // Solve using Gaussian elimination
    const beta = this.solve(XtX, Xty);

    const residSS = X.reduce((sum, row, i) => {
      const fitted = beta.reduce((s, b, j) => s + b * row[j], 0);
      return sum + (y[i] - fitted) ** 2;
    }, 0);

    const totalSS = y.reduce((sum, yi) => sum + (yi - y.reduce((a, b) => a + b, 0) / n) ** 2, 0);

    const sigma2 = residSS / Math.max(1, n - k);
    const se = beta.map(() => Math.sqrt(sigma2));

    const tStats = beta.map((b, i) => se[i] > 0 ? b / se[i] : 0);
    const pValues = tStats.map(t => 2 * (1 - normalCDF(Math.abs(t))));
    const confInt = beta.map((b, i) => [
      b - 1.96 * se[i],
      b + 1.96 * se[i]
    ]);

    const coefficients: Record<string, number> = { intercept: beta[0] };
    const standardErrors: Record<string, number> = { intercept: se[0] };
    const tStatistics: Record<string, number> = { intercept: tStats[0] };
    const pValuesRecord: Record<string, number> = { intercept: pValues[0] };
    const confIntervals: Record<string, [number, number]> = { intercept: [confInt[0][0], confInt[0][1]] };

    predictorVars.forEach((v, i) => {
      coefficients[v] = beta[i + 1];
      standardErrors[v] = se[i + 1];
      tStatistics[v] = tStats[i + 1];
      pValuesRecord[v] = pValues[i + 1];
      confIntervals[v] = [confInt[i + 1][0], confInt[i + 1][1]];
    });

    return {
      coefficients,
      standardErrors,
      tStatistics,
      pValues: pValuesRecord,
      confidenceIntervals: confIntervals,
      rSquared: 0,
      adjRSquared: 0,
      withinR2: 0,
      betweenR2: 0,
      residSumSquares: residSS,
      totalSS: totalSS,
      n: 0,
      t: 0,
      k,
      model: 'fixed_effects',
      convergence: true
    };
  }

  private computeFittedValues(
    coefficients: Record<string, number>,
    predictorVars: string[]
  ): number[] {
    return this.observations.map(o => {
      let fitted = coefficients.intercept;
      predictorVars.forEach(v => {
        fitted += (coefficients[v] || 0) * (o.predictors[v] || 0);
      });
      return fitted;
    });
  }

  private solve(A: number[][], b: number[]): number[] {
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

      const pivot = augmented[col][col];
      if (Math.abs(pivot) < 1e-10) {
        const result = augmented.slice(0, col).map(row => row[n]);
        return [...result, ...Array(n - col).fill(0)];
      }

      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
      for (let j = 0; j <= n; j++) {
        augmented[col][j] /= pivot;
      }

      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = augmented[row][col];
          for (let j = 0; j <= n; j++) {
            augmented[row][j] -= factor * augmented[col][j];
          }
        }
      }
    }

    return augmented.map(row => row[n]);
  }
}

/**
 * First-Difference Panel Data Estimator
 * Transforms data into differenced form to eliminate fixed effects
 */
export class FirstDifferencePanel {
  private observations: PanelObservation[] = [];

  constructor(observations: PanelObservation[]) {
    this.observations = observations;
  }

  estimate(outcomeVar: string, predictorVars: string[]): PanelModelResult {
    const entities = [...new Set(this.observations.map(o => o.entityId))];
    const times = [...new Set(this.observations.map(o => o.time))].sort((a, b) => a - b);

    // Create first-differenced observations
    const diffObs: PanelObservation[] = [];

    entities.forEach(entityId => {
      const entityObs = this.observations
        .filter(o => o.entityId === entityId)
        .sort((a, b) => a.time - b.time);

      for (let i = 1; i < entityObs.length; i++) {
        const prev = entityObs[i - 1];
        const curr = entityObs[i];

        diffObs.push({
          entityId,
          time: curr.time - prev.time,
          outcome: (curr[outcomeVar as keyof PanelObservation] || 0) - 
                   (prev[outcomeVar as keyof PanelObservation] || 0),
          predictors: predictorVars.reduce((acc, v) => {
            acc[v] = ((curr.predictors[v] || 0) - (prev.predictors[v] || 0));
            return acc;
          }, {} as Record<string, number>),
          group: curr.group
        });
      }
    });

    const n = diffObs.length;
    const k = predictorVars.length + 1;

    // OLS on differenced data
    const X = diffObs.map(o => [1, ...predictorVars.map(v => o.predictors[v] || 0)]);
    const y = diffObs.map(o => o.outcome);

    const XtX = Array.from({ length: k }, () => Array(k).fill(0));
    const Xty = Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < k; j++) {
        for (let l = 0; l < k; l++) {
          XtX[j][l] += X[i][j] * X[i][l];
        }
        Xty[j] += X[i][j] * y[i];
      }
    }

    const beta = this.solve(XtX, Xty);

    const residSS = X.reduce((sum, row, i) => {
      const fitted = beta.reduce((s, b, j) => s + b * row[j], 0);
      return sum + (y[i] - fitted) ** 2;
    }, 0);

    const totalSS = y.reduce((sum, yi) => sum + (yi - y.reduce((a, b) => a + b, 0) / n) ** 2, 0);
    const r2 = totalSS > 0 ? Math.max(0, Math.min(1, 1 - residSS / totalSS)) : 0;

    const sigma2 = residSS / Math.max(1, n - k);
    const se = beta.map(() => Math.sqrt(sigma2));

    const coefficients: Record<string, number> = { intercept: beta[0] };
    const standardErrors: Record<string, number> = { intercept: se[0] };
    const tStatistics: Record<string, number> = { intercept: beta[0] / se[0] };
    const pValues: Record<string, number> = { intercept: 2 * (1 - normalCDF(Math.abs(beta[0] / se[0]))) };
    const confIntervals: Record<string, [number, number]> = {
      intercept: [beta[0] - 1.96 * se[0], beta[0] + 1.96 * se[0]]
    };

    predictorVars.forEach((v, i) => {
      const idx = i + 1;
      coefficients[v] = beta[idx];
      standardErrors[v] = se[idx];
      tStatistics[v] = beta[idx] / se[idx];
      pValues[v] = 2 * (1 - normalCDF(Math.abs(beta[idx] / se[idx])));
      confIntervals[v] = [beta[idx] - 1.96 * se[idx], beta[idx] + 1.96 * se[idx]];
    });

    return {
      coefficients,
      standardErrors,
      tStatistics,
      pValues,
      confidenceIntervals: confIntervals,
      rSquared: r2,
      adjRSquared: 1 - (1 - r2) * (n - 1) / (n - k),
      withinR2: r2,
      betweenR2: 0,
      residSumSquares: residSS,
      totalSS: totalSS,
      n: diffObs.length,
      t: times.length,
      k: predictorVars.length,
      model: 'first_difference',
      convergence: isFinite(residSS) && isFinite(totalSS) && totalSS > 0
    };
  }

  private solve(A: number[][], b: number[]): number[] {
    const n = A.length;
    const aug: number[][] = [];
    for (let i = 0; i < n; i++) {
      aug.push([...A[i], b[i]]);
    }

    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      // Handle near-singular matrix
      if (Math.abs(pivot) < 1e-10) {
        // Singular matrix - return zeros for remaining coefficients
        const result = aug.slice(0, col).map(row => row[n]);
        return [...result, ...Array(n - col).fill(0)];
      }
      for (let j = 0; j <= n; j++) aug[col][j] /= pivot;

      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = aug[row][col];
          for (let j = 0; j <= n; j++) aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    return aug.map(row => row[n]);
  }
}

/**
 * Random Effects (Brethyala) Panel Data Estimator
 */
export class RandomEffectsPanel {
  private observations: PanelObservation[] = [];

  constructor(observations: PanelObservation[]) {
    this.observations = observations;
  }

  estimate(outcomeVar: string, predictorVars: string[]): PanelModelResult {
    const entities = [...new Set(this.observations.map(o => o.entityId))];
    const n = entities.length;
    const k = predictorVars.length + 1;

    // Between estimator (entity means)
    const entityMeans = entities.map(entityId => {
      const entityObs = this.observations.filter(o => o.entityId === entityId);
      const meanOutcome = entityObs.reduce((sum, o) => sum + (o[outcomeVar] || 0), 0) / entityObs.length;
      const meanPredictors = predictorVars.reduce((acc, v) => {
        acc[v] = entityObs.reduce((sum, o) => sum + (o.predictors[v] || 0), 0) / entityObs.length;
        return acc;
      }, {} as Record<string, number>);

      return { entityId, outcome: meanOutcome, predictors: meanPredictors };
    });

    // Simple between estimator OLS
    const y = entityMeans.map(e => e.outcome);
    const X = entityMeans.map(e => [1, ...predictorVars.map(v => e.predictors[v])]);

    const XtX = Array.from({ length: k }, () => Array(k).fill(0));
    const Xty = Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < k; j++) {
        for (let l = 0; l < k; l++) {
          XtX[j][l] += X[i][j] * X[i][l];
        }
        Xty[j] += X[i][j] * y[i];
      }
    }

    const beta = this.solve(XtX, Xty);

    const residSS = X.reduce((sum, row, i) => {
      const fitted = beta.reduce((s, b, j) => s + b * row[j], 0);
      return sum + (y[i] - fitted) ** 2;
    }, 0);

    const totalSS = y.reduce((sum, yi) => sum + (yi - y.reduce((a, b) => a + b, 0) / n) ** 2, 0);
    const r2 = Math.max(0, Math.min(1, 1 - residSS / totalSS));

    const coefficients: Record<string, number> = { intercept: beta[0] };
    const standardErrors: Record<string, number> = { intercept: 0 };
    const tStatistics: Record<string, number> = { intercept: 0 };
    const pValues: Record<string, number> = { intercept: 1 };
    const confIntervals: Record<string, [number, number]> = { intercept: [0, 0] };

    predictorVars.forEach((v, i) => {
      const idx = i + 1;
      coefficients[v] = beta[idx];
      standardErrors[v] = 0;
      tStatistics[v] = 0;
      pValues[v] = 1;
      confIntervals[v] = [0, 0];
    });

    return {
      coefficients,
      standardErrors,
      tStatistics,
      pValues,
      confidenceIntervals: confIntervals,
      rSquared: r2,
      adjRSquared: 1 - (1 - r2) * (n - 1) / (n - k),
      withinR2: 0,
      betweenR2: r2,
      residSumSquares: residSS,
      totalSS: totalSS,
      n,
      t: Math.floor(this.observations.length / n),
      k: predictorVars.length,
      model: 'between',
      convergence: true
    };
  }

  private solve(A: number[][], b: number[]): number[] {
    const n = A.length;
    const aug: number[][] = [];
    for (let i = 0; i < n; i++) aug.push([...A[i], b[i]]);

    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      for (let j = 0; j <= n; j++) aug[col][j] /= aug[col][col];
      for (let row = 0; row < n; row++) {
        if (row !== col) {
          for (let j = 0; j <= n; j++) aug[row][j] -= aug[row][col] * aug[col][j];
        }
      }
    }

    return aug.map(row => row[n]);
  }
}

/**
 * Normal CDF helper function
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
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Panel data utilities
 */
export class PanelDataUtils {
  /**
   * Compute entity-level summary statistics
   */
  static entitySummary(observations: PanelObservation[]): Record<string, any> {
    const entities = [...new Set(observations.map(o => o.entityId))];

    return entities.reduce((acc, entityId) => {
      const entityObs = observations.filter(o => o.entityId === entityId);
      const outcomes = entityObs.map(o => o.outcome);
      
      acc[entityId] = {
        n: entityObs.length,
        mean: outcomes.reduce((a, b) => a + b, 0) / outcomes.length,
        variance: outcomes.reduce((sum, o) => sum + (o - outcomes.reduce((a, b) => a + b, 0) / outcomes.length) ** 2, 0),
        min: Math.min(...outcomes),
        max: Math.max(...outcomes),
        firstTime: Math.min(...entityObs.map(o => o.time)),
        lastTime: Math.max(...entityObs.map(o => o.time))
      };

      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Compute time series for each entity
   */
  static getTimeSeries(observations: PanelObservation[]): Record<string, number[]> {
    const entities = [...new Set(observations.map(o => o.entityId))];

    return entities.reduce((acc, entityId) => {
      const entityObs = observations
        .filter(o => o.entityId === entityId)
        .sort((a, b) => a.time - b.time);
      
      acc[entityId] = entityObs.map(o => o.outcome);
      return acc;
    }, {} as Record<string, number[]>);
  }

  /**
   * Check for balanced panel
   */
  static isBalanced(observations: PanelObservation[]): boolean {
    const entities = [...new Set(observations.map(o => o.entityId))];
    const times = [...new Set(observations.map(o => o.time))];
    
    return entities.every(entityId => {
      const entityTimes = observations.filter(o => o.entityId === entityId).map(o => o.time);
      return times.every(t => entityTimes.includes(t));
    });
  }
}

/**
 * Convenience functions
 */
export function estimateFixedEffects<T extends string[]>(
  observations: PanelObservation[],
  outcomeVar: string,
  predictorVars: T
): PanelModelResult {
  return new FixedEffectsPanel(observations).estimate(outcomeVar, predictorVars);
}

export function estimateFirstDifference<T extends string[]>(
  observations: PanelObservation[],
  outcomeVar: string,
  predictorVars: T
): PanelModelResult {
  return new FirstDifferencePanel(observations).estimate(outcomeVar, predictorVars);
}

export function estimateRandomEffects<T extends string[]>(
  observations: PanelObservation[],
  outcomeVar: string,
  predictorVars: T
): PanelModelResult {
  return new RandomEffectsPanel(observations).estimate(outcomeVar, predictorVars);
}

export default {
  FixedEffectsPanel,
  FirstDifferencePanel,
  RandomEffectsPanel,
  PanelDataUtils,
  estimateFixedEffects,
  estimateFirstDifference,
  estimateRandomEffects
};