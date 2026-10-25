import {
  MCMCSampler,
  BayesianLinearRegression,
  betaBinomialPosterior,
  normalNormalPosterior,
  gammaPoissonPosterior,
  runMCMC,
  posteriorPredictiveCheck,
  equalTailedInterval,
  hpdiInterval,
  compareModelsBIC,
  waic,
  looCV
} from '../bayesian_analysis';

describe('ConjugateUpdater', () => {
  test('betaBinomial: should update Beta prior with Binomial data', () => {
    // Prior: Beta(2, 2), Data: 10 successes, 5 failures
    const result = betaBinomialPosterior(2, 2, 10, 5);

    expect(result.type).toBe('beta');
    expect(result.parameters.alpha).toBe(12);
    expect(result.parameters.beta).toBe(7);
    expect(result.mean).toBeCloseTo(12 / 19, 5);
  });

  test('betaBinomial: mean should be between prior and MLE', () => {
    const priorMean = 2 / (2 + 2); // 0.5
    const mle = 10 / 15; // 0.667
    const result = betaBinomialPosterior(2, 2, 10, 5);

    expect(result.mean).toBeGreaterThan(priorMean);
    expect(result.mean).toBeLessThan(mle);
  });

  test('normalNormal: should update Normal prior with Normal data', () => {
    const result = normalNormalPosterior(
      0, // prior mean
      1, // prior variance
      2, // sample mean
      1, // sample variance
      25 // n
    );

    expect(result.type).toBe('normal');
    // Posterior mean should be close to sample mean with large n
    expect(result.mean).toBeGreaterThan(1.5);
    expect(result.mean).toBeLessThan(2.5);
  });

  test('gammaPoisson: should update Gamma prior with Poisson data', () => {
    const result = gammaPoissonPosterior(
      2, // alpha
      1, // beta
      [3, 4, 2, 5, 1] // observations
    );

    expect(result.type).toBe('gamma');
    expect(result.parameters.alpha).toBe(2 + 15); // 17
    expect(result.parameters.beta).toBe(1 + 5);   // 6
    expect(result.mean).toBeCloseTo(17 / 6, 5);
  });

  test('credible intervals should contain the mean', () => {
    const result = betaBinomialPosterior(2, 2, 10, 5);
    expect(result.credibleInterval[0]).toBeLessThan(result.mean);
    expect(result.credibleInterval[1]).toBeGreaterThan(result.mean);
  });
});

describe('MCMCSampler', () => {
  test('should sample from a simple normal posterior', () => {
    // Simple normal likelihood with known variance, normal prior
    const logPosterior = (params: Record<string, number>) => {
      const mu = params.mu;
      // Likelihood: Normal(1, 0.25) with n=10
      // Prior: Normal(0, 1)
      const logLik = -10 * (1 - mu) ** 2 / (2 * 0.25);
      const logPrior = -(mu ** 2) / 2;
      return logLik + logPrior;
    };

    const sampler = new MCMCSampler(logPosterior, { mu: 0 }, { mu: 0.1 });
    const result = sampler.sample(1000, 100);

    expect(result.samples.length).toBe(1000);
    expect(result.acceptanceRate).toBeGreaterThan(0.1);
    expect(result.acceptanceRate).toBeLessThan(1);
    expect(result.effectiveSampleSize.mu).toBeGreaterThan(0);
  });

  test('should compute trace plots', () => {
    const logPosterior = (params: Record<string, number>) => {
      return -((params.mu - 1) ** 2) / 2; // Simple normal
    };

    const sampler = new MCMCSampler(logPosterior, { mu: 0 });
    const result = sampler.sample(100, 50);

    expect(result.tracePlots.mu).toBeDefined();
    expect(result.tracePlots.mu.length).toBe(100);
  });
});

describe('PosteriorPredictiveChecker', () => {
  test('should perform posterior predictive check', () => {
    const observed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Simple normal model
    const samples = Array.from({ length: 50 }, () => ({ mu: 5 + Math.random() * 2 }));
    const generateReplicated = (p: Record<string, number>) =>
      Array.from({ length: 10 }, () => p.mu + (Math.random() - 0.5) * 2);

    const testStats = {
      mean: (data: number[]) => data.reduce((a, b) => a + b, 0) / data.length,
      variance: (data: number[]) => {
        const m = data.reduce((a, b) => a + b, 0) / data.length;
        return data.reduce((a, b) => a + (b - m) ** 2, 0) / data.length;
      }
    };

    const result = posteriorPredictiveCheck(observed, generateReplicated, samples, testStats);

    expect(result.observedStats.mean).toBeCloseTo(5.5, 1);
    expect(result.simulatedStats.mean.length).toBe(50);
    expect(result.pValues.mean).toBeGreaterThanOrEqual(0);
    expect(result.pValues.mean).toBeLessThanOrEqual(1);
    expect(typeof result.adequate).toBe('boolean');
  });
});

