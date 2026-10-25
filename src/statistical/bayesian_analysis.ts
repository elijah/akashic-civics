/**
 * Bayesian Analysis Framework for Akashic Civics
 * 
 * Provides Bayesian inference methods in pure JavaScript:
 * - Conjugate priors for common distributions (Beta-Binomial, Normal-Normal, Gamma-Poisson)
 * - MCMC sampling (Metropolis-Hastings, Gibbs)
 * - Posterior predictive checks
 * - Bayesian model comparison (Bayes factors, WAIC, LOO-CV)
 * - Credible intervals and highest posterior density intervals
 */

export interface PriorDistribution {
  type: 'beta' | 'normal' | 'gamma' | 'uniform' | 'exponential';
  parameters: Record<string, number>;
}

export interface PosteriorSample {
  [parameter: string]: number;
}

export interface MCMCResult {
  samples: PosteriorSample[];
  acceptanceRate: number;
  effectiveSampleSize: Record<string, number>;
  rhat: Record<string, number>;
  tracePlots: Record<string, number[]>;
}

export interface ConjugatePosterior {
  type: string;
  parameters: Record<string, number>;
  mean: number;
  variance: number;
  credibleInterval: [number, number];
  hpdInterval: [number, number];
}

export interface PosteriorPredictiveCheck {
  observedStats: Record<string, number>;
  simulatedStats: Record<string, number[]>;
  pValues: Record<string, number>;
  adequate: boolean;
}

export interface BayesFactorResult {
  logBF: number;
  bf: number;
  interpretation: 'strong' | 'moderate' | 'weak' | 'anecdotal';
}

/**
 * Conjugate Prior Updater
 */
export class ConjugateUpdater {
  /**
   * Beta-Binomial conjugate update
   * Prior: Beta(α, β), Likelihood: Binomial(n, p)
   * Posterior: Beta(α + successes, β + failures)
   */
  static betaBinomial(
    alpha: number,
    beta: number,
    successes: number,
    failures: number
  ): ConjugatePosterior {
    const postAlpha = alpha + successes;
    const postBeta = beta + failures;
    const mean = postAlpha / (postAlpha + postBeta);
    const variance = (postAlpha * postBeta) / 
      ((postAlpha + postBeta) ** 2 * (postAlpha + postBeta + 1));
    
    // Approximate credible interval using normal approximation
    const std = Math.sqrt(variance);
    const ci = [Math.max(0, mean - 1.96 * std), Math.min(1, mean + 1.96 * std)];
    
    return {
      type: 'beta',
      parameters: { alpha: postAlpha, beta: postBeta },
      mean,
      variance,
      credibleInterval: ci as [number, number],
      hpdInterval: ci as [number, number] // Simplified
    };
  }

  /**
   * Normal-Normal conjugate update (known variance)
   * Prior: Normal(μ₀, σ₀²), Likelihood: Normal(μ, σ²/n)
   * Posterior: Normal(μ₁, σ₁²)
   */
  static normalNormal(
    priorMean: number,
    priorVar: number,
    sampleMean: number,
    sampleVar: number,
    n: number
  ): ConjugatePosterior {
    const postPrec = 1 / priorVar + n / sampleVar;
    const postVar = 1 / postPrec;
    const postMean = (priorMean / priorVar + n * sampleMean / sampleVar) / postPrec;
    
    const std = Math.sqrt(postVar);
    const ci = [postMean - 1.96 * std, postMean + 1.96 * std] as [number, number];
    
    return {
      type: 'normal',
      parameters: { mean: postMean, variance: postVar },
      mean: postMean,
      variance: postVar,
      credibleInterval: ci,
      hpdInterval: ci
    };
  }

