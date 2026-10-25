/**
 * Logistic Regression Implementation for Akashic Civics
 * 
 * Provides comprehensive logistic regression in pure JavaScript:
 * - Maximum Likelihood Estimation (MLE) via Iteratively Reweighted Least Squares (IRLS)
 * - Wald tests for coefficient significance
 * - Confidence intervals for coefficients and odds ratios
 * - Odds ratio calculation with confidence intervals
 * - Model diagnostics (AIC, BIC, pseudo R², concordance)
  * - Predictions and marginal effects
  */

export interface LogisticRegressionOptions {
  maxIterations?: number;
  tolerance?: number;
  addIntercept?: boolean;
  standardize?: boolean;
}

export interface LogisticRegressionResult {
  coefficients: Record<string, CoefficientResult>;
  model_diagnostics: ModelDiagnostics;
  predictions?: number[];
  marginal_effects?: Record<string, number>;
  convergence: {
    converged: boolean;
    iterations: number;
    log_likelihood: number;
    final_gradient_norm: number;
  };
  sample_size: number;
  n_parameters: number;
}

export interface CoefficientResult {
  estimate: number;
  std_error: number;
  z_value: number;
  p_value: number;
  odds_ratio: number;
  odds_ratio_ci_lower: number;
  odds_ratio_ci_upper: number;
  ci_lower: number;
  ci_upper: number;
}

export interface ModelDiagnostics {
  aic: number;
  bic: number;
  log_likelihood: number;
  pseudo_r_squared: {
    mcfadden: number;
    cox_snell: number;
    nagelkerke: number;
  };
  concordance_index: number;
  deviance: number;
  null_deviance: number;
}

export interface LogisticRegressionData {
  X: number[][];
  y: number[];
  feature_names: string[];
}

/**
 * Standard logistic function (sigmoid)
 */
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Log-likelihood for logistic regression
 */
function logLikelihood(y: number[], p: number[]): number {
  const eps = 1e-15;
  let ll = 0;
  for (let i = 0; i < y.length; i++) {
    const pi = Math.max(eps, Math.min(1 - eps, p[i]));
    ll += y[i] * Math.log(pi) + (1 - y[i]) * Math.log(1 - pi);
  }
  return ll;
}

/**
 * Compute gradient for IRLS
 */
function computeGradient(X: number[][], y: number[], p: number[]): number[] {
  const n = X.length;
  const k = X[0].length;
  const gradient = new Array(k).fill(0);
  
  for (let i = 0; i < n; i++) {
    const residual = y[i] - p[i];
    for (let j = 0; j < k; j++) {
      gradient[j] += residual * X[i][j];
    }
  }
  return gradient;
}

/**
 * Compute Hessian (Fisher Information Matrix) for IRLS
 */
function computeHessian(X: number[][], p: number[]): number[][] {
  const n = X.length;
  const k = X[0].length;
  const hessian = Array(k).fill(0).map(() => new Array(k).fill(0));
  
  for (let i = 0; i < n; i++) {
    const w = p[i] * (1 - p[i]);
    for (let j = 0; j < k; j++) {
      for (let l = 0; l < k; l++) {
        hessian[j][l] -= w * X[i][j] * X[i][l];
      }
    }
  }
  return hessian;
}

/**
 * Matrix inversion (Gauss-Jordan elimination with partial pivoting)
 */
export function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const augmented: number[][] = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let pivotRow = col;
    let maxVal = Math.abs(augmented[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > maxVal) {
        maxVal = Math.abs(augmented[row][col]);
        pivotRow = row;
      }
    }
    [augmented[col], augmented[pivotRow]] = [augmented[pivotRow], augmented[col]];

    const pivot = augmented[col][col];
    if (Math.abs(pivot) < 1e-12) {
      // Singular - add ridge and retry
      const regularized = matrix.map((row, i) =>
        row.map((val, j) => i === j ? val + 1e-6 : val)
      );
      return invertMatrix(regularized);
    }

    for (let j = 0; j < 2 * n; j++) augmented[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = augmented[row][col];
        for (let j = 0; j < 2 * n; j++) augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map(row => row.slice(n));
}

/**
 * Matrix-vector multiplication
 */
function matVecMultiply(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row => row.reduce((sum, val, i) => sum + val * vector[i], 0));
}

