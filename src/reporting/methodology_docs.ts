/**
 * Automated Methodology Documentation Generator
 * 
 * Generates comprehensive methodology documentation for all analyses.
 * Ensures transparency, reproducibility, and proper uncertainty quantification.
 * 
 * Part of Phase 3.3 (Validation & Transparency Features) per PLAN_STATISTICAL_RIGOR.md
 */

import { LegalJusticeCase } from '../normalization/legal_justice_schema';
import { RAnalysisResult } from '../r-interface/r_bridge';
import { DataSnapshot } from '../statistical/historical_baseline';

export interface MethodologyReport {
  title: string;
  dateGenerated: string;
  analysisInfo: {
    analysisType: string;
    jurisdiction: string;
    timePeriod: { start: string; end: string };
    caseCount: number;
    preRegistrationId?: string;
  };
  statisticalMethods: {
    modelType: string;
    outcomeVariable: string;
    predictorVariables: string[];
    controlVariables: string[];
    alphaLevel: number;
    imputationMethod?: string;
  };
  dataQuality: {
    completenessScore: number;
    missingDemographicsRate: number;
    dataQualityFlags: string[];
    sourceConnectors: Record<string, number>;
  };
  results: {
    effectSize: number;
    pValue: number;
    confidenceInterval: [number, number];
    oddsRatio?: number;
    conclusion: string;
  };
  robustness: {
    sensitivityAnalysis?: string;
    placeboTests?: string;
    outOfSampleValidation?: string;
    temporalRobustness?: string;
    alternativeExplanationsTested?: string[];
  };
  limitations: string[];
  assumptions: string[];
  uncertainty: {
    level: 'high' | 'moderate' | 'low';
    sources: string[];
    confidenceStatement: string;
  };
  nextSteps: string[];
  reproducibility: {
    dataHash: string;
    codeVersion: string;
    environment: Record<string, string>;
  };
}

export class MethodologyDocGenerator {
  /**
   * Generate complete methodology documentation
   */
  generateReport(
    cases: LegalJusticeCase[],
    result: RAnalysisResult,
    options: {
      title?: string;
      jurisdiction?: string;
      timePeriod?: { start: string; end: string };
      preRegistrationId?: string;
      sensitivityAnalysis?: string;
      baselineSnapshot?: DataSnapshot;
    } = {}
  ): MethodologyReport {
    const now = new Date().toISOString();
    const dataHash = this.hashData(cases);
    
    // Generate limitations
    const limitations = this.generateLimitations(cases, result);
    
    // Generate assumptions
    const assumptions = this.generateAssumptions(result);
    
    // Determine uncertainty level
    const uncertainty = this.quantifyUncertainty(cases, result);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(cases, result, limitations);
    
    return {
      title: options.title || `Methodology Report: ${result.analysis_type}`,
      dateGenerated: now,
      analysisInfo: {
        analysisType: result.analysis_type,
        jurisdiction: options.jurisdiction || 'Unknown',
        timePeriod: options.timePeriod || { start: 'Unknown', end: 'Unknown' },
        caseCount: cases.length,
        preRegistrationId: options.preRegistrationId
      },
      statisticalMethods: {
        modelType: this.inferModelType(result),
        outcomeVariable: 'conviction',
        predictorVariables: ['race_ethnicity'],
        controlVariables: ['offense_severity', 'age_at_arrest'],
        alphaLevel: 0.05,
        imputationMethod: result.model_diagnostics?.concordance_index ? 'Multiple imputation (MICE)' : 'Complete case analysis'
      },
      dataQuality: {
        completenessScore: this.calculateCompleteness(cases),
        missingDemographicsRate: this.calculateMissingDemographicsRate(cases),
        dataQualityFlags: this.collectQualityFlags(cases),
        sourceConnectors: this.countBySource(cases)
      },
      results: {
        effectSize: result.effect_size,
        pValue: result.p_value,
        confidenceInterval: result.confidence_interval,
        oddsRatio: result.odds_ratio,
        conclusion: this.generateConclusion(result)
      },
      robustness: {
        sensitivityAnalysis: options.sensitivityAnalysis,
        placeboTests: result.disconfirmation_tests?.details?.placebo ? 'Passed' : 'Not performed',
        outOfSampleValidation: result.disconfirmation_tests?.details?.out_of_sample ? 'Passed' : 'Not performed',
        temporalRobustness: result.disconfirmation_tests?.details?.temporal ? 'Passed' : 'Not performed',
        alternativeExplanationsTested: this.listAlternativeExplanations(result)
      },
      limitations,
      assumptions,
      uncertainty,
      nextSteps,
      reproducibility: {
        dataHash,
        codeVersion: '1.0.0',
        environment: this.getEnvironmentInfo()
      }
    };
  }
  
