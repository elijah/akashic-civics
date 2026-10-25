/**
 * Documentation Generator for Disconfirmation Testing
 * 
 * Produces human-readable explanations of disconfirmation test results,
 * remediation suggestions, and historical tracking for audit trails.
 */

import { TestName } from './adaptive_disconfirmation';
import { getTestPhilosophy } from './disconfirmation_philosophy';
import { DisconfirmationScore, TestResult, CredibilityLevel } from './scoring_framework';

// ============================================================================
// Result Types
// ============================================================================

/**
 * A single test's documentation output
 */
export interface TestResultDocumentation {
  test: TestName;
  name: string;
  title: string;
  passed: boolean;
  score: number;
  evidence: string;
  interpretation: string;
  remediation: string;
}

/**
 * Full report documentation
 */
export interface DisconfirmationReport {
  header: ReportHeader;
  score: DisconfirmationScore;
  testResults: TestResultDocumentation[];
  overallInterpretation: OverallInterpretation;
  keyFindings: string[];
  recommendations: string[];
  auditTrail?: AuditTrailEntry[];
}

/**
 * Header for the report
 */
export interface ReportHeader {
  analysisName: string;
  groupVariable: string;
  sampleSize: number;
  testsRun: number;
  testsTotal: number;
  generatedAt: string;
}

/**
 * Entry in the audit trail
 */
export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  actor?: string;
  details?: string;
}

/**
 * Plain-language interpretation of what the results mean for the finding
 */
export interface OverallInterpretation {
  summary: string;
  confidenceLevel: string;
  caveats: string[];
  nextSteps: string[];
}

// ============================================================================
// Documentation Generation
// ============================================================================

/**
 * Generate documentation for an individual test result
 */
export function documentTestResult(result: TestResult): TestResultDocumentation {
  const philosophy = getTestPhilosophy(result.test);
  const ev = result.evidence ?? {};

  let evidenceStr = '';
  if (ev.pValue !== undefined) {
    evidenceStr = `p-value = ${ev.pValue.toFixed(4)}`;
  } else if (ev.effectSize !== undefined) {
    evidenceStr = `effect size = ${ev.effectSize.toFixed(4)}`;
  } else if (ev.consistentCount !== undefined) {
    evidenceStr = `${ev.consistentCount} of ${ev.totalCount ?? '?'} consistent`;
  } else if (ev.supportedExplanations !== undefined) {
    evidenceStr = `${ev.supportedExplanations.length} alternative explanations supported`;
  } else if (ev.significantPeriods !== undefined) {
    evidenceStr = `${ev.significantPeriods} of ${ev.totalPeriods} periods significant`;
  } else {
    evidenceStr = 'no specific metrics recorded';
  }

  return {
    test: result.test,
    name: philosophy?.name ?? result.test,
    title: philosophy?.title ?? result.test,
    passed: result.passed,
    score: result.scoreOverride ?? (result.passed ? 1 : 0),
    evidence: evidenceStr,
    interpretation: philosophy?.passMeaning ?? '',
    remediation: getRemediationForFailure(result)
  };
}

/**
 * Get remediation suggestions for a failing test
 */