/**
 * Vector dot product
 */
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Compute standard errors from Hessian inverse
 */
function computeStdErrors(hessianInv: number[][]): number[] {
  return hessianInv.map((row, i) => Math.sqrt(Math.abs(row[i])));
}

/**
 * Wald test for coefficients
 */
function waldTest(estimate: number, stdError: number): { z: number; p: number } {
  if (stdError === 0) return { z: 0, p: 1 };
  const z = estimate / stdError;
  // Two-tailed p-value using normal approximation
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return { z, p };
}

/**
 * Normal CDF approximation
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
 * Prepare data matrix from raw data
 */
function prepareData(
  data: Array<Record<string, any>>,
  featureNames: string[],
  targetName: string,
  addIntercept: boolean = true
): LogisticRegressionData {
  const X: number[][] = [];
  const y: number[] = [];
  
  for (const row of data) {
    const xRow: number[] = addIntercept ? [1] : [];
    for (const fname of featureNames) {
      const val = row[fname];
      xRow.push(val === null || val === undefined ? 0 : Number(val));
    }
    X.push(xRow);
    y.push(row[targetName] === null || row[targetName] === undefined ? 0 : Number(row[targetName]));
  }
  
  const finalNames = addIntercept ? ['intercept', ...featureNames] : [...featureNames];
  
  return { X, y, feature_names: finalNames };
}

/**
 * Standardize features (mean 0, std 1)
 */
function standardizeFeatures(X: number[][], addIntercept: boolean = true): { X: number[][]; means: number[]; stds: number[] } {
  const n = X.length;
  const k = X[0].length;
  const startIdx = addIntercept ? 1 : 0;
  
  const means: number[] = [];
  const stds: number[] = [];
  
  for (let j = startIdx; j < k; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += X[i][j];
    const mean = sum / n;
    means.push(mean);
    
    let sumSq = 0;
    for (let i = 0; i < n; i++) sumSq += (X[i][j] - mean) ** 2;
    const std = Math.sqrt(sumSq / n) || 1;
    stds.push(std);
  }
  
  const X_std = X.map(row => {
    const newRow = [...row];
    for (let j = startIdx; j < k; j++) {
      newRow[j] = (row[j] - means[j - startIdx]) / stds[j - startIdx];
    }
    return newRow;
  });
  
  return { X: X_std, means, stds };
}

/**
 * Destandardize coefficients
 */
function destandardizeCoefficients(
  coefficients: number[],
  means: number[],
  stds: number[],
  addIntercept: boolean = true
): number[] {
  const destandardized = [...coefficients];
  
  if (addIntercept) {
    // Adjust intercept: beta0_new = beta0 - sum(beta_j * mean_j / std_j)
    let interceptAdj = coefficients[0];
    for (let j = 0; j < means.length; j++) {
      interceptAdj -= coefficients[j + 1] * means[j] / stds[j];
    }
    destandardized[0] = interceptAdj;
    
    // Scale coefficients by 1/std
    for (let j = 0; j < means.length; j++) {
      destandardized[j + 1] = coefficients[j + 1] / stds[j];
    }
  } else {
    for (let j = 0; j < means.length; j++) {
      destandardized[j] = coefficients[j] / stds[j];
    }
  }
  
  return destandardized;
}

/**
 * Compute pseudo R-squared measures
 */
function computePseudoRSquared(
  logLikelihoodFull: number,
  logLikelihoodNull: number,
  n: number
): { mcfadden: number; cox_snell: number; nagelkerke: number } {
  const mcfadden = 1 - logLikelihoodFull / logLikelihoodNull;
  const cox_snell = 1 - Math.exp((2 / n) * (logLikelihoodNull - logLikelihoodFull));
  const nagelkerke = cox_snell / (1 - Math.exp((2 / n) * logLikelihoodNull));
  return { mcfadden, cox_snell, nagelkerke };
}

/**
 * Compute concordance index (C-statistic / AUC)
 */
