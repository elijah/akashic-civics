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
  hash?: string;            // SHA256 of this entry, computed by addEntry
  // Validation: sourceConnector and sourceVersion are required
  // dataQualityScore should be between 0 and 100
  // qualityFlags should be non-empty strings
  // ingestionTimestamp should be ISO 8601 format
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
  
  /**
   * Add a provenance entry with validation
   * @throws {Error} if validation fails
   */
  addEntry(caseId: string, entry: ProvenanceEntry): void {
    // Validate required fields
    if (!caseId || typeof caseId !== 'string') {
      throw new Error('Invalid caseId: must be a non-empty string');
    }
    
    if (!entry.sourceConnector || typeof entry.sourceConnector !== 'string') {
      throw new Error('Invalid entry: sourceConnector must be a non-empty string');
    }
    
    if (!entry.sourceVersion || typeof entry.sourceVersion !== 'string') {
      throw new Error('Invalid entry: sourceVersion must be a non-empty string');
    }
    
    if (entry.dataQualityScore !== undefined) {
      if (typeof entry.dataQualityScore !== 'number' || 
          entry.dataQualityScore < 0 || 
          entry.dataQualityScore > 100) {
        throw new Error('Invalid entry: dataQualityScore must be a number between 0 and 100');
      }
    }
    
    if (!Array.isArray(entry.qualityFlags)) {
      throw new Error('Invalid entry: qualityFlags must be an array');
    }
    
    // Validate qualityFlags elements
    for (const flag of entry.qualityFlags) {
      if (typeof flag !== 'string' || flag.trim() === '') {
        throw new Error('Invalid entry: qualityFlags must contain non-empty strings');
      }
    }
    
    if (!entry.ingestionTimestamp || typeof entry.ingestionTimestamp !== 'string') {
      throw new Error('Invalid entry: ingestionTimestamp must be a non-empty string');
    }
    
    // Basic ISO 8601 validation (can be enhanced)
    const timestampMatch = entry.ingestionTimestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (!timestampMatch) {
      throw new Error('Invalid entry: ingestionTimestamp must be in ISO 8601 format');
    }
    
    if (!Array.isArray(entry.transformationHistory)) {
      throw new Error('Invalid entry: transformationHistory must be an array');
    }
    
    // Validate transformationHistory elements
    for (const step of entry.transformationHistory) {
      if (!step || typeof step !== 'object') {
        throw new Error('Invalid entry: transformationHistory elements must be objects');
      }
      if (!step.step || typeof step.step !== 'string') {
        throw new Error('Invalid entry: transformationHistory elements must have a step string');
      }
      if (!step.timestamp || typeof step.timestamp !== 'string') {
        throw new Error('Invalid entry: transformationHistory elements must have a timestamp string');
      }
      if (!step.description || typeof step.description !== 'string') {
        throw new Error('Invalid entry: transformationHistory elements must have a description string');
      }
      if (step.parameters === undefined || typeof step.parameters !== 'object') {
        throw new Error('Invalid entry: transformationHistory elements must have parameters object');
      }
    }
    
    // Compute hash on entry data without the hash field
    const hash = this.computeHash({ ...entry });
    this.entries[caseId] = {
      ...entry,
      hash
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
    // Handle edge cases
    if (typeof score !== 'number' || isNaN(score)) {
      return 'unknown';
    }
    if (score >= 90) return 'excellent (90-100)';
    if (score >= 70) return 'good (70-89)';
    if (score >= 50) return 'fair (50-69)';
    if (score >= 0) return 'poor (<50)';
    // Negative scores are still "poor" category
    return 'poor (<50)';
  }
  
  /**
   * Remove an entry by case ID
   */
  removeEntry(caseId: string): boolean {
    if (this.entries[caseId]) {
      delete this.entries[caseId];
      return true;
    }
    return false;
  }
  
  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = {};
  }
  
  /**
   * Get count of entries
   */
  getEntryCount(): number {
    return Object.keys(this.entries).length;
  }
  
  /**
   * Check if entry exists
   */
  hasEntry(caseId: string): boolean {
    return caseId in this.entries;
  }
  
  /**
   * Get entries by source connector
   */
  getEntriesBySource(sourceConnector: string): Record<string, ProvenanceEntry> {
    const filtered: Record<string, ProvenanceEntry> = {};
    for (const [caseId, entry] of Object.entries(this.entries)) {
      if (entry.sourceConnector === sourceConnector) {
        filtered[caseId] = entry;
      }
    }
    return filtered;
  }
  
  /**
   * Get entries within a quality score range
   */
  getEntriesByQualityRange(minScore: number, maxScore: number): Record<string, ProvenanceEntry> {
    if (typeof minScore !== 'number' || typeof maxScore !== 'number') {
      throw new Error('minScore and maxScore must be numbers');
    }
    if (minScore > maxScore) {
      throw new Error('minScore cannot be greater than maxScore');
    }
    
    const filtered: Record<string, ProvenanceEntry> = {};
    for (const [caseId, entry] of Object.entries(this.entries)) {
      if (entry.dataQualityScore >= minScore && entry.dataQualityScore <= maxScore) {
        filtered[caseId] = entry;
      }
    }
    return filtered;
  }
  
  /**
   * Get all unique quality flags
   */
  getAllQualityFlags(): string[] {
    const flags = new Set<string>();
    for (const entry of Object.values(this.entries)) {
      entry.qualityFlags.forEach(flag => flags.add(flag));
    }
    return Array.from(flags).sort();
  }
  
  /**
   * Get entries with a specific quality flag
   */
  getEntriesWithFlag(flag: string): Record<string, ProvenanceEntry> {
    const filtered: Record<string, ProvenanceEntry> = {};
    for (const [caseId, entry] of Object.entries(this.entries)) {
      if (entry.qualityFlags.includes(flag)) {
        filtered[caseId] = entry;
      }
    }
    return filtered;
  }
  
  /**
   * Verify integrity of all entries by recomputing hashes
   */
  verifyIntegrity(): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];
    
    for (const [caseId, entry] of Object.entries(this.entries)) {
      // Strip hash before recomputing to match addEntry behavior
      const { hash, ...entryWithoutHash } = entry;
      const computedHash = this.computeHash(entryWithoutHash);
      if (hash === computedHash) {
        valid.push(caseId);
      } else {
        invalid.push(caseId);
      }
    }
    
    return { valid, invalid };
  }
  
  /**
   * Export provenance as JSON string (pretty-printed)
   */
  exportProvenanceJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }
  
  /**
   * Import provenance from JSON string
   * @throws {Error} if JSON is invalid or entries fail validation
   */
  importProvenance(json: string): void {
    let parsed: Record<string, ProvenanceEntry>;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new Error('Invalid JSON: ' + (e instanceof Error ? e.message : String(e)));
    }
    
    // Validate each entry before adding
    for (const [caseId, entry] of Object.entries(parsed)) {
      this.addEntry(caseId, entry);
    }
  }
}

// Default export
export default ProvenanceTracker;
