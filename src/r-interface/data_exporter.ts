/**
 * Data Export Utilities
 * 
 * Export normalized case data to various formats for R/Python analysis:
 * - CSV (universal compatibility)
 * - JSON (with metadata)
 * - Feather/Parquet (high-performance columnar)
 */

import { LegalJusticeCase } from '../normalization/legal_justice_schema';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeQualityFlags?: boolean;
  onlyCompleteCases?: boolean;
  outputDir?: string;
}

export interface ExportMetadata {
  exportedAt: string;
  source: string;
  version: string;
  totalCases: number;
  exportedCases: number;
  fieldsIncluded: string[];
  completenessStats: Record<string, number>;
}

export class DataExporter {
  constructor(
    private source: string = 'akashic-civics',
    private version: string = '1.0.0'
  ) {}
  
  /**
   * Export cases to CSV format
   */
  toCSV(cases: LegalJusticeCase[], filePath: string, options: ExportOptions = {}): ExportMetadata {
    const exportCases = this.filterCases(cases, options);
    
    const fields = this.getExportFields(options);
    const headers = fields.join(',');
    
    const lines = [headers];
    for (const c of exportCases) {
      const row = fields.map(f => this.formatField(c, f));
      lines.push(row.join(','));
    }
    
    // Ensure output directory exists
    const outputDir = dirname(filePath);
    mkdirSync(outputDir, { recursive: true });
    
    writeFileSync(filePath, lines.join('\n'));
    
    return this.createMetadata(cases, exportCases, fields);
  }
  
  /**
   * Export cases to JSON format (compatible with R's jsonlite)
   */
  toJSON(cases: LegalJusticeCase[], filePath: string, options: ExportOptions = {}): ExportMetadata {
    const exportCases = this.filterCases(cases, options);
    const fields = this.getExportFields(options);
    
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        source: this.source,
        version: this.version,
        totalCases: cases.length,
        exportedCases: exportCases.length,
        fieldsIncluded: fields
      },
      cases: exportCases.map(c => this.serializeCase(c, fields))
    };
    
    // Ensure output directory exists
    const outputDir = dirname(filePath);
    mkdirSync(outputDir, { recursive: true });
    
    writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    
    return this.createMetadata(cases, exportCases, fields);
  }
  
  /**
   * Export cases to Feather format (requires Python with feather-format)
   * This creates a script that can be run to generate the feather file
   */
  toFeather(cases: LegalJusticeCase[], filePath: string, options: ExportOptions = {}): ExportMetadata {
    const exportCases = this.filterCases(cases, options);
    const fields = this.getExportFields(options);
    
    // Write a Python script to create feather file
    const scriptPath = filePath.replace('.feather', '_export.py');
    const csvPath = filePath.replace('.feather', '.csv');
    
    // First write CSV
    this.toCSV(exportCases, csvPath, options);
    
    // Create Python conversion script
    const pyScript = `
import pandas as pd
import feather

# Read CSV
df = pd.read_csv('${csvPath}')

# Write Feather
df.to_feather('${filePath}')

# Clean up CSV
import os
os.remove('${csvPath}')
print(f'Exported {len(df)} cases to ${filePath}')
`;
    
    writeFileSync(scriptPath, pyScript);
    
    const metadata = this.createMetadata(cases, exportCases, fields);
    metadata.fieldsIncluded.push('feather_export_script');
    
    return metadata;
  }
  
  /**
   * Export cases to Parquet format (requires Python with pyarrow)
   */
  toParquet(cases: LegalJusticeCase[], filePath: string, options: ExportOptions = {}): ExportMetadata {
    const exportCases = this.filterCases(cases, options);
    const fields = this.getExportFields(options);
    
    // Write a Python script to create parquet file
    const scriptPath = filePath.replace('.parquet', '_export.py');
    const csvPath = filePath.replace('.parquet', '.csv');
    
    // First write CSV
    this.toCSV(exportCases, csvPath, options);
    
    // Create Python conversion script
    const pyScript = `
import pandas as pd

# Read CSV
df = pd.read_csv('${csvPath}')

# Write Parquet
df.to_parquet('${filePath}', engine='pyarrow', compression='snappy')

# Clean up CSV
import os
os.remove('${csvPath}')
print(f'Exported {len(df)} cases to ${filePath}')
`;
    
    writeFileSync(scriptPath, pyScript);
    
    const metadata = this.createMetadata(cases, exportCases, fields);
    metadata.fieldsIncluded.push('parquet_export_script');
    
    return metadata;
  }
  
  /**
   * Export multiple formats at once
   */
  exportAllFormats(
    cases: LegalJusticeCase[], 
    basePath: string, 
    options: ExportOptions = {}
  ): Record<string, ExportMetadata> {
    const outputDir = options.outputDir || dirname(basePath);
    mkdirSync(outputDir, { recursive: true });
    
    return {
      csv: this.toCSV(cases, join(outputDir, 'cases.csv'), options),
      json: this.toJSON(cases, join(outputDir, 'cases.json'), options),
      feather: this.toFeather(cases, join(outputDir, 'cases.feather'), options),
      parquet: this.toParquet(cases, join(outputDir, 'cases.parquet'), options)
    };
  }
  
  private filterCases(cases: LegalJusticeCase[], options: ExportOptions): LegalJusticeCase[] {
    let filtered = [...cases];
    
    if (options.onlyCompleteCases) {
      filtered = filtered.filter(c => c.completeness_score && c.completeness_score >= 100);
    }
    
    return filtered;
  }
  
  private getExportFields(options: ExportOptions): string[] {
    const coreFields = [
      'id', 'jurisdiction_id', 'jurisdiction_name',
      'race_ethnicity', 'gender', 'age_at_arrest',
      'offense_severity', 'charge_type',
      'conviction', 'sentence_months', 'days_to_disposition',
      'disposition_type', 'judge_id', 'prosecutor_office', 'attorney_type',
      'completeness_score'
    ];
    
    if (options.includeQualityFlags) {
      coreFields.push('missing_fields', 'data_quality_flags');
    }
    
    return coreFields;
  }
  
  private formatField(c: LegalJusticeCase, field: string): string {
    const val = (c as any)[field];
    if (val == null) return '';
    if (Array.isArray(val)) return `"${val.join('; ')}"`;
    if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
    return String(val);
  }
  
  private serializeCase(c: LegalJusticeCase, fields: string[]): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const f of fields) {
      obj[f] = (c as any)[f];
    }
    return obj;
  }
  
  private createMetadata(
    allCases: LegalJusticeCase[], 
    exportCases: LegalJusticeCase[], 
    fields: string[]
  ): ExportMetadata {
    const completenessStats: Record<string, number> = {};
    for (const f of fields) {
      const nonNull = exportCases.filter(c => (c as any)[f] != null).length;
      completenessStats[f] = Math.round((nonNull / exportCases.length) * 1000) / 10;
    }
    
    return {
      exportedAt: new Date().toISOString(),
      source: this.source,
      version: this.version,
      totalCases: allCases.length,
      exportedCases: exportCases.length,
      fieldsIncluded: fields,
      completenessStats
    };
  }
}