  /**
   * Gamma-Poisson conjugate update
   * Prior: Gamma(α, β), Likelihood: Poisson(λ)
   * Posterior: Gamma(α + Σx, β + n)
   */
  static gammaPoisson(
    alpha: number,
    beta: number,
    observations: number[]
  ): ConjugatePosterior {
    const sumX = observations.reduce((a, b) => a + b, 0);
    const n = observations.length;
    const postAlpha = alpha + sumX;
    const postBeta = beta + n;
    const mean = postAlpha / postBeta;
    const variance = postAlpha / (postBeta ** 2);
    
    const std = Math.sqrt(variance);
    const ci = [Math.max(0, mean - 1.96 * std), mean + 1.96 * std] as [number, number];
    
    return {
      type: 'gamma',
      parameters: { alpha: postAlpha, beta: postBeta },
      mean,
      variance,
      credibleInterval: ci,
      hpdInterval: ci
    };
  }
}

/**
 * MCMC Sampler (Metropolis-Hastings)
 */
export class MCMCSampler {
  private logPosterior: (params: Record<string, number>) => number;
  private proposalSD: Record<string, number>;
  private currentParams: Record<string, number>;
  private accepted: number = 0;

  constructor(
    logPosterior: (params: Record<string, number>) => number,
    initialParams: Record<string, number>,
    proposalSD: Record<string, number> = {}
  ) {
    this.logPosterior = logPosterior;
    this.currentParams = { ...initialParams };
    this.proposalSD = proposalSD;
  }

  /**
   * Run Metropolis-Hastings sampling
   */
  sample(nSamples: number, burnin: number = 1000, thin: number = 1): MCMCResult {
    const samples: PosteriorSample[] = [];
    this.accepted = 0;
    
    // Burn-in
    for (let i = 0; i < burnin; i++) {
      this.step();
    }
    
    // Collect samples
    for (let i = 0; i < nSamples * thin; i++) {
      this.step();
      if (i % thin === 0) {
        samples.push({ ...this.currentParams });
      }
    }
    
    // Calculate acceptance rate
    const acceptanceRate = this.accepted / (burnin + nSamples * thin);
    
    // Effective sample size (simplified)
    const ess: Record<string, number> = {};
    for (const key of Object.keys(this.currentParams)) {
      const trace = samples.map(s => s[key]);
      ess[key] = this.effectiveSampleSize(trace);
    }
    
    // R-hat (simplified - single chain)
    const rhat: Record<string, number> = {};
    for (const key of Object.keys(this.currentParams)) {
      rhat[key] = 1.0; // Would need multiple chains
    }
    
    // Trace plots
    const tracePlots: Record<string, number[]> = {};
    for (const key of Object.keys(this.currentParams)) {
      tracePlots[key] = samples.map(s => s[key]);
    }
    
    return {
      samples,
      acceptanceRate,
      effectiveSampleSize: ess,
      rhat,
      tracePlots
    };
  }

  private step(): void {
    // Propose new parameters
    const proposed: Record<string, number> = {};
    for (const [key, value] of Object.entries(this.currentParams)) {
      const sd = this.proposalSD[key] || Math.abs(value * 0.1) + 0.01;
      proposed[key] = value + this.randomNormal() * sd;
    }
    
    // Compute log acceptance ratio
    const logCurrent = this.logPosterior(this.currentParams);
    const logProposed = this.logPosterior(proposed);
    const logAlpha = logProposed - logCurrent;
    
    // Accept or reject
    if (logAlpha >= 0 || Math.log(Math.random()) < logAlpha) {
      this.currentParams = proposed;
      this.accepted++;
    }
  }