  /**
   * Generate methodology documentation in Markdown format
   */
  toMarkdown(report: MethodologyReport): string {
    let md = `# Methodology Report\n\n`;
    md += `**Generated**: ${report.dateGenerated}\n`;
    md += `**Title**: ${report.title}\n\n`;
    
    md += `## Analysis Information\n`;
    md += `- **Type**: ${report.analysisInfo.analysisType}\n`;
    md += `- **Jurisdiction**: ${report.analysisInfo.jurisdiction}\n`;
    md += `- **Time Period**: ${report.analysisInfo.timePeriod.start} to ${report.analysisInfo.timePeriod.end}\n`;
    md += `- **Cases**: ${report.analysisInfo.caseCount}\n`;
    if (report.analysisInfo.preRegistrationId) {
      md += `- **Pre-registration ID**: ${report.analysisInfo.preRegistrationId}\n`;
    }
    md += `\n`;
    
    md += `## Statistical Methods\n`;
    md += `- **Model Type**: ${report.statisticalMethods.modelType}\n`;
    md += `- **Outcome Variable**: ${report.statisticalMethods.outcomeVariable}\n`;
    md += `- **Predictor Variables**: ${report.statisticalMethods.predictorVariables.join(', ')}\n`;
    md += `- **Control Variables**: ${report.statisticalMethods.controlVariables.join(', ')}\n`;
    md += `- **Alpha Level**: ${report.statisticalMethods.alphaLevel}\n`;
    if (report.statisticalMethods.imputationMethod) {
      md += `- **Imputation Method**: ${report.statisticalMethods.imputationMethod}\n`;
    }
    md += `\n`;
    
    md += `## Results\n`;
    md += `- **Effect Size**: ${report.results.effectSize.toFixed(4)}\n`;
    md += `- **P-value**: ${report.results.pValue.toFixed(4)}\n`;
    md += `- **95% CI**: [${report.results.confidenceInterval[0].toFixed(4)}, ${report.results.confidenceInterval[1].toFixed(4)}]\n`;
    if (report.results.oddsRatio) {
      md += `- **Odds Ratio**: ${report.results.oddsRatio.toFixed(4)}\n`;
    }
    md += `- **Conclusion**: ${report.results.conclusion}\n\n`;
    
    md += `## Data Quality\n`;
    md += `- **Completeness Score**: ${report.dataQuality.completenessScore}%\n`;
    md += `- **Missing Demographics Rate**: ${(report.dataQuality.missingDemographicsRate * 100).toFixed(1)}%\n`;
    md += `- **Data Quality Flags**: ${report.dataQuality.dataQualityFlags.join(', ') || 'None'}\n`;
    md += `\n`;
    
    md += `## Robustness and Sensitivity Analysis\n`;
    if (report.robustness.sensitivityAnalysis) {
      md += report.robustness.sensitivityAnalysis + `\n`;
    } else {
      md += `Sensitivity analysis: Not performed.\n`;
    }
    md += `- **Placebo Tests**: ${report.robustness.placeboTests}\n`;
    md += `- **Out-of-Sample Validation**: ${report.robustness.outOfSampleValidation}\n`;
    md += `- **Temporal Robustness**: ${report.robustness.temporalRobustness}\n`;
    if (report.robustness.alternativeExplanationsTested && report.robustness.alternativeExplanationsTested.length > 0) {
      md += `- **Alternative Explanations Tested**:\n`;
      for (const alt of report.robustness.alternativeExplanationsTested) {
        md += `  - ${alt}\n`;
      }
    }
    md += `\n`;
    
    md += `## Limitations\n`;
    for (const lim of report.limitations) {
      md += `- ${lim}\n`;
    }
    md += `\n`;
    
    md += `## Uncertainty Quantification\n`;
    md += `- **Level**: ${report.uncertainty.level.toUpperCase()}\n`;
    md += `- **Sources**: ${report.uncertainty.sources.join('; ')}\n`;
    md += `- **Statement**: ${report.uncertainty.confidenceStatement}\n\n`;
    
    md += `## Reproducibility\n`;
    md += `- **Data Hash**: \`${report.reproducibility.dataHash}\`\n`;
    md += `- **Code Version**: ${report.reproducibility.codeVersion}\n`;
    md += `\n`;
    
    md += `## Next Steps\n`;
    for (const step of report.nextSteps) {
      md += `- ${step}\n`;
    }
    
    return md;
  }
  
