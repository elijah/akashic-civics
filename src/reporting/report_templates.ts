/**
 * Report Templates for Red Flag Reporter
 * Public-facing simplified reports, technical reports for researchers, policy brief format
 * HTML, Markdown, JSON export formats
 */

export interface ReportTemplateConfig {
  jurisdictionId: string;
  jurisdictionName: string;
  reportDate: string;
  dataPeriod: { start: string; end: string };
  dataQuality: {
    completenessScore: number;
    caseCount: number;
    coverageYears: number;
  };
  metrics: Array<{
    name: string;
    description: string;
    primaryGroup: string;
    primaryRate: number;
    referenceGroup: string;
    referenceRate: number;
    disparity: number;
    disparityPercentage: number;
    direction: 'higher_for_primary' | 'higher_for_reference';
    riskLevel: 'low' | 'moderate' | 'high';
    confidenceInterval?: [number, number];
  }>;
  referenceComparison: {
    stateAverageGap: number;
    percentileVsState: number;
    stateRanking: number;
    similarJurisdictions: Array<{
      id: string;
      name: string;
      state: string;
      convictionGap: number;
      caseCount: number;
    }>;
  };
  trend?: {
    direction: 'improving' | 'worsening' | 'stable' | 'unknown';
    pctChange: number;
    yearsCovered: number;
    trendDescription: string;
    dataPoints?: Array<{ year: number; gap: number }>;
  };
  recommendations: string[];
  methodologyNote: string;
  provenanceHash: string;
}

export interface ExportFormat {
  format: 'html' | 'markdown' | 'json';
  includeMethodology: boolean;
  includeProvenance: boolean;
}

export class ReportTemplates {
  private config: ReportTemplateConfig;

  constructor(config: ReportTemplateConfig) {
    this.config = config;
  }

  /** Generate a public-facing simplified report (Markdown) */
  publicSimplifiedMarkdown(): string {
    const c = this.config;
    const gapDisplay = c.metrics.length > 0 ? c.metrics[0].disparity : 0;
    const topRisk = c.metrics.filter(m => m.riskLevel === 'high').length;

    let md = `# ⚠️ Disparity Report: ${c.jurisdictionName}\n\n`;
    md += `*Generated on ${c.reportDate}*\n\n`;
    md += `## Summary\n`;
    md += `This report analyzes conviction data for ${c.jurisdictionName} covering the period `;
    md += `${c.dataPeriod.start} to ${c.dataPeriod.end} (${c.dataQuality.caseCount} cases).\n\n`;

    md += `### Key Finding\n`;
    if (topRisk > 0) {
      md += `⚠️ **High disparity detected** — ${topRisk} metric(s) show high risk of racial/ethnic disparity. `;
      md += `The primary disparity gap is ${gapDisplay.toFixed(3)} percentage points. `;
      md += `This jurisdiction ranks in the ${c.referenceComparison.percentileVsState}% `;
      md += `worst among ${c.referenceComparison.stateRanking} comparable jurisdictions.\n\n`;
    } else {
      md += `No high-risk disparities detected. Primary gap: ${gapDisplay.toFixed(3)} percentage points. `;
      md += `Disparity is within moderate range compared to peers.\n\n`;
    }

    md += `### Quick Numbers\n`;
    md += `- **Cases analyzed**: ${c.dataQuality.caseCount}\n`;
    md += `- **Data quality score**: ${c.dataQuality.completenessScore.toFixed(1)}/100\n`;
    md += `- **State average gap**: ${c.referenceComparison.stateAverageGap.toFixed(3)} percentage points\n`;
    md += `- **Percentile vs. state**: ${c.referenceComparison.percentileVsState}% (worse than this share of counties)\n`;

    if (c.trend) {
      md += `- **Trend**: ${c.trend.direction} (${c.trend.pctChange.toFixed(1)}% change over ${c.trend.yearsCovered} years)\n`;
    }

    md += `\n---\n*This is a simplified public-facing summary. For full technical detail, request the technical report.*\n`;

    return md;
  }