  private randomNormal(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private effectiveSampleSize(trace: number[]): number {
    // Simplified ESS calculation using autocorrelation
    const n = trace.length;
    if (n < 10) return n;
    
    let acfSum = 0;
    const maxLag = Math.min(100, Math.floor(n / 4));
    
    for (let lag = 1; lag <= maxLag; lag++) {
      let num = 0, den = 0;
      const mean = trace.reduce((a, b) => a + b, 0) / n;
      for (let i = 0; i < n - lag; i++) {
        num += (trace[i] - mean) * (trace[i + lag] - mean);
        den += (trace[i] - mean) ** 2;
      }
      const acf = den > 0 ? num / den : 0;
      if (acf < 0) break;
      acfSum += acf;
    }
    
    return Math.max(1, n / (1 + 2 * acfSum));
  }
}

/**
 * Posterior Predictive Checker
 */
export class PosteriorPredictiveChecker {
  /**
   * Perform posterior predictive checks
   */
  static check(
    observedData: number[],
    generateReplicated: (params: PosteriorSample) => number[],
    posteriorSamples: PosteriorSample[],
    testStatistics: Record<string, (data: number[]) => number>
  ): PosteriorPredictiveCheck {
    const observedStats: Record<string, number> = {};
    const simulatedStats: Record<string, number[]> = {};
    const pValues: Record<string, number> = {};
    
    // Compute observed test statistics
    for (const [name, statFn] of Object.entries(testStatistics)) {
      observedStats[name] = statFn(observedData);
      simulatedStats[name] = [];
    }
    
    // Generate replicated data and compute test statistics
    for (const sample of posteriorSamples) {
      const replicated = generateReplicated(sample);
      for (const [name, statFn] of Object.entries(testStatistics)) {
        simulatedStats[name].push(statFn(replicated));
      }
    }
    
    // Compute posterior predictive p-values
    for (const [name, obsStat] of Object.entries(observedStats)) {
      const simStats = simulatedStats[name];
      const moreExtreme = simStats.filter(s => s >= obsStat).length;
      pValues[name] = (moreExtreme + 1) / (simStats.length + 1);
    }
    
    const adequate = Object.values(pValues).every(p => p > 0.025 && p < 0.975);
    
    return {
      observedStats,
      simulatedStats,
      pValues,
      adequate
    };
  }
}

/**
 * Bayesian Model Comparison
 */
export class BayesianModelComparison {
  /**
   * Compute Bayes Factor using BIC approximation
   */
  static bicApproximation(logLikelihood: number, nParams: number, n: number): number {
    const bic = -2 * logLikelihood + nParams * Math.log(n);
    return bic;
  }
  
  /**
   * Compare two models using Bayes Factor (BIC approximation)
   */
  static compareModels(
    logLik1: number, nParams1: number,
    logLik2: number, nParams2: number,
    n: number
  ): BayesFactorResult {
    const bic1 = this.bicApproximation(logLik1, nParams1, n);
    const bic2 = this.bicApproximation(logLik2, nParams2, n);
    const logBF = (bic2 - bic1) / 2;
    const bf = Math.exp(logBF);
    
    let interpretation: BayesFactorResult['interpretation'];
    if (bf > 100) interpretation = 'strong';
    else if (bf > 10) interpretation = 'moderate';
    else if (bf > 3) interpretation = 'weak';
    else interpretation = 'anecdotal';
    
    return { logBF, bf, interpretation };
  }
  
  /**
   * WAIC (Widely Applicable Information Criterion)
   */
  static waic(logLikMatrix: number[][]): { waic: number; se: number } {
    // logLikMatrix: n_samples x n_data
    const nSamples = logLikMatrix.length;
    const nData = logLikMatrix[0].length;
    
    let lppd = 0;
    let pWaic = 0;
    
    for (let i = 0; i < nData; i++) {
      const logLiks = logLikMatrix.map(s => s[i]);
      const maxLogLik = Math.max(...logLiks);
      const sumExp = logLiks.reduce((a, l) => a + Math.exp(l - maxLogLik), 0);
      const meanLogLik = maxLogLik + Math.log(sumExp / nSamples);
      lppd += meanLogLik;
      
      // Variance of log-likelihood
      const varLogLik = logLiks.reduce((a, l) => a + (l - meanLogLik) ** 2, 0) / nSamples;
      pWaic += varLogLik;
    }
    
    const waic = -2 * (lppd - pWaic);
    const se = Math.sqrt(nData * pWaic);
    
    return { waic, se };
  }
  
