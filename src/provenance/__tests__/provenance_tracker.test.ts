import ProvenanceTracker from '../provenance_tracker';

describe('ProvenanceTracker', () => {
  it('should initialize with empty state', () => {
    const tracker = new ProvenanceTracker();
    expect(tracker).toBeDefined();
    expect(tracker.getAllEntries()).toEqual({});
  });

  it('should record a case with proper metadata', () => {
    const tracker = new ProvenanceTracker();
    const caseId = 'case-001';
    const entry = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: undefined,
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 0.95,
      qualityFlags: [],
      transformationHistory: [],
    };

    tracker.addEntry(caseId, entry);

    const allEntries = tracker.getAllEntries();
    expect(Object.keys(allEntries)).toHaveLength(1);
    expect(allEntries[caseId].sourceConnector).toBe('akashic-pipeline');
    expect(allEntries[caseId].dataQualityScore).toBe(0.95);
    expect(allEntries[caseId].ingestionTimestamp).toBeDefined();
  });

  it('should handle multiple cases', () => {
    const tracker = new ProvenanceTracker();
    
    const case1Id = 'case-001';
    const entry1 = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: undefined,
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 0.95,
      qualityFlags: [],
      transformationHistory: [],
    };
    
    const case2Id = 'case-002';
    const entry2 = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: undefined,
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 0.92,
      qualityFlags: [],
      transformationHistory: [],
    };

    tracker.addEntry(case1Id, entry1);
    tracker.addEntry(case2Id, entry2);

    const allEntries = tracker.getAllEntries();
    expect(Object.keys(allEntries)).toHaveLength(2);
    expect(allEntries[case1Id].sourceConnector).toBe('akashic-pipeline');
    expect(allEntries[case2Id].sourceConnector).toBe('akashic-pipeline');
    expect(allEntries[case1Id].dataQualityScore).toBe(0.95);
    expect(allEntries[case2Id].dataQualityScore).toBe(0.92);
  });

  it('should get entry by caseId', () => {
    const tracker = new ProvenanceTracker();
    const caseId = 'case-001';
    const entry = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: 'raw-001.json',
      ingestionTimestamp: '2023-01-01T10:00:00Z',
      dataQualityScore: 85.5,
      qualityFlags: ['high_completeness'],
      transformationHistory: [],
    };

    tracker.addEntry(caseId, entry);
    const retrieved = tracker.getEntry(caseId);
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.sourceConnector).toBe('akashic-pipeline');
    expect(retrieved?.dataQualityScore).toBe(85.5);
    expect(retrieved?.ingestionTimestamp).toBe('2023-01-01T10:00:00Z');
    expect(retrieved?.rawDataReference).toBe('raw-001.json');
  });

  it('should return undefined for non-existent case', () => {
    const tracker = new ProvenanceTracker();
    expect(tracker.getEntry('non-existent')).toBeUndefined();
  });

  it('should get all entries as a record', () => {
    const tracker = new ProvenanceTracker();
    const caseId = 'case-001';
    const entry = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: undefined,
      ingestionTimestamp: '2023-01-01T10:00:00Z',
      dataQualityScore: 85.5,
      qualityFlags: ['high_completeness'],
      transformationHistory: [],
    };

    tracker.addEntry(caseId, entry);
    const allEntries = tracker.getAllEntries();
    
    expect(allEntries).toHaveProperty(caseId);
    expect(allEntries[caseId].dataQualityScore).toBe(85.5);
  });

  it('should handle case with missing data quality score', () => {
    const tracker = new ProvenanceTracker();
    const caseId = 'case-001';
    const entry = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: undefined,
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: undefined,
      qualityFlags: ['missing_data'],
      transformationHistory: [{ step: 'ingestion', timestamp: new Date().toISOString(), description: 'Data received', parameters: {} }],
    };

    tracker.addEntry(caseId, entry as any);
    
    const allEntries = tracker.getAllEntries();
    expect(allEntries[caseId].dataQualityScore).toBeUndefined();
    expect(allEntries[caseId].qualityFlags).toContain('missing_data');
  });

  it('should return entries in correct format with all fields', () => {
    const tracker = new ProvenanceTracker();
    const caseId = 'case-001';
    const entry = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: undefined,
      ingestionTimestamp: '2023-01-01T10:00:00Z',
      dataQualityScore: 85.5,
      qualityFlags: ['high_completeness'],
      transformationHistory: [],
    };

    tracker.addEntry(caseId, entry);
    const allEntries = tracker.getAllEntries();
    
    expect(allEntries[caseId].sourceConnector).toBe('akashic-pipeline');
    expect(allEntries[caseId].sourceVersion).toBe('1.0.0');
    expect(allEntries[caseId].ingestionTimestamp).toBe('2023-01-01T10:00:00Z');
    expect(allEntries[caseId].dataQualityScore).toBe(85.5);
    expect(allEntries[caseId].qualityFlags).toEqual(['high_completeness']);
    expect(allEntries[caseId].transformationHistory).toEqual([]);
  });

  it('should compute hash for entry', () => {
    const tracker = new ProvenanceTracker();
    const caseId = 'case-001';
    const entry = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: undefined,
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 0.95,
      qualityFlags: [],
      transformationHistory: [],
    };

    tracker.addEntry(caseId, entry);
    const retrieved = tracker.getEntry(caseId);
    
    expect(retrieved).toBeDefined();
    // Hash should be a 64-character hex string (SHA256)
    expect(retrieved?.hash).toBeDefined();
    expect(typeof retrieved?.hash).toBe('string');
    if (retrieved?.hash) {
      expect(retrieved.hash.length).toBe(64);
    }
  });

  it('should compute quality report', () => {
    const tracker = new ProvenanceTracker();
    
    tracker.addEntry('case-001', {
      sourceConnector: 'pipeline-A',
      sourceVersion: '1.0.0',
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 95,
      qualityFlags: [],
      transformationHistory: [],
    });
    
    tracker.addEntry('case-002', {
      sourceConnector: 'pipeline-A',
      sourceVersion: '1.0.0',
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 70,
      qualityFlags: ['missing_demographics'],
      transformationHistory: [],
    });
    
    tracker.addEntry('case-003', {
      sourceConnector: 'pipeline-B',
      sourceVersion: '2.0.0',
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 50,
      qualityFlags: ['missing_demographics', 'inconsistent_dates'],
      transformationHistory: [],
    });

    const report = tracker.getQualityReport();
    
    expect(report.totalCases).toBe(3);
    expect(report.avgQualityScore).toBeCloseTo(71.67, 1);
    expect(report.qualityHistogram).toBeDefined();
    expect(Array.isArray(report.commonIssues)).toBe(true);
    expect(report.commonIssues.length).toBeGreaterThan(0);
    expect(report.commonIssues[0]).toHaveProperty('issue');
    expect(report.commonIssues[0]).toHaveProperty('count');
    expect(report.sourceBreakdown).toBeDefined();
    expect(report.sourceBreakdown['pipeline-A']).toBe(2);
    expect(report.sourceBreakdown['pipeline-B']).toBe(1);
  });

  it('should compute quality report with empty tracker', () => {
    const tracker = new ProvenanceTracker();
    const report = tracker.getQualityReport();
    
    expect(report.totalCases).toBe(0);
    expect(report.avgQualityScore).toBe(0);
    expect(report.qualityHistogram).toEqual({});
    expect(report.commonIssues).toEqual([]);
    expect(report.sourceBreakdown).toEqual({});
  });

  it('should export provenance as JSON buffer', () => {
    const tracker = new ProvenanceTracker();
    const caseId = 'case-001';
    const entry = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.0.0',
      rawDataReference: undefined,
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 0.95,
      qualityFlags: [],
      transformationHistory: [],
    };

    tracker.addEntry(caseId, entry);
    const exported = tracker.exportProvenance();
    
    expect(exported).toBeDefined();
    const exportedStr = typeof exported === 'string' ? exported : exported.toString();
    const parsed = JSON.parse(exportedStr);
    expect(parsed).toHaveProperty(caseId);
    expect(parsed[caseId].sourceConnector).toBe('akashic-pipeline');
  });

  it('should handle complex transformation history', () => {
    const tracker = new ProvenanceTracker();
    const caseId = 'case-001';
    const entry = {
      sourceConnector: 'akashic-pipeline',
      sourceVersion: '1.5.0',
      ingestionTimestamp: new Date().toISOString(),
      dataQualityScore: 80,
      qualityFlags: ['missing_demographics'],
      transformationHistory: [
        { step: 'ingestion', timestamp: '2024-01-01T10:00:00Z', description: 'Data ingested', parameters: { source: 'csv' } },
        { step: 'normalization', timestamp: '2024-01-01T10:30:00Z', description: 'Schema applied', parameters: { schema_version: '2.0' } },
        { step: 'quality_check', timestamp: '2024-01-01T11:00:00Z', description: 'Flags applied', parameters: { flags: ['missing_demographics'] } },
      ],
    };

    tracker.addEntry(caseId, entry);
    const retrieved = tracker.getEntry(caseId);
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.transformationHistory).toHaveLength(3);
    if (retrieved?.transformationHistory) {
      expect(retrieved.transformationHistory[0].step).toBe('ingestion');
      expect(retrieved.transformationHistory[1].step).toBe('normalization');
      expect(retrieved.transformationHistory[2].step).toBe('quality_check');
    }
  });
});