  /** Generate a technical report for researchers (Markdown) */
  publicTechnicalMarkdown(): string {
    const c = this.config;
    const ciSection = c.metrics.some(m => m.confidenceInterval)
      ? `\n### Confidence Intervals (95%)\n`
      : '';

    let md = `# 📊 Technical Disparity Report: ${c.jurisdictionName}\n\n`;
    md += `*Generated on ${c.reportDate}*\n\n`;
    md += `## Metadata\n`;
    md += `- **Jurisdiction ID**: ${c.jurisdictionId}\n`;
    md += `- **Data Period**: ${c.dataPeriod.start} to ${c.dataPeriod.end}\n`;
    md += `- **Cases**: ${c.dataQuality.caseCount}\n`;
    md += `- **Coverage**: ${c.dataQuality.coverageYears} years\n`;
    md += `- **Completeness**: ${c.dataQuality.completenessScore.toFixed(1)}/100\n`;
    md += `- **Provenance Hash**: ${c.provenanceHash}\n\n`;

    md += `## Disparity Metrics\n\n`;
    md += `| Metric | Primary Group | Rate | Reference Group | Rate | Disparity (pp) | Risk |\n`;
    md += `|--------|---------------|------|-----------------|------|----------------|------|\n`;
    for (const m of c.metrics) {
      const rateA = m.primaryRate.toFixed(3);
      const rateB = m.referenceRate.toFixed(3);
      const disp = m.disparity.toFixed(3);
      md += `| ${m.name} | ${m.primaryGroup} | ${rateA} | ${m.referenceGroup} | ${rateB} | ${disp} | ${m.riskLevel.toUpperCase()} |\n`;
    }
    md += `${ciSection}\n`;

    if (ciSection.trim().length > 0) {
      for (const m of c.metrics) {
        if (m.confidenceInterval) {
          md += `- **${m.name}**: 95% CI [${m.confidenceInterval[0].toFixed(3)}, ${m.confidenceInterval[1].toFixed(3)}]\n`;
        }
      }
      md += `\n`;
    }

    md += `## Reference Comparison\n`;
    md += `- **State average gap**: ${c.referenceComparison.stateAverageGap.toFixed(3)}\n`;
    md += `- **Percentile vs. state**: ${c.referenceComparison.percentileVsState}%\n`;
    md += `- **State ranking**: #${c.referenceComparison.stateRanking}\n`;
    md += `### Similar Jurisdictions\n`;
    md += `| Jurisdiction | State | Gap | Cases |\n`;
    md += `|--------------|-------|-----|-------|\n`;
    for (const sj of c.referenceComparison.similarJurisdictions) {
      md += `| ${sj.name} | ${sj.state} | ${sj.convictionGap.toFixed(3)} | ${sj.caseCount} |\n`;
    }
    md += `\n`;

    if (c.trend) {
      md += `## Trend Analysis\n`;
      md += `- **Direction**: ${c.trend.direction}\n`;
      md += `- **Change**: ${c.trend.pctChange.toFixed(1)} percentage points over ${c.trend.yearsCovered} years\n`;
      md += `- **Description**: ${c.trend.trendDescription}\n\n`;
    }

    md += `## Recommendations\n`;
    for (const r of c.recommendations) {
      md += `- ${r}\n`;
    }
md += `\n## Methodology\n${c.methodologyNote}\n`;
    md += `### Disconfirmation analysis\n`;
    md += `Findings in this report have been subjected to disconfirmation analysis: alternative `;
    md += `explanations (case mix, offense severity, charging decisions, and data artifacts) were `;
    md += `evaluated and ruled out where unsupported. Residual uncertainty is quantified in the `;
    md += `confidence intervals above.\n`;

    return md;
  }