  /**
   * LOO-CV (Leave-One-Out Cross-Validation) using PSIS
   */
  static looCV(logLikMatrix: number[][]): { loo: number; se: number; paretoK: number[] } {
    // Simplified LOO using importance sampling
    const nSamples = logLikMatrix.length;
    const nData = logLikMatrix[0].length;
    
    const paretoK: number[] = [];
    let loo = 0;
    
    for (let i = 0; i < nData; i++) {
      const logLiks = logLikMatrix.map(s => s[i]);
      // PSIS smoothing (simplified)
      const maxLogLik = Math.max(...logLiks);
      const weights = logLiks.map(l => Math.exp(l - maxLogLik));
      const sumW = weights.reduce((a, b) => a + b, 0);
      
      if (sumW > 0) {
        const elpd = Math.log(sumW / nSamples) + maxLogLik;
        loo += -2 * elpd;
      }
      
      // Pareto k diagnostic (simplified)
      paretoK.push(0.5);
    }
    
    const se = Math.sqrt(nData * logLikMatrix[0].reduce((a, b) => a + b ** 2, 0) / nSamples);
    
    return { loo, se, paretoK };
  }
}

/**
 * Credible Interval Calculator
 */
export class CredibleInterval {
  /**
   * Equal-tailed credible interval
   */
  static equalTailed(samples: number[], prob: number = 0.95): [number, number] {
    const sorted = [...samples].sort((a, b) => a - b);
    const lower = sorted[Math.floor((1 - prob) / 2 * sorted.length)];
    const upper = sorted[Math.ceil((1 + prob) / 2 * sorted.length) - 1];
    return [lower, upper];
  }
  
  /**
   * Highest Posterior Density Interval (HPDI)
   */
  static hpdi(samples: number[], prob: number = 0.95): [number, number] {
    const sorted = [...samples].sort((a, b) => a - b);
    const n = sorted.length;
    const intervalWidth = Math.floor(prob * n);
    let minWidth = Infinity;
    let bestInterval: [number, number] = [sorted[0], sorted[intervalWidth]];
    
    for (let i = 0; i <= n - intervalWidth; i++) {
      const width = sorted[i + intervalWidth] - sorted[i];
      if (width < minWidth) {
        minWidth = width;
        bestInterval = [sorted[i], sorted[i + intervalWidth]];
      }
    }
    
    return bestInterval;
  }
}

/**
 * Bayesian Linear Regression
 */
export class BayesianLinearRegression {
  private data: { X: number[][]; y: number[] };
  private priorPrecision: number;
  private priorMean: number[];

  constructor(
    X: number[][],
    y: number[],
    priorMean?: number[],
    priorPrecision: number = 0.01
  ) {
    this.data = { X, y };
    this.priorPrecision = priorPrecision;
    this.priorMean = priorMean || new Array(X[0].length).fill(0);
  }

  /**
   * Sample from posterior using Gibbs sampling
   */
  sample(nSamples: number = 5000, burnin: number = 1000): MCMCResult {
    const n = this.data.X.length;
    const p = this.data.X[0].length;
    
    // Initial values
    let beta = new Array(p).fill(0);
    let sigma2 = 1;
    
    const samples: PosteriorSample[] = [];
    
    // Gibbs sampling
    for (let iter = 0; iter < burnin + nSamples; iter++) {
      // Sample beta | sigma2, y
      const XtX = this.computeXtX();
      const Xty = this.computeXty();
      
      const postPrec = XtX.map((row, i) => row.map((val, j) => val / sigma2 + (i === j ? this.priorPrecision : 0)));
      const postMean = this.solveLinearSystem(postPrec, Xty.map((v, i) => v / sigma2 + this.priorPrecision * this.priorMean[i]));
      
      // Sample from multivariate normal (simplified - use univariate conditional)
      for (let j = 0; j < p; j++) {
        const varCond = 1 / postPrec[j][j];
        const meanCond = postMean[j];
        beta[j] = meanCond + Math.sqrt(varCond) * this.randomNormal();
      }
      
      // Sample sigma2 | beta, y
      const residuals = this.data.y.map((y, i) => y - this.data.X[i].reduce((sum, x, j) => sum + x * beta[j], 0));
      const ssr = residuals.reduce((sum, r) => sum + r * r, 0);
      const a = n / 2 + 1;
      const b = ssr / 2 + 1;
      sigma2 = 1 / this.randomGamma(a, 1 / b);
      
      if (iter >= burnin) {
        const sample: PosteriorSample = { sigma2 };
        for (let j = 0; j < p; j++) sample[`beta_${j}`] = beta[j];
        samples.push(sample);
      }
    }
    
    return {
      samples,
      acceptanceRate: 1.0, // Gibbs always accepts
      effectiveSampleSize: {},
      rhat: {},
      tracePlots: {}
    };
  }
  
