/**
 * CLI Export Formatters Tests
 */

import {
  ExportFormatters,
  createExportFormatters,
  AnalysisRecord,
  ExportField,
} from '../export_formatters';

function makeRecord(overrides: Partial<AnalysisRecord> = {}): AnalysisRecord {
  return {
    jurisdictionId: 'TX-001',
    jurisdictionName: 'Test County',
    metric: 'conviction_rate',
    primaryGroup: 'Black',
    primaryRate: 0.75,
    referenceRate: 0.55,
    disparity: 0.2,
    disparities: { Black: { gap: 0.2 }, White: { gap: 0.0 } },
    trendDirection: 'worsening',
    confidenceInterval: [0.15, 0.25],
    riskLevel: 'high',
    source: 'unit-test',
    generatedAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  };
}

function makeReportConfig() {
  return {
    jurisdictionId: 'TX-001',
    jurisdictionName: 'Test County',
    reportDate: '2024-01-15',
    dataPeriod: { start: '2020-01-01', end: '2023-12-31' },
    dataQuality: { completenessScore: 88, caseCount: 1200, coverageYears: 4 },
    metrics: [
      {
        name: 'conviction_rate',
        description: 'Conviction disparity',
        primaryGroup: 'Black',
        primaryRate: 0.75,
        referenceGroup: 'White',
        referenceRate: 0.55,
        disparity: 0.2,
        disparityPercentage: 36.4,
        direction: 'higher_for_primary' as const,
        riskLevel: 'high' as const,
        confidenceInterval: [0.15, 0.25] as [number, number],
      },
    ],
    referenceComparison: {
      stateAverageGap: 0.08,
      percentileVsState: 75,
      stateRanking: 38,
      similarJurisdictions: [
        { id: 'c1', name: 'Peer County', state: 'TX', convictionGap: 0.1, caseCount: 900 },
      ],
    },
    recommendations: ['Increase transparency'],
    methodologyNote: 'Standard methodology.',
    provenanceHash: 'deadbeef',
  };
}

describe('ExportFormatters', () => {
  let formatter: ExportFormatters;

  beforeEach(() => {
    formatter = createExportFormatters(2);
  });

  describe('exportReport with report configs', () => {
    it('should render a report config as markdown', () => {
      const result = formatter.exportReport(makeReportConfig(), {
        format: 'markdown',
      });
      expect(result.format).toBe('markdown');
      expect(result.content).toContain('Technical Disparity Report');
      expect(result.content).toContain('Test County');
    });

    it('should render a report config as HTML', () => {
      const result = formatter.exportReport(makeReportConfig(), { format: 'html' });
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('Test County');
    });

    it('should render a report config as JSON', () => {
      const result = formatter.exportReport(makeReportConfig(), { format: 'json' });
      const parsed = JSON.parse(result.content);
      expect(parsed.jurisdictionId).toBe('TX-001');
      expect(parsed.templateEngine).toBe('akashic-report-templates');
    });

    it('should render a report config as plain text', () => {
      const result = formatter.exportReport(makeReportConfig(), { format: 'txt' });
      expect(result.content).toContain('Test County');
      expect(result.content).not.toContain('#');
    });

    it('should report the correct content type', () => {
      expect(formatter.exportReport(makeReportConfig(), { format: 'html' }).contentType)
        .toContain('text/html');
      expect(formatter.exportReport(makeReportConfig(), { format: 'json' }).contentType)
        .toContain('application/json');
      expect(formatter.exportReport(makeReportConfig(), { format: 'markdown' }).contentType)
        .toContain('text/markdown');
    });
  });

  describe('exportReport with generic payloads', () => {
    it('should render a plain object as JSON', () => {
      const result = formatter.exportReport({ a: 1, b: 'two' }, { format: 'json' });
      expect(JSON.parse(result.content)).toEqual({ a: 1, b: 'two' });
    });

    it('should render a plain object as markdown', () => {
      const result = formatter.exportReport({ heading: 'Value' }, { format: 'markdown' });
      expect(result.content).toContain('## heading');
      expect(result.content).toContain('Value');
    });

    it('should render a plain object as CSV', () => {
      const result = formatter.exportReport({ a: 1, b: 2 }, { format: 'csv' });
      expect(result.content).toContain('a,b');
    });

    it('should default to markdown when no format is given', () => {
      const result = formatter.exportReport({ heading: 'Value' });
      expect(result.format).toBe('markdown');
    });

    it('should compute byte length', () => {
      const result = formatter.exportReport({ a: 1 }, { format: 'json' });
      expect(result.bytes).toBe(Buffer.byteLength(result.content, 'utf8'));
    });
  });

  describe('exportRecords', () => {
    it('should default to CSV for the auto format', () => {
      const result = formatter.exportRecords([makeRecord()]);
      expect(result.format).toBe('csv');
      expect(result.content).toContain('Jurisdiction');
      expect(result.content).toContain('Test County');
    });

    it('should render records as markdown table', () => {
      const result = formatter.exportRecords([makeRecord()], { format: 'markdown' });
      expect(result.content).toContain('| Jurisdiction |');
      expect(result.content).toContain('Test County');
    });

    it('should render records as JSON array', () => {
      const result = formatter.exportRecords([makeRecord()], { format: 'json' });
      const parsed = JSON.parse(result.content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].jurisdictionName).toBe('Test County');
    });

    it('should support a semicolon delimiter', () => {
      const result = formatter.exportRecords([makeRecord()], {
        format: 'csv',
        csvDelimiter: ';',
      });
      expect(result.content).toContain('Jurisdiction;Metric');
    });

    it('should omit headers when includeHeaders is false', () => {
      const result = formatter.exportRecords([makeRecord()], {
        format: 'csv',
        includeHeaders: false,
      });
      expect(result.content).not.toContain('Jurisdiction');
      expect(result.content).toContain('Test County');
    });

    it('should handle an empty record set', () => {
      const result = formatter.exportRecords([], { format: 'csv' });
      // Header-only CSV preserves the schema even with no data rows
      expect(result.content).toContain('Jurisdiction');
      expect(result.content.split('\n')).toHaveLength(1);
    });

    it('should escape delimiters inside values', () => {
      const result = formatter.exportRecords(
        [makeRecord({ jurisdictionName: 'Smith, County' })],
        { format: 'csv' }
      );
      expect(result.content).toContain('"Smith, County"');
    });
  });

  describe('toTextTable', () => {
    it('should build a text table from fields and rows', () => {
      const fields: ExportField[] = [
        { label: 'Name', value: null },
        { label: 'Rate', value: null },
      ];
      const table = formatter.toTextTable(fields, [
        { Name: 'Test County', Rate: 0.75 },
      ]);
      expect(table).toContain('Name | Rate');
      expect(table).toContain('Test County | 0.75');
    });

    it('should render missing values as empty strings', () => {
      const fields: ExportField[] = [{ label: 'Name', value: null }];
      const table = formatter.toTextTable(fields, [{}]);
      expect(table.split('\n').pop()).toBe('');
    });
  });
});