describe('BayesianModelComparison', () => {
  test('should compare models using BIC approximation', () => {
    // Model 1: simpler, slightly worse fit
    // Model 2: more complex, slightly better fit
    const result = compareModelsBIC(
      -50, 2, // logLik, params for model 1
      -45, 5, // logLik, params for model 2
      100    // n
    );

    expect(result.logBF).toBeDefined();
    expect(result.bf).toBeGreaterThan(0);
    expect(['strong', 'moderate', 'weak', 'anecdotal']).toContain(result.interpretation);
  });

  test('should compute WAIC', () => {
    // n_samples x n_data log-likelihood matrix
    const logLik = [
      [-1, -2, -3, -1.5],
      [-1.1, -2.1, -3.1, -1.6],
      [-0.9, -1.9, -2.9, -1.4]
    ];

    const result = waic(logLik);
    expect(result.waic).toBeGreaterThan(0);
    expect(result.se).toBeGreaterThan(0);
  });

  test('should compute LOO-CV', () => {
    const logLik = [
      [-1, -2, -3],
      [-1.1, -2.1, -3.1],
      [-0.9, -1.9, -2.9]
    ];

    const result = looCV(logLik);
    expect(result.loo).toBeGreaterThan(0);
    expect(result.se).toBeGreaterThan(0);
    expect(result.paretoK.length).toBe(3);
  });
});

describe('CredibleInterval', () => {
  test('equalTailedInterval should contain central probability', () => {
    // Generate from normal(0, 1)
    const samples = Array.from({ length: 10000 }, () => {
      // Box-Muller
      const u1 = Math.random(), u2 = Math.random();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    });

    const ci = equalTailedInterval(samples, 0.95);
    expect(ci[0]).toBeLessThan(-1.5);
    expect(ci[1]).toBeGreaterThan(1.5);
    expect(ci[0]).toBeGreaterThan(-3);
    expect(ci[1]).toBeLessThan(3);
  });

  test('hpdiInterval should be narrower or equal to equal-tailed', () => {
    const samples = Array.from({ length: 5000 }, () => Math.random() * 10);
    const eq = equalTailedInterval(samples, 0.9);
    const hpdi = hpdiInterval(samples, 0.9);

    const eqWidth = eq[1] - eq[0];
    const hpdiWidth = hpdi[1] - hpdi[0];
    expect(hpdiWidth).toBeLessThanOrEqual(eqWidth + 1); // Allow small tolerance
  });
});

describe('BayesianLinearRegression', () => {
  test('should sample from posterior', () => {
    // Simple linear regression: y = 2*x + 1 + noise
    const X = [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]];
    const y = [1, 3, 5, 7, 9].map(v => v + (Math.random() - 0.5) * 0.5);

    const blr = new BayesianLinearRegression(X, y);
    const result = blr.sample(500, 200);

    expect(result.samples.length).toBe(500);
    expect(result.samples[0]).toHaveProperty('beta_0');
    expect(result.samples[0]).toHaveProperty('beta_1');
    expect(result.samples[0]).toHaveProperty('sigma2');
  });
});

describe('Convenience functions', () => {
  test('betaBinomialPosterior should work', () => {
    const result = betaBinomialPosterior(1, 1, 5, 5);
    expect(result.parameters.alpha).toBe(6);
    expect(result.parameters.beta).toBe(6);
  });

  test('normalNormalPosterior should work', () => {
    const result = normalNormalPosterior(0, 1, 1, 1, 10);
    expect(result.parameters.mean).toBeGreaterThan(0);
    expect(result.parameters.mean).toBeLessThan(1);
  });

  test('gammaPoissonPosterior should work', () => {
    const result = gammaPoissonPosterior(1, 1, [2, 3, 1]);
    expect(result.parameters.alpha).toBe(7);
    expect(result.parameters.beta).toBe(4);
  });

  test('runMCMC should return samples', () => {
    const logPost = (p: Record<string, number>) => -(p.x ** 2) / 2;
    const result = runMCMC(logPost, { x: 0 }, 100);
    expect(result.samples.length).toBe(100);
  });

  test('compareModelsBIC should work', () => {
    const result = compareModelsBIC(-10, 2, -12, 3, 50);
    expect(result.bf).toBeGreaterThan(0);
  });
});