function computeConcordanceIndex(y: number[], p: number[]): number {
  let concordant = 0;
  let discordant = 0;
  let ties = 0;
  
  for (let i = 0; i < y.length; i++) {
    for (let j = i + 1; j < y.length; j++) {
      if (y[i] === y[j]) continue;
      
      if ((y[i] > y[j] && p[i] > p[j]) || (y[i] < y[j] && p[i] < p[j])) {
        concordant++;
      } else if (p[i] === p[j]) {
        ties++;
      } else {
        discordant++;
      }
    }
  }
  
  const total = concordant + discordant + ties;
  if (total === 0) return 0.5;
  return (concordant + 0.5 * ties) / total;
}

/**
 * Logistic Regression Class
 */
export class LogisticRegression {
  private options: Required<LogisticRegressionOptions>;
  private coefficients: number[] = [];
  private featureNames: string[] = [];
  private standardized = false;
  private standardizationParams: { means: number[]; stds: number[] } | null = null;
  private result: LogisticRegressionResult | null = null;

  constructor(options: LogisticRegressionOptions = {}) {
    this.options = {
      maxIterations: options.maxIterations ?? 100,
      tolerance: options.tolerance ?? 1e-6,
      addIntercept: options.addIntercept ?? true,
      standardize: options.standardize ?? true
    };
  }

  /**
   * Fit logistic regression model using IRLS
   */
  fit(
    data: Array<Record<string, any>>,
    featureNames: string[],
    targetName: string
  ): LogisticRegressionResult {
    this.featureNames = featureNames;
    
    // Prepare data
    let { X, y, feature_names } = prepareData(data, featureNames, targetName, this.options.addIntercept);
    
    // Standardize if requested
    if (this.options.standardize) {
      const standardized = standardizeFeatures(X, this.options.addIntercept);
      X = standardized.X;
      this.standardizationParams = { means: standardized.means, stds: standardized.stds };
      this.standardized = true;
    }
    
    const n = X.length;
    const k = X[0].length;
    
    // Initial coefficients (zeros)
    let beta = new Array(k).fill(0);
    
    // Null model log-likelihood (intercept only)
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const pNull = new Array(n).fill(yMean);
    const logLikelihoodNull = logLikelihood(y, pNull);
    
    // IRLS iterations
    let converged = false;
    let iterations = 0;
    let gradientNorm = Infinity;
    
    for (iterations = 0; iterations < this.options.maxIterations; iterations++) {
      // Compute predicted probabilities
      const p = X.map(row => sigmoid(dotProduct(row, beta)));
      
      // Compute gradient
      const gradient = computeGradient(X, y, p);
      gradientNorm = Math.sqrt(dotProduct(gradient, gradient));
      
      if (gradientNorm < this.options.tolerance) {
        converged = true;
        break;
      }
      
      // Compute Hessian
      const hessian = computeHessian(X, p);
      
      // Invert Hessian
      const hessianInv = invertMatrix(hessian);
      
      // Newton-Raphson update: beta_new = beta - H^{-1} * gradient
      const update = matVecMultiply(hessianInv, gradient);
      for (let j = 0; j < k; j++) {
        beta[j] -= update[j];
      }
    }
    
    // Destandardize coefficients if needed
    if (this.standardized && this.standardizationParams) {
      beta = destandardizeCoefficients(beta, this.standardizationParams.means, this.standardizationParams.stds, this.options.addIntercept);
    }
    
    this.coefficients = beta;
    
    // Final predictions
    const { X: X_final } = prepareData(data, featureNames, targetName, this.options.addIntercept);
    const pFinal = X_final.map(row => sigmoid(dotProduct(row, beta)));
    
    // Compute final log-likelihood
    const logLik = logLikelihood(y, pFinal);
    
    // Compute Hessian at convergence for standard errors
    const hessianFinal = computeHessian(X_final, pFinal);
    const hessianInvFinal = invertMatrix(hessianFinal);
    const stdErrors = computeStdErrors(hessianInvFinal);
    
    // Compute coefficient results
    const coefficients: Record<string, CoefficientResult> = {};
    for (let j = 0; j < feature_names.length; j++) {
      const estimate = beta[j];
      const stdError = stdErrors[j];
      const { z, p } = waldTest(estimate, stdError);
      const oddsRatio = Math.exp(estimate);
      const zAlpha = 1.96; // 95% CI
      
      coefficients[feature_names[j]] = {
        estimate,
        std_error: stdError,
        z_value: z,
        p_value: p,
        odds_ratio: oddsRatio,
        odds_ratio_ci_lower: Math.exp(estimate - zAlpha * stdError),
        odds_ratio_ci_upper: Math.exp(estimate + zAlpha * stdError),
        ci_lower: estimate - zAlpha * stdError,
        ci_upper: estimate + zAlpha * stdError
      };
    }
    
    // Compute model diagnostics
    const deviance = -2 * logLik;
    const nullDeviance = -2 * logLikelihoodNull;
    const aic = -2 * logLik + 2 * k;
    const bic = -2 * logLik + k * Math.log(n);
    const pseudoR2 = computePseudoRSquared(logLik, logLikelihoodNull, n);
    const concordance = computeConcordanceIndex(y, pFinal);
    
    // Marginal effects (average marginal effect for each feature)
    const marginalEffects: Record<string, number> = {};
    if (this.options.addIntercept) {
      for (let j = 1; j < feature_names.length; j++) {
        let sumME = 0;
        for (let i = 0; i < n; i++) {
          const pi = pFinal[i];
          sumME += beta[j] * pi * (1 - pi);
        }
        marginalEffects[feature_names[j]] = sumME / n;
      }
    }
    
    this.result = {
      coefficients,
      model_diagnostics: {
        aic,
        bic,
        log_likelihood: logLik,
        pseudo_r_squared: pseudoR2,
        concordance_index: concordance,
        deviance,
        null_deviance: nullDeviance
      },
      predictions: pFinal,
      marginal_effects: Object.keys(marginalEffects).length > 0 ? marginalEffects : undefined,
      convergence: {
        converged,
        iterations,
        log_likelihood: logLik,
        final_gradient_norm: gradientNorm
      },
      sample_size: n,
      n_parameters: k
    };
    
    return this.result;
  }

