import { LogisticRegression, runLogisticRegression, oddsRatioFromCoefficient, waldTestCoefficient, confidenceInterval } from '../logistic_regression';

describe('LogisticRegression', () => {
  // Synthetic dataset with a known relationship: y = 1 if x1 > 0.5
  const generateData = (n: number = 200, seed: number = 42) => {
    // Simple LCG for deterministic data
    let state = seed;
    const rand = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };

    return Array.from({ length: n }, (_, i) => {
      const x1 = rand();
      const x2 = rand();
      const logit = 3 * (x1 - 0.5) + 0.5 * (x2 - 0.5);
      const p = 1 / (1 + Math.exp(-logit));
      const y = rand() < p ? 1 : 0;
      return { x1, x2, y, id: i };
    });
  };

  test('should initialize with default options', () => {
    const model = new LogisticRegression();
    expect(model).toBeDefined();
  });

  test('should fit a logistic regression model', () => {
    const data = generateData();
    const result = runLogisticRegression(data, ['x1', 'x2'], 'y');

    expect(result.sample_size).toBe(200);
    expect(result.n_parameters).toBe(3); // intercept + 2 features
    expect(result.coefficients['x1']).toBeDefined();
    expect(result.coefficients['x2']).toBeDefined();
    expect(result.coefficients['intercept']).toBeDefined();
  });

  test('should converge', () => {
    const data = generateData();
    const result = runLogisticRegression(data, ['x1', 'x2'], 'y');
    expect(result.convergence.converged).toBe(true);
  });

  test('should produce valid coefficients with standard errors', () => {
    const data = generateData();
    const result = runLogisticRegression(data, ['x1', 'x2'], 'y');

    for (const coef of Object.values(result.coefficients)) {
      expect(Number.isFinite(coef.estimate)).toBe(true);
      expect(Number.isFinite(coef.std_error)).toBe(true);
      expect(Number.isFinite(coef.p_value)).toBe(true);
      expect(coef.p_value).toBeGreaterThanOrEqual(0);
      expect(coef.p_value).toBeLessThanOrEqual(1);
    }
  });

  test('should recover the strong signal on x1', () => {
    const data = generateData(500);
    const result = runLogisticRegression(data, ['x1', 'x2'], 'y');
    // x1 has a coefficient of ~3 in the generating process
    expect(result.coefficients['x1'].estimate).toBeGreaterThan(0.5);
  });

  test('should compute odds ratios correctly', () => {
    const data = generateData();
    const result = runLogisticRegression(data, ['x1', 'x2'], 'y');

    const coef = result.coefficients['x1'];
    expect(coef.odds_ratio).toBeCloseTo(Math.exp(coef.estimate), 10);
    expect(coef.odds_ratio_ci_lower).toBeLessThan(coef.odds_ratio);
    expect(coef.odds_ratio_ci_upper).toBeGreaterThan(coef.odds_ratio);
  });

  test('should compute model diagnostics', () => {
    const data = generateData();
    const result = runLogisticRegression(data, ['x1', 'x2'], 'y');

    expect(result.model_diagnostics.aic).toBeGreaterThan(0);
    expect(result.model_diagnostics.bic).toBeGreaterThan(0);
    expect(result.model_diagnostics.log_likelihood).toBeLessThan(0);
    expect(result.model_diagnostics.concordance_index).toBeGreaterThan(0.5);
    expect(result.model_diagnostics.concordance_index).toBeLessThanOrEqual(1);
  });

  test('should compute pseudo R-squared measures', () => {
    const data = generateData();
    const result = runLogisticRegression(data, ['x1', 'x2'], 'y');

    expect(result.model_diagnostics.pseudo_r_squared.mcfadden).toBeGreaterThan(0);
    expect(result.model_diagnostics.pseudo_r_squared.mcfadden).toBeLessThan(1);
  });

  test('should generate predictions for training data', () => {
    const data = generateData();
    const model = new LogisticRegression();
    model.fit(data, ['x1', 'x2'], 'y');

    const predictions = model.predict(data);
    expect(predictions.length).toBe(200);
    for (const p of predictions) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  test('should generate class predictions', () => {
    const data = generateData();
    const model = new LogisticRegression();
    model.fit(data, ['x1', 'x2'], 'y');

    const classes = model.predictClass(data);
    expect(classes.length).toBe(200);
    for (const c of classes) {
      expect([0, 1]).toContain(c);
    }
  });

  test('should throw error when predicting before fitting', () => {
    const model = new LogisticRegression();
    expect(() => model.predict([{ x1: 1, x2: 1 }])).toThrow();
  });

  test('should compute marginal effects', () => {
    const data = generateData();
    const result = runLogisticRegression(data, ['x1', 'x2'], 'y');
    expect(result.marginal_effects).toBeDefined();
    expect(result.marginal_effects!['x1']).toBeDefined();
  });
});

describe('Helper functions', () => {
  test('oddsRatioFromCoefficient should compute correctly', () => {
    const result = oddsRatioFromCoefficient(0.5, 0.1);
    expect(result.odds_ratio).toBeCloseTo(Math.exp(0.5), 10);
    expect(result.ci_lower).toBeLessThan(result.odds_ratio);
    expect(result.ci_upper).toBeGreaterThan(result.odds_ratio);
  });

  test('waldTestCoefficient should detect significance', () => {
    const significant = waldTestCoefficient(2.0, 0.5);
    expect(significant.p_value).toBeLessThan(0.05);
    expect(significant.significant).toBe(true);

    const notSignificant = waldTestCoefficient(0.1, 1.0);
    expect(notSignificant.p_value).toBeGreaterThan(0.05);
    expect(notSignificant.significant).toBe(false);
  });

  test('confidenceInterval should bracket the estimate', () => {
    const ci = confidenceInterval(1.5, 0.2);
    expect(ci.lower).toBeLessThan(1.5);
    expect(ci.upper).toBeGreaterThan(1.5);
  });
});
