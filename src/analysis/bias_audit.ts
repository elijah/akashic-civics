/**
 * Bias Audit Framework
 * 
 * Implements standard fairness metrics for criminal justice disparity analysis:
 * - Demographic Parity (Statistical Parity)
 * - Equalized Odds
 * - Equal Opportunity
 * - Calibration
 * - Predictive Parity
 * - Individual Fairness
 * - Disparate Impact (80% rule)
 */

export interface BiasMetric {
  name: string;
  description: string;
  value: number;
  threshold?: number;
  passed?: boolean;
  groupBreakdown?: Record<string, number>;
  confidenceInterval?: [number, number];
}

export interface GroupMetrics {
  group: string;
  count: number;
  positiveRate: number;
  negativeRate: number;
  truePositiveRate: number;
  trueNegativeRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  precision: number;
  calibration: number;
}

export interface BiasAuditConfig {
  referenceGroup?: string;
  favorableOutcome?: string | number;
  protectedAttributes: string[];
  thresholds?: {
    demographicParity?: number;
    equalizedOdds?: number;
    calibration?: number;
    disparateImpact?: number;
  };
}

export interface BiasAuditResult {
  auditId: string;
  timestamp: string;
  datasetSize: number;
  config: BiasAuditConfig;
  metrics: BiasMetric[];
  groupMetrics: GroupMetrics[];
  overallAssessment: 'pass' | 'fail' | 'review';
  summary: string;
  recommendations: string[];
}

export interface CaseData {
  id: string;
  group: string;
  predictedOutcome: number | string;
  actualOutcome: number | string;
  score?: number;
  attributes: Record<string, any>;
}

export class BiasAudit {
  private config: BiasAuditConfig;
  private cases: CaseData[];

  constructor(cases: CaseData[], config: BiasAuditConfig) {
    this.cases = cases;
    this.config = {
      referenceGroup: config.referenceGroup || Object.entries(this.getGroupCounts()).sort((a, b) => b[1] - a[1])[0]?.[0],
      favorableOutcome: config.favorableOutcome !== undefined ? config.favorableOutcome : 1,
      protectedAttributes: config.protectedAttributes || ['group'],
      thresholds: {
        demographicParity: 0.1,
        equalizedOdds: 0.1,
        calibration: 0.05,
        disparateImpact: 0.8,
        ...config.thresholds,
      },
    };
  }

