/**
 * CLI Export Formatters
 *
 * Unified multi-format export for analysis results and reports.
 * Pluggable renderers for Markdown, HTML, JSON, CSV, and plain text.
 * Delegates report-specific rendering to the existing ReportTemplates
 * module when the supplied payload is a Red Flag Report config.
 */

import { ReportTemplates, ReportTemplateConfig } from '../reporting/report_templates';

export type ExportFormat = 'markdown' | 'html' | 'json' | 'csv' | 'txt' | 'auto';

export interface TextCell {
  value: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface ExportTable {
  headers: TextCell[];
  rows: TextCell[][];
}

export interface ExportField {
  label: string;
  value: string | number | undefined | null;
}

export interface AnalysisRecord {
  jurisdictionId: string;
  jurisdictionName: string;
  metric: string;
  primaryGroup: string;
  primaryRate: number;
  referenceRate: number;
  disparity: number;
  disparities: Record<string, Record<string, number>>;
  trendDirection: 'improving' | 'worsening' | 'stable' | 'unknown';
  confidenceInterval?: [number, number];
  riskLevel: 'low' | 'moderate' | 'high';
  source: string;
  generatedAt: string;
}

export interface ExportOptions {
  format?: ExportFormat;
  indent?: number;
  includeHeaders?: boolean;
  csvDelimiter?: ',' | ';' | '\t';
  /** Audience template applied when the payload is a Red Flag report config. */
  template?: 'simplified' | 'technical' | 'policy';
}

export interface ExportResult {
  format: ExportFormat;
  content: string;
  bytes: number;
  contentType: string;
}

export class ExportFormatters {
  private indent: number;

  constructor(options: { indent?: number } = {}) {
    this.indent = options.indent ?? 2;
  }

  /** Detect whether a payload is a RedFlagReport template config. */
  private isReportConfig(payload: unknown): payload is ReportTemplateConfig {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }
    const p = payload as Record<string, unknown>;
    return (
      typeof p.jurisdictionName === 'string' &&
      Array.isArray(p.metrics) &&
      typeof p.referenceComparison === 'object'
    );
  }

  /**
   * Render a payload to the requested format. Auto-selects a report template
   * for RedFlagReport configs; otherwise uses the generic row/record renderer.
   */
  exportReport(
    payload: unknown,
    options: ExportOptions = {}
  ): ExportResult {
    const format = options.format ?? 'markdown';
    let content: string;

    if (this.isReportConfig(payload) && format !== 'csv') {
      const renderer = new ReportTemplates(payload);
      content = this.renderFromTemplates(renderer, format, options);
    } else {
      content = this.renderGeneric(payload, format, options);
    }

    return {
      format,
      content,
      bytes: Buffer.byteLength(content, 'utf8'),
      contentType: this.contentType(format),
    };
  }

  /** Export an array of analysis records as a unified table in any format. */
  exportRecords(
    records: AnalysisRecord[],
    options: ExportOptions = {}
  ): ExportResult {
    const format = options.format ?? 'auto';
    const table = this.recordsToTable(records, options.includeHeaders ?? true);
    const resolvedFormat = format === 'auto' ? 'csv' : format;

    let content: string;
    switch (resolvedFormat) {
      case 'markdown': {
        const lines: string[] = [];
        if (table.headers.length) {
          lines.push(`| ${table.headers.map(h => h.value).join(' | ')} |`);
          lines.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
        }
        for (const row of table.rows) {
          lines.push(`| ${row.map(c => c.value).join(' | ')} |`);
        }
        content = lines.join('\n');
        break;
      }
      case 'csv': {
        const delim = options.csvDelimiter ?? ',';
        const lines: string[] = [];
        if (options.includeHeaders === false) {
          // skip headers
        } else {
          lines.push(table.headers.map(h => this.csvEscape(h.value, delim)).join(delim));
        }
        for (const row of table.rows) {
          lines.push(row.map(c => this.csvEscape(c.value, delim)).join(delim));
        }
        content = lines.join('\n');
        break;
      }
      case 'json': {
        content = JSON.stringify(records, null, this.indent);
        break;
      }
      default: {
        const lines: string[] = [];
        for (const row of table.rows) {
          lines.push(row.map(c => c.value).join('\t'));
        }
        content = lines.join('\n');
        break;
      }
    }

    return {
      format: resolvedFormat,
      content,
      bytes: Buffer.byteLength(content, 'utf8'),
      contentType: this.contentType(resolvedFormat),
    };
  }

  /** Build a simple text table string from arbitrary records and fields. */
  toTextTable(fields: ExportField[], rows: Record<string, string | number>[]): string {
    const headers = fields.map(f => f.label);
    const lines: string[] = [headers.join(' | ')];
    lines.push(headers.map(() => '---').join('-+-'));
    for (const row of rows) {
      const cells = fields.map(f => {
        const value = row[f.label] ?? '';
        return String(value);
      });
      lines.push(cells.join(' | '));
    }
    return lines.join('\n');
  }