  /**
   * Predict probabilities for new data
   */
  predict(data: Array<Record<string, any>>): number[] {
    if (!this.result || this.coefficients.length === 0) {
      throw new Error('Model not fitted. Call fit() first.');
    }
    
    const { X } = prepareData(data, this.featureNames, '', this.options.addIntercept);
    return X.map(row => sigmoid(dotProduct(row, this.coefficients)));
  }

  /**
   * Predict binary classes (0/1) using threshold
   */
  predictClass(data: Array<Record<string, any>>, threshold: number = 0.5): number[] {
    return this.predict(data).map(p => p >= threshold ? 1 : 0);
  }

  /**
   * Get model summary
   */
  getSummary(): LogisticRegressionResult | null {
    return this.result;
  }

  /**
   * Get coefficients as array
   */
  getCoefficients(): number[] {
    return [...this.coefficients];
  }

  /**
   * Get feature names
   */
  getFeatureNames(): string[] {
    return [...this.featureNames];
  }
}

/**
 * Convenience function to run logistic regression
 */
export function runLogisticRegression(
  data: Array<Record<string, any>>,
  featureNames: string[],
  targetName: string,
  options: LogisticRegressionOptions = {}
): LogisticRegressionResult {
  const model = new LogisticRegression(options);
  return model.fit(data, featureNames, targetName);
}

/**
 * Compute odds ratio and confidence interval from coefficient
 */
export function oddsRatioFromCoefficient(
  coefficient: number,
  stdError: number,
  confidence: number = 0.95
): { odds_ratio: number; ci_lower: number; ci_upper: number } {
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
  const oddsRatio = Math.exp(coefficient);
  const margin = z * stdError;
  return {
    odds_ratio: oddsRatio,
    ci_lower: Math.exp(coefficient - margin),
    ci_upper: Math.exp(coefficient + margin)
  };
}

/**
 * Wald test for a single coefficient
 */
export function waldTestCoefficient(
  estimate: number,
  stdError: number
): { z_value: number; p_value: number; significant: boolean } {
  const { z, p } = waldTest(estimate, stdError);
  return {
    z_value: z,
    p_value: p,
    significant: p < 0.05
  };
}

/**
 * Confidence interval for coefficient
 */
export function confidenceInterval(
  estimate: number,
  stdError: number,
  confidence: number = 0.95
): { lower: number; upper: number } {
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
  const margin = z * stdError;
  return {
    lower: estimate - margin,
    upper: estimate + margin
  };
}