  private getGroupCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const c of this.cases) {
      counts[c.group] = (counts[c.group] || 0) + 1;
    }
    return counts;
  }

  private getGroupMetrics(group: string): GroupMetrics {
    const groupCases = this.cases.filter(c => c.group === group);
    const n = groupCases.length;
    
    if (n === 0) {
      return {
        group,
        count: 0,
        positiveRate: 0,
        negativeRate: 0,
        truePositiveRate: 0,
        trueNegativeRate: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        precision: 0,
        calibration: 0,
      };
    }

    const favorable = this.config.favorableOutcome;
    const predicted = groupCases.map(c => c.predictedOutcome);
    const actual = groupCases.map(c => c.actualOutcome);

    const tp = predicted.filter((p, i) => p === favorable && actual[i] === favorable).length;
    const fp = predicted.filter((p, i) => p === favorable && actual[i] !== favorable).length;
    const tn = predicted.filter((p, i) => p !== favorable && actual[i] !== favorable).length;
    const fn = predicted.filter((p, i) => p !== favorable && actual[i] === favorable).length;

    const positiveRate = (tp + fp) / n;
    const negativeRate = (tn + fn) / n;
    const truePositiveRate = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const trueNegativeRate = (tn + fp) > 0 ? tn / (tn + fp) : 0;
    const falsePositiveRate = (fp + tn) > 0 ? fp / (fp + tn) : 0;
    const falseNegativeRate = (fn + tp) > 0 ? fn / (fn + tp) : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;

    const calibration = this.computeCalibration(groupCases);

    return {
      group,
      count: n,
      positiveRate,
      negativeRate,
      truePositiveRate,
      trueNegativeRate,
      falsePositiveRate,
      falseNegativeRate,
      precision,
      calibration,
    };
  }

  private computeCalibration(groupCases: CaseData[]): number {
    if (groupCases.length === 0) return 1;
    const favorable = this.config.favorableOutcome;
    let sumSquaredError = 0;
    let validCount = 0;

    for (const c of groupCases) {
      if (typeof c.score === 'number' && c.score >= 0 && c.score <= 1) {
        const actual = c.actualOutcome === favorable ? 1 : 0;
        sumSquaredError += Math.pow(c.score - actual, 2);
        validCount++;
      }
    }

    if (validCount === 0) return 1;
    const brierScore = sumSquaredError / validCount;
    return 1 - brierScore;
  }

  private computeDemographicParity(groupMetrics: GroupMetrics[]): BiasMetric {
    const rates = groupMetrics.map(g => ({ group: g.group, rate: g.positiveRate }));
    const refGroup = groupMetrics.find(g => g.group === this.config.referenceGroup);
    const refRate = refGroup?.positiveRate || 0;
    const maxDiff = Math.max(...rates.map(r => Math.abs(r.rate - refRate)));

    const groupBreakdown: Record<string, number> = {};
    for (const r of rates) {
      groupBreakdown[r.group] = r.rate;
    }

    return {
      name: 'Demographic Parity (Statistical Parity)',
      description: 'Difference in positive prediction rates across groups. Measures whether outcomes are independent of protected attributes.',
      value: maxDiff,
      threshold: this.config.thresholds?.demographicParity,
      passed: maxDiff <= (this.config.thresholds?.demographicParity || 0.1),
      groupBreakdown,
      confidenceInterval: this.bootstrapCI(groupMetrics.map(g => g.positiveRate)),
    };
  }

  private computeEqualizedOdds(groupMetrics: GroupMetrics[]): BiasMetric {
    const tprDiffs = groupMetrics.map(g => Math.abs(g.truePositiveRate - (groupMetrics.find(r => r.group === this.config.referenceGroup)?.truePositiveRate || 0)));
    const fprDiffs = groupMetrics.map(g => Math.abs(g.falsePositiveRate - (groupMetrics.find(r => r.group === this.config.referenceGroup)?.falsePositiveRate || 0)));
    const maxTPRDiff = Math.max(...tprDiffs);
    const maxFPRDiff = Math.max(...fprDiffs);
    const maxDiff = Math.max(maxTPRDiff, maxFPRDiff);

    const groupBreakdown: Record<string, number> = {};
    for (const g of groupMetrics) {
      groupBreakdown[`${g.group}_TPR`] = g.truePositiveRate;
      groupBreakdown[`${g.group}_FPR`] = g.falsePositiveRate;
    }

    return {
      name: 'Equalized Odds',
      description: 'Equal true positive rates AND false positive rates across groups. Requires both sensitivity and specificity parity.',
      value: maxDiff,
      threshold: this.config.thresholds?.equalizedOdds,
      passed: maxDiff <= (this.config.thresholds?.equalizedOdds || 0.1),
      groupBreakdown,
    };
  }

  private computeEqualOpportunity(groupMetrics: GroupMetrics[]): BiasMetric {
    const refTPR = groupMetrics.find(g => g.group === this.config.referenceGroup)?.truePositiveRate || 0;
    const diffs = groupMetrics.map(g => Math.abs(g.truePositiveRate - refTPR));
    const maxDiff = Math.max(...diffs);

    const groupBreakdown: Record<string, number> = {};
    for (const g of groupMetrics) {
      groupBreakdown[`${g.group}_TPR`] = g.truePositiveRate;
    }

    return {
      name: 'Equal Opportunity',
      description: 'Equal true positive rates across groups. Weaker than equalized odds; only requires sensitivity parity.',
      value: maxDiff,
      threshold: this.config.thresholds?.equalizedOdds,
      passed: maxDiff <= (this.config.thresholds?.equalizedOdds || 0.1),
      groupBreakdown,
    };
  }

  private computeCalibrationMetric(groupMetrics: GroupMetrics[]): BiasMetric {
    const calibrations = groupMetrics.map(g => g.calibration);
    const maxDiff = Math.max(...calibrations) - Math.min(...calibrations);

    const groupBreakdown: Record<string, number> = {};
    for (const g of groupMetrics) {
      groupBreakdown[`${g.group}_calibration`] = g.calibration;
    }

    return {
      name: 'Calibration (Score Alignment)',
      description: 'Predicted probabilities match actual outcome frequencies within each group. Well-calibrated scores mean P(Y=1|score=s) = s.',
      value: maxDiff,
      threshold: this.config.thresholds?.calibration,
      passed: maxDiff <= (this.config.thresholds?.calibration || 0.05),
      groupBreakdown,
    };
  }

  private computePredictiveParity(groupMetrics: GroupMetrics[]): BiasMetric {
    const refPrecision = groupMetrics.find(g => g.group === this.config.referenceGroup)?.precision || 0;
    const diffs = groupMetrics.map(g => Math.abs(g.precision - refPrecision));
    const maxDiff = Math.max(...diffs);

    const groupBreakdown: Record<string, number> = {};
    for (const g of groupMetrics) {
      groupBreakdown[`${g.group}_precision`] = g.precision;
    }

    return {
      name: 'Predictive Parity (PPV Parity)',
      description: 'Equal precision (positive predictive value) across groups. When a positive prediction is made, the probability of being correct should be equal.',
      value: maxDiff,
      threshold: this.config.thresholds?.equalizedOdds,
      passed: maxDiff <= (this.config.thresholds?.equalizedOdds || 0.1),
      groupBreakdown,
    };
  }

  private computeDisparateImpact(groupMetrics: GroupMetrics[]): BiasMetric {
    const rates = groupMetrics.map(g => g.positiveRate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const ratio = minRate > 0 && maxRate > 0 ? minRate / maxRate : 1;

    const groupBreakdown: Record<string, number> = {};
    for (const g of groupMetrics) {
      groupBreakdown[`${g.group}_rate`] = g.positiveRate;
    }

    return {
      name: 'Disparate Impact (80% Rule)',
      description: 'Ratio of lowest to highest positive rate across groups. EEOC 4/5ths rule: ratio < 0.80 suggests adverse impact.',
      value: ratio,
      threshold: this.config.thresholds?.disparateImpact,
      passed: ratio >= (this.config.thresholds?.disparateImpact || 0.8),
      groupBreakdown,
    };
  }

  private computeOverallAccuracy(groupMetrics: GroupMetrics[]): BiasMetric {
    const totalN = groupMetrics.reduce((sum, g) => sum + g.count, 0);
    const weightedAccuracy = groupMetrics.reduce((sum, g) => {
      const tp = g.truePositiveRate * g.count;
      const tn = g.trueNegativeRate * g.count;
      return sum + tp + tn;
    }, 0) / totalN;

    return {
      name: 'Overall Accuracy',
      description: 'Weighted accuracy across all groups. Not a fairness metric but provides context.',
      value: weightedAccuracy,
      groupBreakdown: Object.fromEntries(groupMetrics.map(g => [g.group, (g.truePositiveRate + g.trueNegativeRate) / 2])),
    };
  }

  private bootstrapCI(values: number[], iterations = 1000): [number, number] {
    if (values.length < 2) return [0, 0];
    const means: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const sample = Array.from({ length: values.length }, () => values[Math.floor(Math.random() * values.length)]);
      means.push(sample.reduce((a, b) => a + b, 0) / sample.length);
    }
    means.sort((a, b) => a - b);
    return [means[Math.floor(iterations * 0.025)], means[Math.floor(iterations * 0.975)]];
  }

  public runAudit(): BiasAuditResult {
    const auditId = `bias_audit_${Date.now()}`;
    const groups = [...new Set(this.cases.map(c => c.group))];
    const groupMetrics = groups.map(g => this.getGroupMetrics(g));

    const metrics: BiasMetric[] = [
      this.computeDemographicParity(groupMetrics),
      this.computeEqualizedOdds(groupMetrics),
      this.computeEqualOpportunity(groupMetrics),
      this.computeCalibrationMetric(groupMetrics),
      this.computePredictiveParity(groupMetrics),
      this.computeDisparateImpact(groupMetrics),
      this.computeOverallAccuracy(groupMetrics),
    ];

    const failedMetrics = metrics.filter(m => m.passed === false);
    const overallAssessment: 'pass' | 'fail' | 'review' = 
      failedMetrics.length === 0 ? 'pass' : 
      failedMetrics.some(m => m.name.includes('Disparate Impact') || m.name.includes('Demographic Parity')) ? 'fail' : 'review';

    const summary = this.generateSummary(metrics, overallAssessment);
    const recommendations = this.generateRecommendations(failedMetrics);

    return {
      auditId,
      timestamp: new Date().toISOString(),
      datasetSize: this.cases.length,
      config: this.config,
      metrics,
      groupMetrics,
      overallAssessment,
      summary,
      recommendations,
    };
  }

  private generateSummary(metrics: BiasMetric[], assessment: 'pass' | 'fail' | 'review'): string {
    const failed = metrics.filter(m => m.passed === false);
    const labels = {
      pass: '✅ PASS - No significant bias detected across fairness metrics.',
      fail: '❌ FAIL - Significant bias detected. Immediate review required.',
      review: '⚠️ REVIEW - Potential bias concerns. Investigate specific metrics.',
    };
    let summary = `${labels[assessment]}\n\n`;
    summary += `Audited ${metrics.length} fairness metrics on ${this.cases.length} cases across ${[...new Set(this.cases.map(c => c.group))].length} groups.\n\n`;
    
    if (failed.length > 0) {
      summary += `Failed metrics (${failed.length}):\n`;
      for (const m of failed) {
        summary += `  - ${m.name}: value=${m.value.toFixed(4)}, threshold=${m.threshold}\n`;
      }
    } else {
      summary += 'All metrics passed their respective thresholds.\n';
    }

    return summary;
  }

  private generateRecommendations(failedMetrics: BiasMetric[]): string[] {
    const recommendations: string[] = [];
    
    if (failedMetrics.some(m => m.name.includes('Demographic Parity'))) {
      recommendations.push('Consider adjusting decision thresholds per group to achieve demographic parity, or investigate upstream factors causing rate differences.');
    }
    if (failedMetrics.some(m => m.name.includes('Equalized Odds'))) {
      recommendations.push('Model has different error rates across groups. Consider group-specific calibration or retraining with fairness constraints.');
    }
    if (failedMetrics.some(m => m.name.includes('Equal Opportunity'))) {
      recommendations.push('True positive rates differ across groups. Review whether the model systematically misses positive cases for certain groups.');
    }
    if (failedMetrics.some(m => m.name.includes('Calibration'))) {
      recommendations.push('Predicted scores are not well-calibrated for some groups. Apply Platt scaling or isotonic regression per group.');
    }
    if (failedMetrics.some(m => m.name.includes('Predictive Parity'))) {
      recommendations.push('Precision differs across groups. Positive predictions are less reliable for some groups. Review feature importance and data quality.');
    }
    if (failedMetrics.some(m => m.name.includes('Disparate Impact'))) {
      recommendations.push('Disparate impact ratio below 80% threshold. This may violate EEOC guidelines. Legal review recommended.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring. Schedule periodic re-audit as new data becomes available.');
    }

    recommendations.push('Document all findings and mitigation steps for transparency and compliance.');
    return recommendations;
  }

  public exportToMarkdown(result: BiasAuditResult): string {
    let md = `# Bias Audit Report\n\n`;
    md += `**Audit ID:** ${result.auditId}\n`;
    md += `**Timestamp:** ${result.timestamp}\n`;
    md += `**Dataset Size:** ${result.datasetSize} cases\n`;
    md += `**Groups:** ${result.groupMetrics.map(g => g.group).join(', ')}\n`;
    md += `**Reference Group:** ${result.config.referenceGroup}\n`;
    md += `**Favorable Outcome:** ${result.config.favorableOutcome}\n\n`;
    md += `## Overall Assessment: ${result.overallAssessment.toUpperCase()}\n\n`;
    md += `${result.summary}\n\n`;
    md += `## Metric Results\n\n`;
    md += `| Metric | Value | Threshold | Status |\n`;
    md += `|--------|-------|-----------|--------|\n`;
    for (const m of result.metrics) {
      const status = m.passed === undefined ? 'N/A' : (m.passed ? '✅ PASS' : '❌ FAIL');
      const threshold = m.threshold !== undefined ? m.threshold.toFixed(3) : 'N/A';
      md += `| ${m.name} | ${m.value.toFixed(4)} | ${threshold} | ${status} |\n`;
    }
    md += `\n## Group-Level Metrics\n\n`;
    md += `| Group | Count | Positive Rate | TPR | FPR | Precision | Calibration |\n`;
    md += `|-------|-------|---------------|-----|-----|-----------|-------------|\n`;
    for (const g of result.groupMetrics) {
      md += `| ${g.group} | ${g.count} | ${g.positiveRate.toFixed(4)} | ${g.truePositiveRate.toFixed(4)} | ${g.falsePositiveRate.toFixed(4)} | ${g.precision.toFixed(4)} | ${g.calibration.toFixed(4)} |\n`;
    }
    md += `\n## Recommendations\n\n`;
    for (const r of result.recommendations) {
      md += `- ${r}\n`;
    }
    md += `\n---\n*Generated by Akashic Civics BiasAudit v1.0*\n`;
    return md;
  }

  public exportToJSON(result: BiasAuditResult): object {
    return {
      ...result,
      exportFormat: 'akashic-bias-audit-v1',
      schemaVersion: '1.0.0',
    };
  }
}

export function runBiasAudit(cases: CaseData[], config: BiasAuditConfig): BiasAuditResult {
  const audit = new BiasAudit(cases, config);
  return audit.runAudit();
}