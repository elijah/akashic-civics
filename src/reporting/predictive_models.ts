/**
 * Predictive Models for Red Flag Reporter
 * Time series forecasting, trend extrapolation with uncertainty, intervention impact simulation
 */

export interface ForecastResult {
  model: string;
  forecastPeriods: number;
  pointForecast: Array<{ period: number; value: number }>;
  confidenceInterval: Array<{ period: number; lower: number; upper: number }>;
  accuracy: {
    mae: number;
    rmse: number;
    mape: number;
  };
  description: string;
}

export interface TrendExtrapolation {
  currentValue: number;
  projectedValue: number;
  changePoints: Array<{ period: number; value: number }>;
  trendSlope: number;
  uncertaintyBand: Array<{ period: number; lower: number; upper: number }>;
}

export interface InterventionScenario {
  scenarioId: string;
  scenarioName: string;
  description: string;
  assumedEffectSize: number; // e.g., reduction in disparity gap
  projectedOutcome: Array<{ period: number; value: number }>;
  baselineOutcome: Array<{ period: number; value: number }>;
  impactReduction: number; // absolute reduction in final value
  confidenceInterval: [number, number];
}

/**
 * Simple exponential smoothing forecast (Holt-Winters without seasonality).
 * Good for short-term projections of disparity metrics.
 */
export function exponentialSmoothingForecast(
  historical: Array<{ period: number; value: number }>,
  periods: number = 6,
  alpha: number = 0.3
): ForecastResult {
  if (historical.length === 0) {
    return emptyForecast(periods);
  }

  // Level update: L_t = alpha * Y_t + (1 - alpha) * L_{t-1}
  let level = historical[0].value;

  for (let i = 1; i < historical.length; i++) {
    level = alpha * historical[i].value + (1 - alpha) * level;
  }

  // Compute forecast errors for accuracy
  const fitted: number[] = [];
  for (let i = 1; i < historical.length; i++) {
    const prevLevel = historical[i - 1].value; // one-step-ahead fitted from prior level
    fitted.push(prevLevel);
  }

  // Simple forecast: constant at last level
  const lastPeriod = historical[historical.length - 1].period;
  const pointForecast = Array.from({ length: periods }, (_, i) => ({
    period: lastPeriod + i + 1,
    value: level,
  }));

  // Constant-width CI growing with horizon
  const residuals = historical.map((d, i) => {
    if (i === 0) return 0;
    return d.value - historical[i - 1].value;
  });
  const residStd =
    residuals.length > 1
      ? Math.sqrt(
          residuals.reduce((s, r) => s + r * r, 0) /
            (residuals.length - 1)
        )
      : 0;

  const confidenceInterval = pointForecast.map((p, i) => ({
    period: p.period,
    lower: p.value - 1.96 * residStd * Math.sqrt(i + 1),
    upper: p.value + 1.96 * residStd * Math.sqrt(i + 1),
  }));

  // Accuracy on one-step-ahead fitted values
  let mae = 0, rmse = 0, mape = 0;
  let n = 0;
  for (let i = 1; i < historical.length; i++) {
    const actual = historical[i].value;
    const pred = fitted[i - 1];
    mae += Math.abs(actual - pred);
    rmse += (actual - pred) ** 2;
    mape += actual !== 0 ? Math.abs((actual - pred) / actual) : 0;
    n++;
  }
  if (n > 0) {
    mae /= n;
    rmse = Math.sqrt(rmse / n);
    mape = (mape / n) * 100;
  }

  return {
    model: 'single exponential smoothing',
    forecastPeriods: periods,
    pointForecast,
    confidenceInterval,
    accuracy: { mae, rmse, mape },
    description: `Single exponential smoothing (alpha=${alpha}) projecting ${periods} periods`,
  };
}

/**
 * Linear trend extrapolation with uncertainty band.
 * Extrapolates the current trend forward using least squares.
 */