export function getRemediationForFailure(result: TestResult): string {
  if (result.passed) {
    return 'No remediation needed - the test passed successfully.';
  }

  const philosophy = getTestPhilosophy(result.test);
  const ev = result.evidence ?? {};

  switch (result.test) {
    case TestName.PLACEBO:
      if (ev.pValue !== undefined && ev.pValue < 0.05) {
        return 'The placebo test detected a significant effect in a null context. ' +
          'Investigate potential p-hacking, model misspecification, or data artifacts ' +
          'in the analysis pipeline.';
      }
      return philosophy?.failureMeaning ?? 'Methodology has false positive bias.';

    case TestName.SPEC_SENSITIVITY:
      if (ev.consistentCount !== undefined && ev.totalCount !== undefined && ev.totalCount > 0) {
        const consistent = ev.consistentCount;
        const total = ev.totalCount;
        const pct = (consistent / total * 100).toFixed(0);
        return `Only ${pct}% of alternative specifications produced consistent results. ` +
          'Review model specification and report the full distribution of estimates.';
      }
      return 'The effect is analytically fragile. Report the range of estimates across ' +
        'specifications rather than a point estimate.';

    case TestName.NEGATIVE_CONTROLS:
      if (ev.supportedExplanations && ev.supportedExplanations.length > 0) {
        return `Negative controls detected systematic patterns: ${ev.supportedExplanations.join(', ')}. ` +
          'Investigate whether the main finding is driven by methodological artifact.';
      }
      return 'The methodology may have systematic bias. Check for confounding variables ' +
        'that affect both group assignment and outcome measurement.';

    case TestName.OUT_OF_SAMPLE:
      if (ev.effectSize !== undefined) {
        const diff = Math.abs((ev.effectSize as number));
        const pct = (diff * 100).toFixed(0);
        return `Out-of-sample effect differs by ${pct}% from the estimation sample. ` +
          'The model may be overfit. Simplify or collect more data.';
      }
      return 'The finding did not generalize. Report as "not validated out-of-sample" ' +
        'or reject as potentially overfit.';

    case TestName.TEMPORAL_ROBUSTNESS:
      if (ev.significantPeriods !== undefined && ev.totalPeriods !== undefined) {
        const pct = (ev.significantPeriods / ev.totalPeriods * 100).toFixed(0);
        return `Effect only significant in ${pct}% of time periods. ` +
          `Investigate what specific conditions or events may have driven the effect.`;
      }
      return 'The pattern is not persistent. Investigate period-specific factors. ' +
        'The finding may reflect a transient anomaly rather than a systemic pattern.';

    case TestName.ALTERNATIVE_EXPLANATIONS:
      if (ev.supportedExplanations && ev.supportedExplanations.length > 0) {
        return `Alternative explanations supported: ${ev.supportedExplanations.join(', ')}. ` +
          'Attribute the effect to these factors rather than the primary hypothesis, ' +
          'or reject the primary claim.';
      }
      return 'Investigate unmeasured confounders or consider whether the effect ' +
        'operates through a mechanism not captured by this analysis.';

    default:
      return 'Investigate the specific nature of this failure and its potential ' +
        'causes in the data or methodology.';
  }
}

/**
 * Generate the full disconfirmation report documentation
 */
export function generateDisconfirmationReport(
  scoreResult: DisconfirmationScore,
  testResults: TestResult[],
  options?: {
    analysisName?: string;
    groupVariable?: string;
    sampleSize?: number;
    auditTrail?: AuditTrailEntry[];
  }
): DisconfirmationReport {
  const testDocs = testResults.map(documentTestResult);

  return {
    header: {
      analysisName: options?.analysisName ?? 'Analysis',
      groupVariable: options?.groupVariable ?? 'group',
      sampleSize: options?.sampleSize ?? 0,
      testsRun: scoreResult.testsRun,
      testsTotal: scoreResult.testsRun + scoreResult.testsSkipped,
      generatedAt: new Date().toISOString()
    },
    score: scoreResult,
    testResults: testDocs,
    overallInterpretation: getOverallInterpretation(scoreResult),
    keyFindings: extractKeyFindings(scoreResult, testDocs),
    recommendations: scoreResult.recommendations,
    auditTrail: options?.auditTrail
  };
}

/**
 * Get the plain-language overall interpretation
 */