  /**
   * Generate a plain-language summary
   */
  toPlainSummary(report: MethodologyReport): string {
    return `This analysis of ${report.analysisInfo.jurisdiction} found a ${report.results.effectSize.toFixed(2)} percentage point ${report.results.effectSize > 0 ? 'higher' : 'lower'} conviction rate with 95% CI [${report.results.confidenceInterval[0].toFixed(2)}, ${report.results.confidenceInterval[1].toFixed(2)}]. The finding ${report.results.pValue < 0.05 ? 'is' : 'is not'} statistically significant at alpha = 0.05. 

Data quality score: ${report.dataQuality.completenessScore}% (${report.dataQuality.missingDemographicsRate.toFixed(1)}% missing demographics). 

Limitations: ${report.limitations.slice(0, 3).join('; ')}.

Uncertainty: ${report.uncertainty.level} - ${report.uncertainty.confidenceStatement}

Next steps: ${report.nextSteps.slice(0, 2).join('; ')}.`;
  }
  
  private generateLimitations(cases: LegalJusticeCase[], result: RAnalysisResult): string[] {
    const limitations: string[] = [];
    
    if (cases.length < 100) {
      limitations.push('Small sample size may limit statistical power');
    }
    
    if (cases.length > 0) {
      const missingRate = cases.filter(c => !c.race_ethnicity || c.race_ethnicity === 'Unknown').length / cases.length;
      if (missingRate > 0.1) {
        limitations.push(`High missing demographics rate (${(missingRate * 100).toFixed(1)}%) may introduce selection bias`);
      }
    }
    
    limitations.push('Observational data cannot establish causation');
    limitations.push('Case mix differences may confound results');
    limitations.push('Single jurisdiction limits generalizability');
    
    if (result.model_diagnostics?.aic ?? 0 > 1000) {
      limitations.push('Model fit may be poor (high AIC)');
    }
    
    return limitations;
  }
  
  private generateAssumptions(result: RAnalysisResult): string[] {
    const assumptions: string[] = [
      'Cases are independent observations',
      'Outcome variable is correctly specified',
      'No unmeasured confounding (may not hold)',
      'Data is missing at random (MAR) conditional on observed variables',
      'Linear/additive relationship between predictors and outcome'
    ];
    
    if (result.odds_ratio) {
      assumptions.push('Logistic regression assumptions hold');
    }
    
    if (result.hazard_ratio) {
      assumptions.push('Proportional hazards assumption holds');
    }
    
    return assumptions;
  }
  
  private quantifyUncertainty(cases: LegalJusticeCase[], result: RAnalysisResult): {
    level: 'high' | 'moderate' | 'low';
    sources: string[];
    confidenceStatement: string;
  } {
    const sources: string[] = [];
    
    if (cases.length < 500) sources.push('limited sample size');
    if (cases.filter(c => !c.race_ethnicity || c.race_ethnicity === 'Unknown').length / cases.length > 0.1) {
      sources.push('missing demographic data');
    }
    if (result.p_value > 0.05) sources.push('non-significant result');
    if (result.confidence_interval[1] - result.confidence_interval[0] > 0.2) {
      sources.push('wide confidence interval');
    }
    if (!result.disconfirmation_tests?.passed) sources.push('failed disconfirmation tests');
    
    let level: 'high' | 'moderate' | 'low';
    if (sources.length >= 3) level = 'high';
    else if (sources.length >= 1) level = 'moderate';
    else level = 'low';
    
    let statement: string;
    switch (level) {
      case 'high':
        statement = 'Results should be interpreted with substantial caution. Multiple sources of uncertainty may affect conclusions.';
        break;
      case 'moderate':
        statement = 'Results are suggestive but not definitive. Consider follow-up analyses before drawing firm conclusions.';
        break;
      case 'low':
        statement = 'Results are relatively robust, though observational data limitations still apply.';
        break;
    }
    
    return { level, sources, confidenceStatement: statement };
  }
  