export function extrapolateTrend(
  historical: Array<{ period: number; value: number }>,
  periods: number = 6
): TrendExtrapolation {
  if (historical.length < 2) {
    return {
      currentValue: historical[0]?.value ?? 0,
      projectedValue: historical[0]?.value ?? 0,
      changePoints: [],
      trendSlope: 0,
      uncertaintyBand: [],
    };
  }

  const n = historical.length;
  const x = historical.map((_, i) => i);
  const y = historical.map(d => d.value);

  // Least squares: y = a + b*x
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const covXY = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const varX = x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0);

  const slope = varX > 0 ? covXY / varX : 0;
  const intercept = meanY - slope * meanX;

  // Residual standard error, floored relative to the series scale so that a
  // perfectly linear series does not yield a degenerate (zero-width) band.
  const residuals = y.map((yi, i) => yi - (intercept + slope * x[i]));
  const scale = Math.abs(meanY) || 1;
  const sigmaFloor = 0.01 * scale;
  const residStd =
    n > 2
      ? Math.max(
          Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (n - 2)),
          sigmaFloor
        )
      : sigmaFloor;

  // Extrapolate forward
  const lastX = x[n - 1];
  const currentValue = y[n - 1];
  const projectedValue = intercept + slope * (lastX + periods);

  const changePoints = historical.map(d => ({ period: d.period, value: d.value }));

  // Uncertainty band widens with horizon
  const uncertaintyBand = Array.from({ length: periods }, (_, h) => {
    const xFuture = lastX + h + 1;
    const pred = intercept + slope * xFuture;
    const sqrtTerm = varX > 0 ? (xFuture - meanX) ** 2 / varX : 0;
    const seFuture = residStd * Math.sqrt(1 + 1 / n + sqrtTerm);
    return {
      period: lastX + h + 1,
      lower: pred - 1.96 * seFuture,
      upper: pred + 1.96 * seFuture,
    };
  });

  return {
    currentValue,
    projectedValue,
    changePoints,
    trendSlope: slope,
    uncertaintyBand,
  };
}

/**
 * Simulate intervention impact.
 * Models a step-change at a given intervention period assuming the effect size
 * decays linearly to zero over a specified persistence horizon.
 */
export function simulateIntervention(
  baselineForecast: Array<{ period: number; value: number }>,
  interventionPeriod: number,
  assumedEffectSize: number,
  persistencePeriods: number = 12
): InterventionScenario {
  const projectedOutcome: Array<{ period: number; value: number }> = [];
  const baselineOutcome: Array<{ period: number; value: number }> = [];

  for (const p of baselineForecast) {
    baselineOutcome.push({ period: p.period, value: p.value });

    let effect = 0;
    if (p.period >= interventionPeriod) {
      const periodsSince = p.period - interventionPeriod + 1;
      // Linear decay of effect over persistence window
      if (periodsSince > persistencePeriods) {
        effect = 0;
      } else {
        effect = assumedEffectSize * (1 - (periodsSince - 1) / persistencePeriods);
      }
    }

    projectedOutcome.push({ period: p.period, value: p.value - effect });
  }

  const finalBaseline = baselineOutcome[baselineOutcome.length - 1]?.value ?? 0;
  const finalProjected = projectedOutcome[projectedOutcome.length - 1]?.value ?? 0;
  const impactReduction = finalBaseline - finalProjected;

  // Simple CI around the impact reduction (+/- 1 standard error approx)
  const se = Math.abs(assumedEffectSize) * 0.2; // 20% of effect as rough SE
  const confidenceInterval: [number, number] = [
    impactReduction - 1.96 * se,
    impactReduction + 1.96 * se,
  ];

  return {
    scenarioId: `intervention_${Date.now()}`,
    scenarioName: `Intervention at period ${interventionPeriod}`,
    description: `Assuming effect size of ${assumedEffectSize.toFixed(3)} decaying over ${persistencePeriods} periods`,
    assumedEffectSize,
    projectedOutcome,
    baselineOutcome,
    impactReduction,
    confidenceInterval,
  };
}

/**
 * Compare intervention scenarios side by side.
 */
export function compareInterventions(
  scenarios: InterventionScenario[]
): {
  bestScenario: InterventionScenario | null;
  worstScenario: InterventionScenario | null;
  averageImpact: number;
} {
  if (scenarios.length === 0) {
    return { bestScenario: null, worstScenario: null, averageImpact: 0 };
  }

  const best = scenarios.reduce((a, b) =>
    a.impactReduction > b.impactReduction ? a : b
  );
  const worst = scenarios.reduce((a, b) =>
    a.impactReduction < b.impactReduction ? a : b
  );
  const avg =
    scenarios.reduce((s, sc) => s + sc.impactReduction, 0) / scenarios.length;

  return { bestScenario: best, worstScenario: worst, averageImpact: avg };
}

function emptyForecast(periods: number): ForecastResult {
  const forecast = Array.from({ length: periods }, (_, i) => ({
    period: i + 1,
    value: 0,
  }));
  return {
    model: 'none',
    forecastPeriods: periods,
    pointForecast: forecast,
    confidenceInterval: forecast.map(p => ({ period: p.period, lower: 0, upper: 0 })),
    accuracy: { mae: 0, rmse: 0, mape: 0 },
    description: 'No historical data available for forecasting',
  };
}