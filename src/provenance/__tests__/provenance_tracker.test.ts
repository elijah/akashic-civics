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

  it('should return entries in correct format', () => {
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
});