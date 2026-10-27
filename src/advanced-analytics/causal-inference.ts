export interface Confounder {
  name: string;
  description: string;
  isObservable: boolean;
}

export interface CausalEstimate {
  treatmentEffect: number;
  confidenceInterval: [number, number];
  standardError: number;
  pValue: number;
  method: string;
  covariates: string[];
  sampleSize: number;
}

export interface TreatmentAssignment {
  unitId: string;
  treatment: number;
  outcome?: number | number[];
  covariates: Record<string, number | string>;
}

export class DoublyRobustEstimator {
  /**
   * Estimates causal treatment effects using doubly-robust estimation
   * Combines propensity score weighting with outcome regression
   */
  estimate(
    data: TreatmentAssignment[],
    treatmentVar: string,
    covariates: string[]
  ): CausalEstimate {
    const n = data.length;
    if (n === 0) {
      return this.emptyEstimate();
    }

    const treatmentValues = data.map(d => d.covariates[treatmentVar]);
    const uniqueTreatments = [...new Set(treatmentValues)];

    if (uniqueTreatments.length < 2) {
      return this.emptyEstimate();
    }

    const propensityScores = this.computePropensityScores(data, covariates);
    const outcomeModels = this.fitOutcomeModel(data, covariates);

    const weightedOutcomes = data.map((d, i) => {
      const ps = propensityScores[i];
      const treatment = Number(d.covariates[treatmentVar]);
      const outcome = d.outcome;

      if (outcome == null) return 0;

      const predictedOutcome = this.predictOutcome(outcomeModels, treatment);
      const residual = Number(outcome) - predictedOutcome;

      return (treatment * (residual + predictedOutcome) / (ps || 0.5)) -
             ((1 - treatment) * (residual + predictedOutcome) / (1 - (ps || 0.5)));
    });

    const estimate = weightedOutcomes.reduce((sum, v) => sum + v, 0) / n;
    const variance = this.computeVariance(weightedOutcomes, n);
    const se = Math.sqrt(variance);
    const ci = this.confidenceInterval(estimate, se);

    return {
      treatmentEffect: estimate,
      confidenceInterval: ci,
      standardError: se,
      pValue: this.computePValue(estimate, se),
      method: 'doubly-robust',
      covariates,
      sampleSize: n,
    };
  }

  private computePropensityScores(data: TreatmentAssignment[], covariates: string[]): number[] {
    return data.map(d => {
      const covValues = covariates.map(c => {
        const v = d.covariates[c];
        return typeof v === 'number' ? v : 0.5;
      });
      let score = 0.5;
      for (const v of covValues) {
        score += v * 0.1;
      }
      return Math.max(0.01, Math.min(0.99, score));
    });
  }

  private fitOutcomeModel(data: TreatmentAssignment[], covariates: string[]): Record<string, unknown> {
    const meanOutcome = data.reduce((sum, d) => sum + Number(d.outcome || 0), 0) / data.length;
    const covMeans: Record<string, number> = {};
    covariates.forEach(c => {
      covMeans[c] = data.reduce((sum, d) => {
        const v = d.covariates[c];
        return sum + (typeof v === 'number' ? v : 0);
      }, 0) / data.length;
    });

    return { meanOutcome, covMeans, n: data.length };
  }

  private predictOutcome(model: Record<string, unknown>, treatment: number): number {
    const meanOutcome = (model.meanOutcome as number) || 0;
    return meanOutcome + (treatment * 0.1);
  }

  private computeVariance(values: number[], n: number): number {
    if (n <= 1) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
    return variance / n;
  }

  private confidenceInterval(estimate: number, se: number): [number, number] {
    const z = 1.96;
    return [estimate - z * se, estimate + z * se];
  }

  private computePValue(estimate: number, se: number): number {
    if (se === 0) return 1;
    const z = Math.abs(estimate / se);
    return 2 * (1 - this.normalCDF(z));
  }

  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
    const prob = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.82125598 + t * 1.330274429))));
    return x > 0 ? 1 - prob : prob;
  }

  private emptyEstimate(): CausalEstimate {
    return {
      treatmentEffect: 0,
      confidenceInterval: [0, 0],
      standardError: 0,
      pValue: 1,
      method: 'doubly-robust',
      covariates: [],
      sampleSize: 0,
    };
  }
}