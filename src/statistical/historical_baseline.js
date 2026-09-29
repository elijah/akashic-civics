/**
 * Historical Baseline System
 * Stores normalized data snapshots over time for temporal robustness testing.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class HistoricalBaseline {
  constructor(snapshotDir = './snapshots') {
    this.snapshots = new Map();
    this.snapshotDir = snapshotDir;
    this.loadExisting();
  }
  
  createSnapshot(jurisdictionId, cases) {
    const timestamp = new Date().toISOString();
    const snapshotId = `${jurisdictionId}_${Date.now()}`;
    
    const stats = this.computeStats(cases);
    const derived = this.computeDerivedVariables(cases);
    const dataHash = this.hashData(cases);
    
    const snapshot = {
      snapshot_id: snapshotId,
      timestamp,
      jurisdiction_id: jurisdictionId,
      case_count: cases.length,
      data_hash: dataHash,
      key_statistics: stats,
      derived_variables: derived
    };
    
    this.snapshots.set(snapshotId, snapshot);
    this.saveSnapshot(snapshot);
    
    return snapshot;
  }
  
  compareWithBaseline(currentSnapshot, baselineSnapshotId) {
    const baseline = this.snapshots.get(baselineSnapshotId);
    if (!baseline) return null;
    
    const effectSize = currentSnapshot.key_statistics.conviction_rate - 
                       baseline.key_statistics.conviction_rate;
    
    const percentChange = baseline.key_statistics.conviction_rate > 0
      ? (effectSize / baseline.key_statistics.conviction_rate) * 100
      : 0;
    
    const isSignificant = this.testSignificance(
      currentSnapshot.key_statistics.conviction_rate,
      currentSnapshot.case_count,
      baseline.key_statistics.conviction_rate,
      baseline.case_count
    );
    
    return {
      current: currentSnapshot,
      baseline,
      effect_size: effectSize,
      percent_change: percentChange,
      is_significant: isSignificant,
      interpretation: isSignificant
        ? `Significant ${percentChange.toFixed(1)}% change from baseline`
        : `No significant change from baseline (${percentChange.toFixed(1)}%)`
    };
  }
  
  getSnapshots(jurisdictionId) {
    return Array.from(this.snapshots.values())
      .filter(s => s.jurisdiction_id === jurisdictionId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  
  getMostRecentSnapshot() {
    let latest = null;
    for (const snap of this.snapshots.values()) {
      if (!latest || snap.timestamp > latest.timestamp) {
        latest = snap;
      }
    }
    return latest;
  }
  
  detectChangePoints(jurisdictionId) {
    const snapshots = this.getSnapshots(jurisdictionId);
    const changePoints = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const before = snapshots[i - 1].key_statistics.conviction_rate;
      const after = snapshots[i].key_statistics.conviction_rate;
      const magnitude = Math.abs(after - before);
      
      if (magnitude > 0.10) {
        changePoints.push({
          point: snapshots[i].timestamp,
          before_rate: before,
          after_rate: after,
          magnitude
        });
      }
    }
    
    return changePoints;
  }
  
  exportSnapshots(jurisdictionId) {
    const snapshots = jurisdictionId
      ? this.getSnapshots(jurisdictionId)
      : Array.from(this.snapshots.values());
    return JSON.stringify(snapshots, null, 2);
  }
  
  computeStats(cases) {
    if (cases.length === 0) {
      return {
        conviction_rate: 0,
        avg_sentence_months: 0,
        avg_days_to_disposition: 0,
        demographic_distribution: {},
        offense_mix: {},
        missing_rate: 1
      };
    }
    
    const convictions = cases.filter(c => c.conviction === 1).length;
    const sentences = cases.filter(c => c.sentence_months != null).map(c => c.sentence_months);
    const days = cases.filter(c => c.days_to_disposition != null).map(c => c.days_to_disposition);
    
    const demographics = {};
    cases.forEach(c => {
      if (c.race_ethnicity) {
        demographics[c.race_ethnicity] = (demographics[c.race_ethnicity] || 0) + 1;
      }
    });
    
    const offenseMix = {};
    cases.forEach(c => {
      if (c.offense_severity) {
        offenseMix[c.offense_severity] = (offenseMix[c.offense_severity] || 0) + 1;
      }
    });
    
    const missingCases = cases.filter(c => 
      c.missing_fields && c.missing_fields.length > 0
    ).length;
    
    return {
      conviction_rate: convictions / cases.length,
      avg_sentence_months: sentences.length > 0 ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0,
      avg_days_to_disposition: days.length > 0 ? days.reduce((a, b) => a + b, 0) / days.length : 0,
      demographic_distribution: demographics,
      offense_mix: offenseMix,
      missing_rate: missingCases / cases.length
    };
  }
  
  computeDerivedVariables(cases) {
    return {
      total_cases: cases.length,
      total_convictions: cases.filter(c => c.conviction === 1).length,
      total_sentences: cases.filter(c => c.sentence_months && c.sentence_months > 0).length
    };
  }
  
  hashData(cases) {
    const str = JSON.stringify(cases);
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }
  
  testSignificance(p1, n1, p2, n2, alpha = 0.05) {
    const pooled = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooled * (1 - pooled) * (1/n1 + 1/n2));
    
    if (se === 0) return false;
    
    const z = (p1 - p2) / se;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    
    return pValue < alpha;
  }
  
  normalCDF(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }
  
  saveSnapshot(snapshot) {
    const filename = path.join(this.snapshotDir, `${snapshot.snapshot_id}.json`);
    fs.mkdirSync(this.snapshotDir, { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2));
  }
  
  loadExisting() {
    if (!fs.existsSync(this.snapshotDir)) return;
    
    const files = fs.readdirSync(this.snapshotDir).filter(f => f.endsWith('.json'));
    files.forEach(file => {
      const content = fs.readFileSync(path.join(this.snapshotDir, file), 'utf-8');
      const snapshot = JSON.parse(content);
      this.snapshots.set(snapshot.snapshot_id, snapshot);
    });
  }
}

module.exports = HistoricalBaseline;