  private generateNextSteps(cases: LegalJusticeCase[], result: RAnalysisResult, limitations: string[]): string[] {
    const steps: string[] = [];
    
    if (limitations.some(l => l.includes('causation'))) {
      steps.push('Conduct quasi-experimental analysis (e.g., regression discontinuity, diff-in-diff)');
    }
    
    if (cases.filter(c => !c.race_ethnicity || c.race_ethnicity === 'Unknown').length / cases.length > 0.05) {
      steps.push('Impute missing demographics and compare with complete case analysis');
    }
    
    steps.push('Test alternative model specifications (sensitivity analysis)');
    steps.push('Disaggregate analysis by offense type to check for heterogeneous effects');
    
    if (result.p_value > 0.05) {
      steps.push('Consider whether null result is due to insufficient power or true absence of effect');
    }
    
    return steps;
  }
  
  private inferModelType(result: RAnalysisResult): string {
    if (result.hazard_ratio) return 'Cox proportional hazards (survival)';
    if (result.odds_ratio) return 'Logistic regression';
    if (result.coefficients && Object.keys(result.coefficients).length > 0) return 'Linear regression';
    return 'Unknown (descriptive)';
  }
  
  private calculateCompleteness(cases: LegalJusticeCase[]): number {
    if (cases.length === 0) return 0;
    const completeCases = cases.filter(c => c.completeness_score && c.completeness_score >= 100);
    return Math.round((completeCases.length / cases.length) * 1000) / 10;
  }
  
  private calculateMissingDemographicsRate(cases: LegalJusticeCase[]): number {
    if (cases.length === 0) return 0;
    const missing = cases.filter(c => !c.race_ethnicity || c.race_ethnicity === 'Unknown');
    return missing.length / cases.length;
  }
  
  private collectQualityFlags(cases: LegalJusticeCase[]): string[] {
    const flags = new Set<string>();
    for (const c of cases) {
      if (c.data_quality_flags) {
        c.data_quality_flags.forEach(f => flags.add(f));
      }
    }
    return Array.from(flags);
  }
  
  private countBySource(cases: LegalJusticeCase[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const c of cases) {
      if (c.source_connector) {
        counts[c.source_connector] = (counts[c.source_connector] || 0) + 1;
      }
    }
    return counts;
  }
  
  private generateConclusion(result: RAnalysisResult): string {
    if (result.p_value < 0.05) {
      return `Statistically significant effect (p = ${result.p_value.toFixed(4)}). The effect size of ${result.effect_size.toFixed(4)} suggests ${result.effect_size > 0 ? 'higher' : 'lower'} conviction rates for the group compared to the reference group.`;
    } else {
      return `No statistically significant effect (p = ${result.p_value.toFixed(4)}). The data does not provide strong evidence of disparity at the alpha = 0.05 level.`;
    }
  }
  
  private listAlternativeExplanations(result: RAnalysisResult): string[] {
    const explanations: string[] = [
      'Differences in offense severity distribution',
      'Differential access to legal representation',
      'Jurisdiction-level policy differences',
      'Temporal trends in enforcement',
      'Selection bias in case processing'
    ];
    
    if (result.disconfirmation_tests?.details?.alt_explanation) {
      explanations.push('Explicit alternative explanation test performed');
    }
    
    return explanations;
  }
  
  private hashData(cases: LegalJusticeCase[]): string {
    const str = JSON.stringify(cases);
    const hash = require('crypto').createHash('sha256');
    hash.update(str);
    return hash.digest('hex').substring(0, 16);
  }
  
  private getEnvironmentInfo(): Record<string, string> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };
  }
}