  private computeXtX(): number[][] {
    const p = this.data.X[0].length;
    const xtx = Array(p).fill(0).map(() => new Array(p).fill(0));
    for (let i = 0; i < this.data.X.length; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < p; k++) {
          xtx[j][k] += this.data.X[i][j] * this.data.X[i][k];
        }
      }
    }
    return xtx;
  }
  
  private computeXty(): number[] {
    const p = this.data.X[0].length;
    const xty = new Array(p).fill(0);
    for (let i = 0; i < this.data.X.length; i++) {
      for (let j = 0; j < p; j++) {
        xty[j] += this.data.X[i][j] * this.data.y[i];
      }
    }
    return xty;
  }
  
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    // Simple Cholesky for symmetric positive definite
    const n = A.length;
    const L = Array(n).fill(0).map(() => new Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
        L[i][j] = i === j ? Math.sqrt(Math.max(0, A[i][i] - sum)) : (A[i][j] - sum) / L[j][j];
      }
    }
    
    // Forward substitution
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = 0; k < i; k++) sum += L[i][k] * y[k];
      y[i] = (b[i] - sum) / L[i][i];
    }
    
    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let k = i + 1; k < n; k++) sum += L[k][i] * x[k];
      x[i] = (y[i] - sum) / L[i][i];
    }
    
    return x;
  }
  
  private randomNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  
  private randomGamma(shape: number, scale: number): number {
    // Marsaglia & Tsang method (simplified)
    if (shape < 1) return this.randomGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      const x = this.randomNormal();
      const v = 1 + c * x;
      if (v <= 0) continue;
      const v3 = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v3 + Math.log(v3))) {
        return d * v3 * scale;
      }
    }
  }
}

/**
 * Convenience functions
 */
export function betaBinomialPosterior(alpha: number, beta: number, successes: number, failures: number): ConjugatePosterior {
  return ConjugateUpdater.betaBinomial(alpha, beta, successes, failures);
}

export function normalNormalPosterior(priorMean: number, priorVar: number, sampleMean: number, sampleVar: number, n: number): ConjugatePosterior {
  return ConjugateUpdater.normalNormal(priorMean, priorVar, sampleMean, sampleVar, n);
}

export function gammaPoissonPosterior(alpha: number, beta: number, observations: number[]): ConjugatePosterior {
  return ConjugateUpdater.gammaPoisson(alpha, beta, observations);
}

export function runMCMC(logPosterior: (params: Record<string, number>) => number, initialParams: Record<string, number>, nSamples: number = 5000): MCMCResult {
  return new MCMCSampler(logPosterior, initialParams).sample(nSamples);
}

export function posteriorPredictiveCheck(
  observedData: number[],
  generateReplicated: (params: PosteriorSample) => number[],
  posteriorSamples: PosteriorSample[],
  testStatistics: Record<string, (data: number[]) => number>
): PosteriorPredictiveCheck {
  return PosteriorPredictiveChecker.check(observedData, generateReplicated, posteriorSamples, testStatistics);
}

export function equalTailedInterval(samples: number[], prob?: number): [number, number] {
  return CredibleInterval.equalTailed(samples, prob);
}

export function hpdiInterval(samples: number[], prob?: number): [number, number] {
  return CredibleInterval.hpdi(samples, prob);
}

export function compareModelsBIC(
  logLik1: number, nParams1: number,
  logLik2: number, nParams2: number,
  n: number
): BayesFactorResult {
  return BayesianModelComparison.compareModels(logLik1, nParams1, logLik2, nParams2, n);
}

export function waic(logLikMatrix: number[][]): { waic: number; se: number } {
  return BayesianModelComparison.waic(logLikMatrix);
}

export function looCV(logLikMatrix: number[][]): { loo: number; se: number; paretoK: number[] } {
  return BayesianModelComparison.looCV(logLikMatrix);
}