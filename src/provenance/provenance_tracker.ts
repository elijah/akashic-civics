/**
 * Provenance & Metadata Tracking System
 * 
 * Tracks the complete lineage of every data point from source to result.
 * Enables reproducibility, audit trails, and quality assessment.
 */

export interface ProvenanceEntry {
  sourceConnector: string;
  sourceVersion: string;
  rawDataReference?: string;
  ingestionTimestamp: string;
  dataQualityScore: number;  // 0-100
  qualityFlags: string[];    // "missing_demographics", "inconsistent_dates", etc.
  transformationHistory: TransformationStep[];
  hash: string;            // SHA256 of this entry
}

export interface TransformationStep {
  step: string;
  timestamp: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ProvenanceTracker {
  addEntry(caseId: string, entry: ProvenanceEntry): void;
  getEntry(caseId: string): ProvenanceEntry | undefined;
  getAllEntries(): Record<string, ProvenanceEntry>;
  exportProvenance(): Buffer;
  getQualityReport(): QualityReport;
}

export interface QualityReport {
  totalCases: number;
  avgQualityScore: number;
  qualityHistogram: Record<string, number>;
  commonIssues: Array<{issue: string; count: number}>;
  sourceBreakdown: Record<string, number>;
}

export class ProvenanceTracker implements ProvenanceTracker {
  private entries: Record<string, ProvenanceEntry> = {};
  
  addEntry(caseId: string, entry: ProvenanceEntry): void {
    this.entries[caseId] = {
      ...entry,
      hash: this.computeHash(entry)
    };
  }
  
  getEntry(caseId: string): ProvenanceEntry | undefined {
    return this.entries[caseId];
  }
  
  getAllEntries(): Record<string, ProvenanceEntry> {
    return { ...this.entries };
  }
  
  exportProvenance(): Buffer {
    return Buffer.from(JSON.stringify(this.entries, null, 2));
  }
  
  getQualityReport(): QualityReport {
    const totalCases = Object.keys(this.entries).length;
    const scores = Object.values(this.entries).map(e => e.dataQualityScore);
    
    const histogram: Record<string, number> = {};
    scores.forEach(score => {
      const bin = this.getScoreBin(score);
      histogram[bin] = (histogram[bin] || 0) + 1;
    });
    
    const issues: Record<string, number> = {};
    Object.values(this.entries).forEach(entry => {
      entry.qualityFlags.forEach(flag => {
        issues[flag] = (issues[flag] || 0) + 1;
      });
    });
    
    const sourceBreakdown: Record<string, number> = {};
    Object.values(this.entries).forEach(entry => {
      const source = entry.sourceConnector;
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });
    
    return {
      totalCases,
      avgQualityScore: totalCases > 0 ? scores.reduce((a, b) => a + b, 0) / totalCases : 0,
      qualityHistogram: histogram,
      commonIssues: Object.entries(issues)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count),
      sourceBreakdown
    };
  }
  
  private computeHash(entry: ProvenanceEntry): string {
    const str = JSON.stringify(entry);
    return require('crypto').createHash('sha256').update(str).digest('hex');
  }
  
  private getScoreBin(score: number): string {
    if (score >= 90) return 'excellent (90-100)';
    if (score >= 70) return 'good (70-89)';
    if (score >= 50) return 'fair (50-69)';
    return 'poor (<50)';
  }
}

// Default export
export default ProvenanceTracker;