  private renderFromTemplates(
    renderer: ReportTemplates,
    format: Exclude<ExportFormat, 'csv'>,
    options: ExportOptions
  ): string {
    const template = options.template ?? 'technical';
    switch (format) {
      case 'markdown':
        return this.renderTemplateMarkdown(renderer, template);
      case 'html':
        return renderer.publicToHtml(template);
      case 'json':
        return JSON.stringify(renderer.publicToJson(), null, this.indent);
      case 'txt': {
        // Plain-text projection of the audience-appropriate markdown report.
        return this.renderTemplateMarkdown(renderer, template)
          .replace(/[#*`\[\]()-]/g, '')
          .trim();
      }
      default:
        return this.renderTemplateMarkdown(renderer, template);
    }
  }

  /** Render the audience template as markdown. */
  private renderTemplateMarkdown(
    renderer: ReportTemplates,
    template: 'simplified' | 'technical' | 'policy'
  ): string {
    switch (template) {
      case 'simplified':
        return renderer.publicSimplifiedMarkdown();
      case 'policy':
        return renderer.publicPolicyBriefMarkdown();
      default:
        return renderer.publicTechnicalMarkdown();
    }
  }

  private renderGeneric(
    payload: unknown,
    format: ExportFormat,
    options: ExportOptions
  ): string {
    if (Array.isArray(payload)) {
      return this.exportRecords(payload as AnalysisRecord[], { ...options, format: format === 'auto' ? 'csv' : format }).content;
    }
    switch (format) {
      case 'json':
        return JSON.stringify(payload, null, this.indent);
      case 'csv':
        return this.objectToCsv(payload as Record<string, unknown>, options.csvDelimiter);
      case 'markdown':
        return this.objectToMarkdown(payload as Record<string, unknown>);
      default:
        return String(payload ?? '');
    }
  }

  private recordsToTable(records: AnalysisRecord[], includeHeaders: boolean): ExportTable {
    const headers: TextCell[] = [
      { value: 'Jurisdiction', align: 'left', bold: true },
      { value: 'Metric', align: 'left', bold: true },
      { value: 'Group', align: 'left', bold: true },
      { value: 'Primary Rate', align: 'right', bold: true },
      { value: 'Reference Rate', align: 'right', bold: true },
      { value: 'Disparity (pp)', align: 'right', bold: true },
      { value: 'Risk', align: 'center', bold: true },
    ];

    const rows: TextCell[][] = records.map(r => [
      { value: r.jurisdictionName, align: 'left' },
      { value: r.metric, align: 'left' },
      { value: `${r.primaryGroup} vs ${r.referenceRate.toFixed(3)}`, align: 'left' },
      { value: r.primaryRate.toFixed(3), align: 'right' },
      { value: r.referenceRate.toFixed(3), align: 'right' },
      { value: r.disparity.toFixed(3), align: 'right' },
      { value: r.riskLevel.toUpperCase(), align: 'center' },
    ]);

    return { headers: includeHeaders ? headers : [], rows };
  }

  private objectToCsv(record: Record<string, unknown>, delimiter: ',' | ';' | '\t' = ','): string {
    const flatten = (obj: unknown, prefix: string = ''): string[] => {
      if (typeof obj !== 'object' || obj === null) {
        return [String(obj)];
      }
      if (Array.isArray(obj)) {
        return [obj.map(v => flatten(v)[0]).join('|')];
      }
      const entries = Object.entries(obj as Record<string, unknown>);
      return entries.map(([, v]) => flatten(v, prefix)[0]);
    };

    const headerLine = Object.keys(record)
      .map(k => this.csvEscape(k, delimiter))
      .join(delimiter);
    const rowLine = Object.values(record)
      .map(v => this.csvEscape(flatten(v)[0], delimiter))
      .join(delimiter);
    return `${headerLine}\n${rowLine}`;
  }

  private objectToMarkdown(record: Record<string, unknown>): string {
    const lines: string[] = ['# Export'];
    for (const [key, value] of Object.entries(record)) {
      lines.push(`\n## ${key}\n`);
      if (typeof value === 'object' && value !== null) {
        lines.push('```json', JSON.stringify(value, null, 2), '```');
      } else {
        lines.push(String(value));
      }
    }
    return lines.join('\n');
  }

  private csvEscape(line: string, delimiter: ',' | ';' | '\t'): string {
    if (delimiter === '\t') {
      return line;
    }
    const needsQuote = line.includes(delimiter) || line.includes('"') || line.includes('\n');
    return needsQuote ? `"${line.replace(/"/g, '""')}"` : line;
  }

  private contentType(format: ExportFormat): string {
    switch (format) {
      case 'markdown':
        return 'text/markdown; charset=utf-8';
      case 'html':
        return 'text/html; charset=utf-8';
      case 'json':
        return 'application/json; charset=utf-8';
      case 'csv':
        return 'text/csv; charset=utf-8';
      default:
        return 'text/plain; charset=utf-8';
    }
  }
}

/** Convenience factory used by the CLI entry point. */
export function createExportFormatters(indent?: number): ExportFormatters {
  return new ExportFormatters({ indent });
}