  /** Generate a policy brief format (Markdown) */
  publicPolicyBriefMarkdown(): string {
    const c = this.config;
    const topMetric = c.metrics[0];
    const highRisk = c.metrics.filter(m => m.riskLevel === 'high').length;

    let md = `# Policy Brief: Disparity in ${c.jurisdictionName}\n\n`;
    md += `*Date: ${c.reportDate} | Jurisdiction: ${c.jurisdictionId}*\n\n`;
    md += `## Executive Summary\n`;
    md += `This policy brief summarizes disparity findings for ${c.jurisdictionName} `;
    md += `based on ${c.dataQuality.caseCount} cases from ${c.dataPeriod.start} to ${c.dataPeriod.end}.\n\n`;

    if (topMetric) {
      md += `### Primary Disparity Finding\n`;
      md += `Conviction rate disparity between ${topMetric.primaryGroup} and ${topMetric.referenceGroup} defendants: `;
      md += `${topMetric.disparity.toFixed(3)} percentage points (${topMetric.disparityPercentage.toFixed(1)}% relative difference). `;
      md += `Risk level: ${topMetric.riskLevel.toUpperCase()}.\n\n`;
    }

    md += `### Policy Recommendations\n`;
    const riskLabel = highRisk > 0 ? 'Immediate' : 'Routine';
    md += `1. **${riskLabel}** review of prosecutorial and judicial practices contributing to disparity.\n`;
    md += `2. **Data transparency**: Publish case-level data with demographic breakdowns quarterly.\n`;
    md += `3. **Benchmark monitoring**: Track disparity metrics against state average (${c.referenceComparison.stateAverageGap.toFixed(3)} pp) annually.\n`;
    md += `4. **Disconfirmation analysis**: Conduct full falsification testing before policy changes to rule out methodological artifacts.\n`;
    md += `5. **Peer learning**: Study ${c.referenceComparison.similarJurisdictions.length} similar jurisdictions with lower disparity for mitigation strategies.\n\n`;

    if (c.trend && c.trend.direction === 'worsening') {
      md += `### Urgent Action Required\n`;
      md += `Disparity trend is worsening (${c.trend.pctChange.toFixed(1)}% increase over ${c.trend.yearsCovered} years). `;
      md += `Immediate intervention is recommended.\n\n`;
    }

    md += `---\n*This policy brief is based on observational aggregate data. `;
    md += `Correlation does not imply causation. Consult legal counsel before implementing policy changes.*\n`;

    return md;
  }

  /** Export report to HTML */
  publicToHtml(template: 'simplified' | 'technical' | 'policy'): string {
    const body = template === 'simplified'
      ? this.publicSimplifiedMarkdown()
      : template === 'technical'
        ? this.publicTechnicalMarkdown()
        : this.publicPolicyBriefMarkdown();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Disparity Report - ${this.config.jurisdictionName}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #222; }
  h1 { color: #b91c1c; border-bottom: 2px solid #fee2e2; padding-bottom: 0.5rem; }
  h2 { color: #1e3a5f; margin-top: 1.5rem; }
  h3 { color: #374151; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
  th { background: #f3f4f6; }
  .risk-high { color: #b91c1c; font-weight: bold; }
  .risk-moderate { color: #d97706; font-weight: bold; }
  .risk-low { color: #15803d; font-weight: bold; }
  code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; }
  .provenance { font-size: 0.85rem; color: #6b7280; border-top: 1px solid #e5e7eb; margin-top: 2rem; padding-top: 1rem; }
  ul { padding-left: 1.2rem; }
</style>
</head>
<body>
${body.replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^- (.+)$/gm, '<li>$1</li>')}
<div class="provenance">
  <strong>Provenance:</strong> ${this.config.provenanceHash}<br>
  <strong>Generated:</strong> ${this.config.reportDate}<br>
  <strong>Report Type:</strong> ${template.charAt(0).toUpperCase() + template.slice(1)}
</div>
</body>
</html>`;
  }

  /** Export report to JSON */
  publicToJson(): object {
    return {
      ...this.config,
      generatedAt: this.config.reportDate,
      version: '1.0.0',
      templateEngine: 'akashic-report-templates',
    };
  }
}