export function getOverallInterpretation(scoreResult: DisconfirmationScore): OverallInterpretation {
  const tier = scoreResult.tier;

  const tierInterpretations: Record<string, { summary: string; confidence: string; caveats: string[] }> = {
    high: {
      summary: 'Highly Credible: This finding has survived all applicable disconfirmation ' +
        'tests and demonstrates robust evidence for the claimed disparity.',
      confidence: 'High confidence - the finding is suitable for policy recommendation and ' +
        'public reporting.',
      caveats: [
        'Even robust findings may be explained by unmeasured factors',
        'Causal attribution requires additional considerations beyond statistical disconfirmation'
      ]
    },
    qualified: {
      summary: 'Credible with Qualifications: The finding survived the great majority of ' +
        'disconfirmation tests, with minor limitations that do not undermine the central claim.',
      confidence: 'Moderate-to-high confidence - report with explicit limitations stated.',
      caveats: [
        'Some tests were passed narrowly or with partial credit',
        'Qualifications should be prominently displayed when reporting'
      ]
    },
    tentative: {
      summary: 'Tentative: The finding survived some disconfirmation tests but shows ' +
        'meaningful vulnerability to at least one threat to validity.',
      confidence: 'Low to moderate confidence - do not base policy decisions on this finding.',
      caveats: [
        'The failing test indicates a specific vulnerability',
        'Should be treated as hypothesis-generating rather than confirmatory'
      ]
    },
    weak: {
      summary: 'Weak: The finding failed multiple disconfirmation tests and cannot be ' +
        'considered a validated result.',
      confidence: 'Low confidence - report with strong caveats or not at all.',
      caveats: [
        'Some findings are better understood as exploratory patterns rather than ' +
          'validated disparities',
        'Investigate data quality or methodological issues before drawing any conclusions'
      ]
    },
    not_credible: {
      summary: 'Not Credible: The finding failed foundational disconfirmation tests and ' +
        'cannot be reported as valid evidence of disparity.',
      confidence: 'No confidence - the methodology or data are insufficient.',
      caveats: [
        'Do not report any findings from this analysis',
        'Correct the methodology and re-run the full protocol'
      ]
    }
  };

  const tierKey = (tier === CredibilityLevel.HIGH ? 'high' : tier === CredibilityLevel.QUALIFIED ? 'qualified' : tier === CredibilityLevel.TENTATIVE ? 'tentative' : 'weak');
  const interpretation = tierInterpretations[tierKey];

  const nextSteps: string[] = [];
  if (tier === CredibilityLevel.HIGH) {
    nextSteps.push('Report with confidence to stakeholders');
    nextSteps.push('Archive analysis and protocol for future reference');
  } else if (tier === CredibilityLevel.QUALIFIED) {
    nextSteps.push('Report with explicit caveats and limitations');
    nextSteps.push('Identify and address the specific limitations');
  } else if (tier === CredibilityLevel.TENTATIVE) {
    nextSteps.push('Do not use for policy decisions');
    nextSteps.push('Focus remediation on the failing test(s)');
    nextSteps.push('Consider collecting additional data');
  } else {
    nextSteps.push('Do not report findings as validated');
    nextSteps.push('Conduct methodological audit');
    nextSteps.push('Plan improved analysis cycle');
  }

  return {
    summary: interpretation.summary,
    confidenceLevel: interpretation.confidence,
    caveats: interpretation.caveats,
    nextSteps
  };
}

/**
 * Extract key findings from the scores and breakdown
 */
export function extractKeyFindings(
  score: DisconfirmationScore,
  testDocs: TestResultDocumentation[]
): string[] {
  const findings: string[] = [];
  const criticalFailures = score.criticalFailures.length > 0 ? score.criticalFailures : [];

  if (criticalFailures.length === 0 && score.overall >= 0.75) {
    findings.push('The finding survives robust scrutiny across all dimensions tested');
    findings.push(`Overall credibility score: ${(score.overall * 100).toFixed(0)}/100`);
  } else if (criticalFailures.length === 0) {
    findings.push(`The finding has some vulnerabilities but no critical failures`);
    findings.push(`Overall credibility score: ${(score.overall * 100).toFixed(0)}/100`);
  } else {
    findings.push(`Critical failures detected in ${criticalFailures.length} test(s): ${criticalFailures.join(', ')}`);
    findings.push(`Overall credibility score: ${(score.overall * 100).toFixed(0)}/100`);
  }

  const passedCount = testDocs.filter(d => d.passed).length;
  const totalCount = testDocs.length;

  if (passedCount < totalCount) {
    const partialCount = totalCount - passedCount;
    findings.push(`${partialCount} of ${totalCount} tests did not fully support the finding`);
  }

  if (score.testsSkipped > 0) {
    findings.push(`${score.testsSkipped} tests were not run due to data limitations`);
  }

  return findings;
}

/**
 * Generate a simplified summary for non-technical audiences
 */
