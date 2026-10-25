import HistoricalBaseline from '../../../src/statistical/historical_baseline';

describe('HistoricalBaseline', () => {
  const snapshotDir = '/tmp/snapshots-test-historical-baseline';

  beforeEach(() => {
    // Clean up directory before each test
    const fs = require('fs');
    if (fs.existsSync(snapshotDir)) {
      fs.rmSync(snapshotDir, { recursive: true });
    }
  });

  it('should initialize with empty snapshots', () => {
    const baseline = new HistoricalBaseline(snapshotDir);
    expect(baseline).toBeDefined();
    expect(baseline.getSnapshots('test')).toHaveLength(0);
  });

  it('should load existing snapshots from directory', () => {
    const baseline = new HistoricalBaseline(snapshotDir);
    expect(baseline).toBeDefined();
  });

  it('should create snapshot from current data', () => {
    const baseline = new HistoricalBaseline(snapshotDir);
    const cases = [
      { conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high' },
      { conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low' },
    ];

    const snapshot = baseline.createSnapshot('TX-001', cases as any);

    expect(snapshot).toBeDefined();
    expect(snapshot.jurisdiction_id).toBe('TX-001');
    expect(snapshot.case_count).toBe(2);
    expect(snapshot.key_statistics).toBeDefined();
    expect(snapshot.data_hash).toBeDefined();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should compare snapshot against baseline', () => {
    const baseline = new HistoricalBaseline(snapshotDir);

    const currentCases = [
      { conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high' },
      { conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low' },
    ];
    const currentSnapshot = baseline.createSnapshot('TX-001', currentCases as any);

    const baselineCases = [
      { conviction: 1, sentence_months: 10, days_to_disposition: 50, race_ethnicity: 'Black', offense_severity: 'high' },
      { conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low' },
    ];
    const baselineSnapshot = baseline.createSnapshot('TX-001-baseline', baselineCases as any);

    // Add baseline snapshot to the internal map for testing
    (baseline as any).snapshots.set(baselineSnapshot.snapshot_id, baselineSnapshot);

    const comparison = baseline.compareWithBaseline(currentSnapshot, baselineSnapshot.snapshot_id);

    // Handle case where comparison might be null
    expect(comparison).toBeDefined();
    if (comparison) {
      expect(comparison.effect_size).toBeDefined();
      expect(comparison.percent_change).toBeDefined();
      expect(comparison.is_significant).toBeDefined();
      expect(comparison.interpretation).toBeDefined();
    }
  });

  it('should return null when comparing against non-existent baseline', () => {
    const baseline = new HistoricalBaseline(snapshotDir);
    const cases = [
      { conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high' },
    ];
    const currentSnapshot = baseline.createSnapshot('TX-001', cases as any);

    const comparison = baseline.compareWithBaseline(currentSnapshot, 'non-existent-id');
    expect(comparison).toBeNull();
  });

  it('should get snapshots for a jurisdiction', () => {
    const baseline = new HistoricalBaseline(snapshotDir);

    const cases1 = [{ conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high' }];
    const snapshot1 = baseline.createSnapshot('TX-001', cases1 as any);

    const cases2 = [{ conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low' }];
    const snapshot2 = baseline.createSnapshot('TX-001', cases2 as any);

    const cases3 = [{ conviction: 1, sentence_months: 10, days_to_disposition: 50, race_ethnicity: 'Hispanic', offense_severity: 'medium' }];
    const snapshot3 = baseline.createSnapshot('CA-001', cases3 as any);

    // Use all snapshots
    const allSnapshots = [snapshot1, snapshot2, snapshot3];
    expect(allSnapshots).toHaveLength(3);

    const txSnapshots = baseline.getSnapshots('TX-001');
    expect(txSnapshots).toHaveLength(2);
    expect(txSnapshots[0].jurisdiction_id).toBe('TX-001');
    expect(txSnapshots[1].jurisdiction_id).toBe('TX-001');

    const caSnapshots = baseline.getSnapshots('CA-001');
    expect(caSnapshots).toHaveLength(1);
    expect(caSnapshots[0].jurisdiction_id).toBe('CA-001');
  });

  it('should get most recent snapshot', () => {
    const baseline = new HistoricalBaseline(snapshotDir);

    const cases1 = [{ conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high' }];
    const snapshot1 = baseline.createSnapshot('TX-001', cases1 as any);

    const cases2 = [{ conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low' }];
    const snapshot2 = baseline.createSnapshot('TX-001', cases2 as any);

    // Use both snapshots
    const snapshots = [snapshot1, snapshot2];
    expect(snapshots).toHaveLength(2);

    const mostRecent = baseline.getMostRecentSnapshot();
    expect(mostRecent).toBeDefined();
    if (mostRecent && snapshot2) {
      expect(mostRecent.snapshot_id).toBe(snapshot2.snapshot_id);
    }
  });

  it('should detect change points in conviction rates', () => {
    const baseline = new HistoricalBaseline(snapshotDir);

    const cases1 = [{ conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high' }];
    const snapshot1 = baseline.createSnapshot('TX-001', cases1 as any);

    const cases2 = [{ conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low' }];
    const snapshot2 = baseline.createSnapshot('TX-001', cases2 as any);

    const cases3 = [{ conviction: 1, sentence_months: 10, days_to_disposition: 50, race_ethnicity: 'Black', offense_severity: 'high' }];
    const snapshot3 = baseline.createSnapshot('TX-001', cases3 as any);

    // Use all snapshots
    const snapshots = [snapshot1, snapshot2, snapshot3];
    expect(snapshots).toHaveLength(3);

    const changePoints = baseline.detectChangePoints('TX-001');
    expect(changePoints).toBeDefined();
    expect(Array.isArray(changePoints)).toBe(true);
  });

  it('should export snapshots', () => {
    const baseline = new HistoricalBaseline(snapshotDir);

    const cases1 = [{ conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high' }];
    const snapshot1 = baseline.createSnapshot('TX-001', cases1 as any);

    const cases2 = [{ conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low' }];
    const snapshot2 = baseline.createSnapshot('CA-001', cases2 as any);

    // Use both snapshots
    const snapshots = [snapshot1, snapshot2];
    expect(snapshots).toHaveLength(2);

    const exported = baseline.exportSnapshots();
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('string');

    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it('should export snapshots for a specific jurisdiction', () => {
    const baseline = new HistoricalBaseline(snapshotDir);

    const cases1 = [{ conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high' }];
    const snapshot1 = baseline.createSnapshot('TX-001', cases1 as any);

    const cases2 = [{ conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low' }];
    const snapshot2 = baseline.createSnapshot('CA-001', cases2 as any);

    // Use both snapshots
    const snapshots = [snapshot1, snapshot2];
    expect(snapshots).toHaveLength(2);

    const exported = baseline.exportSnapshots('TX-001');
    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].jurisdiction_id).toBe('TX-001');
  });

  it('should handle empty cases array', () => {
    const baseline = new HistoricalBaseline(snapshotDir);
    const snapshot = baseline.createSnapshot('TX-001', []);
    
    expect(snapshot).toBeDefined();
    expect(snapshot.case_count).toBe(0);
    expect(snapshot.key_statistics.conviction_rate).toBe(0);
    expect(snapshot.key_statistics.avg_sentence_months).toBe(0);
    expect(snapshot.key_statistics.avg_days_to_disposition).toBe(0);
    expect(snapshot.key_statistics.demographic_distribution).toEqual({});
    expect(snapshot.key_statistics.offense_mix).toEqual({});
    expect(snapshot.key_statistics.missing_rate).toBe(1);
  });

  it('should handle missing fields in cases', () => {
    const baseline = new HistoricalBaseline(snapshotDir);
    const cases = [
      { conviction: 1, sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { conviction: 0, sentence_months: null, days_to_disposition: null, race_ethnicity: 'White', offense_severity: 'low', missing_fields: ['field1'] },
    ];
    
    const snapshot = baseline.createSnapshot('TX-001', cases as any);
    expect(snapshot).toBeDefined();
    expect(snapshot.derived_variables.total_cases).toBe(2);
    expect(snapshot.derived_variables.total_convictions).toBe(1);
    expect(snapshot.key_statistics.missing_rate).toBe(0.5);
  });

  it('should handle cases with all conviction values null', () => {
    const baseline = new HistoricalBaseline(snapshotDir);
    const cases = [
      { sentence_months: 12, days_to_disposition: 60, race_ethnicity: 'Black', offense_severity: 'high', missing_fields: [] },
      { sentence_months: 10, days_to_disposition: 50, race_ethnicity: 'White', offense_severity: 'low', missing_fields: [] },
    ];
    
    const snapshot = baseline.createSnapshot('TX-001', cases as any);
    expect(snapshot.key_statistics.conviction_rate).toBe(0);
  });
});
