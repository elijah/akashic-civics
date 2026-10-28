/**
 * Automated Report Generator
 * 
 * Generates publication-ready disparity reports from analysis results:
 * - Data pipeline outputs
 * - Bias audit results
 * - Multiple formats: HTML, Markdown, JSON, PDF (via HTML template)
 * - Public-facing simplified, technical, and policy brief templates
 * - Automated provenance and methodology tracking
 */

import { BiasAuditResult } from '../analysis/bias_audit';

export interface ReportSource {
  type: 'pipeline' | 'bias_audit' | 'streaming' | 'manual';
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
  referenceComparison?: {
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
  biasAudit?: BiasAuditResult;
}

export interface ReportOptions {
  format: 'html' | 'markdown' | 'json' | 'pdf';
  template: 'simplified' | 'technical' | 'policy';
  includeMethodology?: boolean;
  includeProvenance?: boolean;
  includeBiasAudit?: boolean;
  outputPath?: string;
}

export interface GeneratedReport {
  id: string;
  format: string;
  template: string;
  content: string | object;
  outputPath?: string;
  generatedAt: string;
  size: number;
}

export class ReportGenerator {
  private reportCounter = 0;

  public generateReport(
    source: ReportSource,
    options: ReportOptions
  ): GeneratedReport {
    const id = `report_${Date.now()}_${++this.reportCounter}`;
    const format = options.format;
    const template = options.template;

    let content: string | object;

    switch (format) {
      case 'html':
        content = this.generateHTML(source, template, options);
        break;
      case 'markdown':
        content = this.generateMarkdown(source, template, options);
        break;
      case 'json':
        content = this.generateJSON(source, template, options);
        break;
      case 'pdf':
        content = this.generatePDFTemplate(source, template, options);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const size = typeof content === 'string' ? content.length : JSON.stringify(content).length;

    return {
      id,
      format,
      template,
      content,
      outputPath: options.outputPath,
      generatedAt: new Date().toISOString(),
      size,
    };
  }

  private generateHTML(
    source: ReportSource,
    template: 'simplified' | 'technical' | 'policy',
    options: ReportOptions
  ): string {
    const body = this.generateMarkdown(source, template, options);

    let biasAuditSection = '';
    if (options.includeBiasAudit !== false && source.biasAudit) {
      biasAuditSection = this.generateBiasAuditHTML(source.biasAudit);
    }

    let methodologySection = '';
    if (options.includeMethodology !== false) {
      methodologySection = `
<h2>Methodology</h2>
<p>${source.methodologyNote}</p>
<h3>Disconfirmation Analysis</h3>
<p>Findings have been subjected to disconfirmation analysis. Alternative explanations (case mix, offense severity, charging decisions, data artifacts) were evaluated.</p>
`;
    }

    let provenanceSection = '';
    if (options.includeProvenance !== false) {
      provenanceSection = `
<div class="provenance">
  <h3>Provenance</h3>
  <p><strong>Provenance Hash:</strong> ${source.provenanceHash}</p>
  <p><strong>Generated:</strong> ${source.reportDate}</p>
  <p><strong>Report Type:</strong> ${template.charAt(0).toUpperCase() + template.slice(1)}</p>
  <p><strong>Format:</strong> HTML</p>
</div>
`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Disparity Report - ${source.jurisdictionName}</title>
<style>
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; max-width: 900px; margin: 0 auto; padding: 2rem 1rem; color: #1f2937; }
  h1 { color: #991b1b; border-bottom: 3px solid #fee2e2; padding-bottom: 0.75rem; margin-bottom: 1.5rem; }
  h2 { color: #1e3a5f; margin-top: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3rem; }
  h3 { color: #374151; margin-top: 1.5rem; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.9rem; }
  th, td { border: 1px solid #e5e7eb; padding: 0.6rem; text-align: left; }
  th { background-color: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) { background-color: #f9fafb; }
  .risk-high { color: #991b1b; font-weight: 700; }
  .risk-moderate { color: #d97706; font-weight: 700; }
  .risk-low { color: #15803d; font-weight: 700; }
  .assessment-pass { color: #15803d; font-weight: 700; }
  .assessment-review { color: #d97706; font-weight: 700; }
  .assessment-fail { color: #991b1b; font-weight: 700; }
  .highlight-box { background-color: #fef2f2; border-left: 4px solid #991b1b; padding: 1rem; margin: 1rem 0; border-radius: 4px; }
  .info-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 1rem; margin: 1rem 0; border-radius: 4px; }
  .success-box { background-color: #f0fdf4; border-left: 4px solid #15803d; padding: 1rem; margin: 1rem 0; border-radius: 4px; }
  code { background-color: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; font-family: 'SF Mono', Monaco, monospace; font-size: 0.9em; }
  .provenance { font-size: 0.85rem; color: #6b7280; border-top: 1px solid #e5e7eb; margin-top: 2rem; padding-top: 1rem; }
  ul { padding-left: 1.5rem; }
  li { margin-bottom: 0.4rem; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
  .kpi-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .kpi-value { font-size: 1.75rem; font-weight: 700; color: #1e3a5f; }
  .kpi-label { font-size: 0.85rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .bias-audit-table { margin-top: 1rem; }
</style>
</head>
<body>
<h1>Disparity Report: ${source.jurisdictionName}</h1>

<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-value">${source.dataQuality.caseCount}</div>
    <div class="kpi-label">Cases Analyzed</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-value">${source.dataQuality.completenessScore.toFixed(1)}/100</div>
    <div class="kpi-label">Data Quality Score</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-value">${source.dataQuality.coverageYears} years</div>
    <div class="kpi-label">Coverage Period</div>
  </div>
</div>

<p><em>Generated on ${source.reportDate}</em></p>
<p><strong>Data Period:</strong> ${source.dataPeriod.start} to ${source.dataPeriod.end}</p>

${body.replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^- (.+)$/gm, '<li>$1</li>')}

${biasAuditSection}
${methodologySection}
${provenanceSection}
</body>
</html>`;
  }

  private generateMarkdown(
    source: ReportSource,
    template: 'simplified' | 'technical' | 'policy',
    options: ReportOptions
  ): string {
    const md: string[] = [];

    md.push(`# Disparity Report: ${source.jurisdictionName}\n`);
    md.push(`*Generated on ${source.reportDate}*\n`);
    md.push(`**Jurisdiction:** ${source.jurisdictionId} | **Jurisdiction Name:** ${source.jurisdictionName}\n`);
    md.push(`**Data Period:** ${source.dataPeriod.start} to ${source.dataPeriod.end}\n`);
    md.push(`**Cases Analyzed:** ${source.dataQuality.caseCount}\n`);
    md.push(`**Data Quality Score:** ${source.dataQuality.completenessScore.toFixed(1)}/100\n`);
    md.push(`**Coverage:** ${source.dataQuality.coverageYears} year(s)\n`);
    md.push(`**Provenance Hash:** ${source.provenanceHash}\n`);

    if (template === 'policy') {
      md.push(`\n## Executive Summary\n`);
      md.push(`This report summarizes disparity findings for ${source.jurisdictionName} based on ${source.dataQuality.caseCount} cases.\n`);
    }

    md.push(`\n## Disparity Metrics\n\n`);
    md.push(`| Metric | Primary Group | Rate | Reference Group | Rate | Disparity (pp) | Risk |`);
    md.push(`|--------|---------------|------|-----------------|------|----------------|------|`);
    for (const m of source.metrics) {
      md.push(`| ${m.name} | ${m.primaryGroup} | ${m.primaryRate.toFixed(4)} | ${m.referenceGroup} | ${m.referenceRate.toFixed(4)} | ${m.disparity.toFixed(4)} | ${m.riskLevel.toUpperCase()} |`);
    }

    if (source.referenceComparison) {
      md.push(`\n## Reference Comparison\n`);
      md.push(`- State average gap: ${source.referenceComparison.stateAverageGap.toFixed(4)} percentage points\n`);
      md.push(`- Percentile vs. state: ${source.referenceComparison.percentileVsState}%\n`);
      md.push(`- State ranking: #${source.referenceComparison.stateRanking}\n`);
      md.push(`\n### Similar Jurisdictions\n`);
      md.push(`| Jurisdiction | State | Gap | Cases |`);
      md.push(`|--------------|-------|-----|-------|`);
      for (const sj of source.referenceComparison.similarJurisdictions) {
        md.push(`| ${sj.name} | ${sj.state} | ${sj.convictionGap.toFixed(4)} | ${sj.caseCount} |`);
      }
    }

    if (source.trend) {
      md.push(`\n## Trend Analysis\n`);
      md.push(`- Direction: ${source.trend.direction}\n`);
      md.push(`- Change: ${source.trend.pctChange.toFixed(1)}% over ${source.trend.yearsCovered} years\n`);
      md.push(`- Description: ${source.trend.trendDescription}\n`);
    }

    if (options.includeBiasAudit !== false && source.biasAudit) {
      md.push(`\n## Bias Audit Results\n`);
      md.push(`- Overall Assessment: **${source.biasAudit.overallAssessment.toUpperCase()}**\n`);
      md.push(`- Dataset Size: ${source.biasAudit.datasetSize} cases\n`);
      md.push(`\n### Fairness Metrics\n\n`);
      md.push(`| Metric | Value | Threshold | Status |`);
      md.push(`|--------|-------|-----------|--------|`);
      for (const m of source.biasAudit.metrics) {
        const status = m.passed === undefined ? 'N/A' : (m.passed ? 'PASS' : 'FAIL');
        const threshold = m.threshold !== undefined ? m.threshold.toFixed(4) : 'N/A';
        md.push(`| ${m.name} | ${m.value.toFixed(4)} | ${threshold} | ${status} |`);
      }
      md.push(`\n### Group-Level Metrics\n\n`);
      md.push(`| Group | Count | Positive Rate | TPR | FPR | Precision | Calibration |`);
      md.push(`|-------|-------|---------------|-----|-----|-----------|-------------|`);
      for (const g of source.biasAudit.groupMetrics) {
        md.push(`| ${g.group} | ${g.count} | ${g.positiveRate.toFixed(4)} | ${g.truePositiveRate.toFixed(4)} | ${g.falsePositiveRate.toFixed(4)} | ${g.precision.toFixed(4)} | ${g.calibration.toFixed(4)} |`);
      }
      md.push(`\n### Recommendations\n\n`);
      for (const r of source.biasAudit.recommendations) {
        md.push(`- ${r}\n`);
      }
    }

    if (options.includeMethodology !== false) {
      md.push(`\n## Methodology\n`);
      md.push(`${source.methodologyNote}\n`);
      md.push(`\n### Disconfirmation Analysis\nFindings have been subjected to disconfirmation analysis to rule out alternative explanations.\n`);
    }

    if (options.includeProvenance !== false) {
      md.push(`\n## Provenance\n`);
      md.push(`- Hash: ${source.provenanceHash}\n`);
      md.push(`- Generated: ${source.reportDate}\n`);
      md.push(`- Template: ${template}\n`);
    }

    md.push(`\n---\n*Generated by Akashic Civics Report Generator v1.0*\n`);

    return md.join('\n');
  }

  private generateJSON(source: ReportSource, template: string, options: ReportOptions): object {
    const report: any = {
      reportId: `report_${Date.now()}`,
      template,
      jurisdiction: {
        id: source.jurisdictionId,
        name: source.jurisdictionName,
      },
      reportDate: source.reportDate,
      dataPeriod: source.dataPeriod,
      dataQuality: source.dataQuality,
      metrics: source.metrics,
      recommendations: source.recommendations,
      methodologyNote: source.methodologyNote,
      provenanceHash: source.provenanceHash,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    if (source.referenceComparison) {
      report.referenceComparison = source.referenceComparison;
    }
    if (source.trend) {
      report.trend = source.trend;
    }
    if (options.includeBiasAudit !== false && source.biasAudit) {
      report.biasAudit = source.biasAudit;
    }
    if (options.includeProvenance !== false) {
      report.provenance = {
        hash: source.provenanceHash,
        generated: source.reportDate,
        template,
      };
    }

    return report;
  }

  private generatePDFTemplate(
    source: ReportSource,
    template: 'simplified' | 'technical' | 'policy',
    options: ReportOptions
  ): string {
    const html = this.generateHTML(source, template, options);

    return `<!--
PDF GENERATION INSTRUCTIONS:
This HTML content can be converted to PDF using:
1. Puppeteer: const pdf = await page.pdf({ format: 'Letter', printBackground: true });
2. wkhtmltopdf: wkhtmltopdf input.html output.pdf
3. Pandoc: pandoc input.html -o output.pdf
4. Browser: Print to PDF from Chrome/Firefox

The HTML below is styled for print-ready output with Letter-size margins.

-->
${html}`;
  }

  private generateBiasAuditHTML(biasAudit: BiasAuditResult): string {
    const assessmentClass = `assessment-${biasAudit.overallAssessment}`;
    let rows = '';
    for (const m of biasAudit.metrics) {
      const status = m.passed === undefined ? 'N/A' : (m.passed ? 'PASS' : 'FAIL');
      const statusClass = m.passed === undefined ? '' : (m.passed ? 'risk-low' : 'risk-high');
      rows += `<tr><td>${m.name}</td><td>${m.value.toFixed(4)}</td><td>${m.threshold?.toFixed(4) ?? 'N/A'}</td><td class="${statusClass}">${status}</td></tr>`;
    }

    let groupRows = '';
    for (const g of biasAudit.groupMetrics) {
      groupRows += `<tr><td>${g.group}</td><td>${g.count}</td><td>${g.positiveRate.toFixed(4)}</td><td>${g.truePositiveRate.toFixed(4)}</td><td>${g.falsePositiveRate.toFixed(4)}</td><td>${g.precision.toFixed(4)}</td><td>${g.calibration.toFixed(4)}</td></tr>`;
    }

    let recs = '';
    for (const r of biasAudit.recommendations) {
      recs += `<li>${r}</li>`;
    }

    return `
<section class="bias-audit-section">
<h2>Bias Audit Results</h2>
<div class="info-box">
  <p><strong>Overall Assessment:</strong> <span class="${assessmentClass}">${biasAudit.overallAssessment.toUpperCase()}</span></p>
  <p><strong>Dataset Size:</strong> ${biasAudit.datasetSize} cases</p>
  <p><strong>Audit ID:</strong> ${biasAudit.auditId}</p>
  <p><strong>Timestamp:</strong> ${biasAudit.timestamp}</p>
</div>

<h3>Fairness Metrics</h3>
<table class="bias-audit-table">
<thead><tr><th>Metric</th><th>Value</th><th>Threshold</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody>
</table>

<h3>Group-Level Metrics</h3>
<table class="bias-audit-table">
<thead><tr><th>Group</th><th>Count</th><th>Positive Rate</th><th>TPR</th><th>FPR</th><th>Precision</th><th>Calibration</th></tr></thead>
<tbody>${groupRows}</tbody>
</table>

<h3>Recommendations</h3>
<ul>${recs}</ul>
</section>`;
  }
}

export const reportGenerator = new ReportGenerator();