export function generateExecutiveSummary(
  scoreResult: DisconfirmationScore,
  analysisName: string = 'Analysis'
): string {
  const tier = scoreResult.tier;

  const summaries: Record<string, string> = {
    high: `The ${analysisName} has been rigorously tested against six independent ` +
      `ways it could be wrong. ${Math.round(scoreResult.overall * 100)}% of the maximum ` +
      'potential problems were ruled out. The evidence is strong enough to recommend ' +
      'reporting this finding with confidence.',
    qualified: `The ${analysisName} has been tested against six potential threats to ` +
      `validity. ${Math.round(scoreResult.overall * 100)}% of maximum credibility was ` +
      'achieved. The finding holds up with minor limitations that should be explicitly ' +
      'stated in any report.',
    tentative: `The ${analysisName} shows a pattern that requires further investigation. ` +
      `${Math.round(scoreResult.overall * 100)}% credibility was achieved, but ` +
      'vulnerabilities were detected that should be addressed before the finding ' +
      'can be considered reliable.',
    weak: `The ${analysisName} finding has not survived rigorous testing. ` +
      `${Math.round(scoreResult.overall * 100)}% credibility suggests substantial ` +
      'uncertainty. This should be treated as exploratory rather than confirmatory.',
    not_credible: `The ${analysisName} cannot be reported as a valid finding. ` +
      'Fundamental methodological issues have been detected that invalidate the ' +
      'analysis. Significant corrections are required before re-analysis.'
  };

  const tierKey = (tier === CredibilityLevel.HIGH ? 'high' : tier === CredibilityLevel.QUALIFIED ? 'qualified' : tier === CredibilityLevel.TENTATIVE ? 'tentative' : 'weak');
  return summaries[tierKey] ?? summaries.weak;
}

/**
 * Generate markdown-formatted documentation suitable for reports
 */
export function generateMarkdownReport(
  scoreResult: DisconfirmationScore,
  testResults: TestResult[],
  options?: {
    analysisName?: string;
    groupVariable?: string;
    sampleSize?: number;
  }
): string {
  const report = generateDisconfirmationReport(scoreResult, testResults, options);

  let md = '# Disconfirmation Testing Report\n\n';
  md += `## Summary\n\n`;
  md += `**Analysis:** ${report.header.analysisName}\n`;
  md += `**Group Variable:** ${report.header.groupVariable}\n`;
  md += `**Sample Size:** ${report.header.sampleSize}\n`;
  md += `**Tests Run:** ${report.header.testsRun}/${report.header.testsTotal}\n\n`;

  md += `## Overall Result\n\n`;
  md += `**Credibility Tier:** ${report.score.tierLabel} (${(report.score.overall * 100).toFixed(0)}/100)\n\n`;
  md += `${report.overallInterpretation.summary}\n\n`;

  md += `## Test Results\n\n`;
  md += '| Test | Score | Evidence | Passed |\n';
  md += '|------|-------|----------|--------|\n';

  for (const t of report.testResults) {
    md += `| ${t.name} | ${(t.score * 100).toFixed(0)} | ${t.evidence} | ${t.passed ? 'Yes' : 'No'} |\n`;
  }

  md += `\n## Key Findings\n\n`;
  for (const f of report.keyFindings) {
    md += `- ${f}\n`;
  }

  md += `\n## Recommendations\n\n`;
  for (const r of report.recommendations) {
    md += `- ${r}\n`;
  }

  return md;
}

/**
 * Initialize the audit trail with the first entry
 */
export function initializeAuditTrail(analysisName: string): AuditTrailEntry {
  return {
    timestamp: new Date().toISOString(),
    action: 'analysis_started',
    actor: 'system',
    details: `Disconfirmation protocol initialized for ${analysisName}`
  };
}

/**
 * Add an entry to the audit trail
 */
export function addAuditEntry(
  trail: AuditTrailEntry[],
  action: string,
  actor?: string,
  details?: string
): AuditTrailEntry {
  const entry: AuditTrailEntry = {
    timestamp: new Date().toISOString(),
    action,
    actor,
    details
  };
  trail.push(entry);
  return entry;
}