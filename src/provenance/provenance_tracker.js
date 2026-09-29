/**
 * Provenance & Metadata Tracking System
 * Tracks the complete lineage of every data point from source to result.
 */

const crypto = require('crypto');

class ProvenanceTracker {
  constructor() {
    this.entries = new Map();
  }
  
  addEntry(caseId, entry) {
    const hash = this.computeHash(entry);
    this.entries.set(caseId, {
      ...entry,
      hash: hash
    });
  }
  
  getEntry(caseId) {
    return this.entries.get(caseId);
  }
  
  getAllEntries() {
    return Object.fromEntries(this.entries);
  }
  
  exportProvenance() {
    return JSON.stringify(Object.fromEntries(this.entries), null, 2);
  }
  
  getQualityReport() {
    const totalCases = this.entries.size;
    if (totalCases === 0) {
      return {
        totalCases: 0,
        avgQualityScore: 0,
        qualityHistogram: {},
        commonIssues: [],
        sourceBreakdown: {}
      };
    }
    
    const scores = Array.from(this.entries.values()).map(e => e.dataQualityScore);
    const histogram = {};
    scores.forEach(score => {
      const bin = this.getScoreBin(score);
      histogram[bin] = (histogram[bin] || 0) + 1;
    });
    
    const issues = {};
    Array.from(this.entries.values()).forEach(entry => {
      entry.qualityFlags.forEach(flag => {
        issues[flag] = (issues[flag] || 0) + 1;
      });
    });
    
    const sourceBreakdown = {};
    Array.from(this.entries.values()).forEach(entry => {
      const source = entry.sourceConnector;
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });
    
    return {
      totalCases,
      avgQualityScore: scores.reduce((a, b) => a + b, 0) / totalCases,
      qualityHistogram: histogram,
      commonIssues: Object.entries(issues)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count),
      sourceBreakdown
    };
  }
  
  computeHash(entry) {
    const str = JSON.stringify(entry);
    return crypto.createHash('sha256').update(str).digest('hex');
  }
  
  getScoreBin(score) {
    if (score >= 90) return 'excellent (90-100)';
    if (score >= 70) return 'good (70-89)';
    if (score >= 50) return 'fair (50-69)';
    return 'poor (<50)';
  }
}

module.exports = ProvenanceTracker;
