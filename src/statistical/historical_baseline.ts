/**
 * Historical Baseline System
 * 
 * Stores normalized data snapshots over time for:
 * - Temporal robustness testing
 * - Baseline comparisons
 * - Anomaly detection
 * - Change point detection
 * 
 * This enables the disconfirmation framework's temporal robustness test
 * and allows analysts to compare against historical baselines.
 */

export interface DataSnapshot {
  snapshot_id: string;
  timestamp: string;
  jurisdiction_id: string;
  case_count: number;
  data_hash: string;           // Hash of normalized data state
  key_statistics: SnapshotStats;
  derived_variables: Record<string, number>;
}

export interface SnapshotStats {
  conviction_rate: number;
  avg_sentence_months: number;
  avg_days_to_disposition: number;
  demographic_distribution: Record<string, number>;
  offense_mix: Record<string, number>;
  missing_rate: number;
}

export interface BaselineComparison {
  current: DataSnapshot;
  baseline: DataSnapshot;
  effect_size: number;
  percent_change: number;
  is_significant: boolean;
  interpretation: string;
}

export class HistoricalBaseline {
  private snapshots: Map<string, DataSnapshot> = new Map();
  private snapshotDir: string;
  
  constructor(snapshotDir: string = './snapshots') {
    this.snapshotDir = snapshotDir;
    this.loadExisting();
  }
  
  // Create a new snapshot from current data
  createSnapshot(
    jurisdictionId: string,
    cases: Array<{
      conviction?: number;
      sentence_months?: number;
      days_to_disposition?: number;
      race_ethnicity?: string;
      offense_severity?: string;
      missing_fields?: string[];
    }>
  ): DataSnapshot {
    const timestamp = new Date().toISOString();
    const snapshotId = `${jurisdictionId}_${Date.now()}`;
    
    // Calculate statistics
    const stats = this.computeStats(cases);
    const derived = this.computeDerivedVariables(cases);
    
    // Create hash of data state
    const dataHash = this.hashData(cases);
    
    const snapshot: DataSnapshot = {
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
  
  // Compare current against a historical baseline
  compareWithBaseline(
    currentSnapshot: DataSnapshot,
    baselineSnapshotId: string
  ): BaselineComparison | null {
    const baseline = this.snapshots.get(baselineSnapshotId);
    if (!baseline) return null;
    
    const effectSize = currentSnapshot.key_statistics.conviction_rate - 
                       baseline.key_statistics.conviction_rate;
    
    const percentChange = baseline.key_statistics.conviction_rate > 0
      ? (effectSize / baseline.key_statistics.conviction_rate) * 100
      : 0;
    
    // Statistical significance test (z-test for proportions)
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
  
  // Get all snapshots for a jurisdiction
  getSnapshots(jurisdictionId: string): DataSnapshot[] {
    return Array.from(this.snapshots.values())
      .filter(s => s.jurisdiction_id === jurisdictionId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
  
  // Get most recent snapshot for temporal robustness testing
  getMostRecentSnapshot(): DataSnapshot | null {
    let latest: DataSnapshot | null = null;
    for (const snap of this.snapshots.values()) {
      if (!latest || snap.timestamp > latest.timestamp) {
        latest = snap;
      }
    }
    return latest;
  }
  
  // Detect change points in conviction rates over time
  detectChangePoints(jurisdictionId: string): Array<{
    point: string;
    before_rate: number;
    after_rate: number;
    magnitude: number;
  }> {
    const snapshots = this.getSnapshots(jurisdictionId);
    const changePoints: Array<{
      point: string;
      before_rate: number;
      after_rate: number;
      magnitude: number;
    }> = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const before = snapshots[i - 1].key_statistics.conviction_rate;
      const after = snapshots[i].key_statistics.conviction_rate;
      const magnitude = Math.abs(after - before);
      
      // Flag changes > 10 percentage points
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
  
  // Export snapshots for external use
  exportSnapshots(jurisdictionId?: string): string {
    const snapshots = jurisdictionId
      ? this.getSnapshots(jurisdictionId)
      : Array.from(this.snapshots.values());
    return JSON.stringify(snapshots, null, 2);
  }
  
  private computeStats(cases: Array<any>): SnapshotStats {
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
    
    // Demographic distribution
    const demographics: Record<string, number> = {};
    cases.forEach(c => {
      if (c.race_ethnicity) {
        demographics[c.race_ethnicity] = (demographics[c.race_ethnicity] || 0) + 1;
      }
    });
    
    // Offense mix
    const offenseMix: Record<string, number> = {};
    cases.forEach(c => {
      if (c.offense_severity) {
        offenseMix[c.offense_severity] = (offenseMix[c.offense_severity] || 0) + 1;
      }
    });
    
    // Missing rate
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
  
  private computeDerivedVariables(cases: Array<any>): Record<string, number> {
    return {
      total_cases: cases.length,
      total_convictions: cases.filter(c => c.conviction === 1).length,
      total_sentences: cases.filter(c => c.sentence_months && c.sentence_months > 0).length
    };
  }
  
  private hashData(cases: Array<any>): string {
    const str = JSON.stringify(cases);
    const hash = require('crypto').createHash('sha256');
    hash.update(str);
    return hash.digest('hex').substring(0, 16);
  }
  
  private testSignificance(
    p1: number, n1: number,
    p2: number, n2: number,
    alpha: number = 0.05
  ): boolean {
    // Two-proportion z-test
    const pooled = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooled * (1 - pooled) * (1/n1 + 1/n2));
    
    if (se === 0) return false;
    
    const z = (p1 - p2) / se;
    const p_value = 2 * (1 - this.normalCDF(Math.abs(z)));
    
    return p_value < alpha;
  }
  
  private normalCDF(x: number): number {
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
  
  private saveSnapshot(snapshot: DataSnapshot): void {
    const filename = path.join(this.snapshotDir, `${snapshot.snapshot_id}.json`);
    fs.mkdirSync(this.snapshotDir, { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2));
  }
  
  private loadExisting(): void {
    if (!fs.existsSync(this.snapshotDir)) return;
    
    const files = fs.readdirSync(this.snapshotDir).filter(f => f.endsWith('.json'));
    files.forEach(file => {
      const content = fs.readFileSync(path.join(this.snapshotDir, file), 'utf-8');
      const snapshot = JSON.parse(content);
      this.snapshots.set(snapshot.snapshot_id, snapshot);
    });
  }
}

export default HistoricalBaseline;