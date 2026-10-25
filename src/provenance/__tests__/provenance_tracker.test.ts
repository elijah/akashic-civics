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

   // New validation tests
   it('should reject invalid caseId', () => {
     const tracker = new ProvenanceTracker();
     const entry = {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: [],
       transformationHistory: [],
     };
     
     expect(() => tracker.addEntry('', entry)).toThrow('Invalid caseId');
     expect(() => tracker.addEntry(null as any, entry)).toThrow('Invalid caseId');
     expect(() => tracker.addEntry(undefined as any, entry)).toThrow('Invalid caseId');
     expect(() => tracker.addEntry(123 as any, entry)).toThrow('Invalid caseId');
   });

   it('should reject missing sourceConnector', () => {
     const tracker = new ProvenanceTracker();
     const entry = {
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: [],
       transformationHistory: [],
     };
     
     expect(() => tracker.addEntry('case-001', entry as any)).toThrow('Invalid entry: sourceConnector must be a non-empty string');
   });

   it('should reject invalid dataQualityScore', () => {
     const tracker = new ProvenanceTracker();
     const baseEntry = {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       qualityFlags: [],
       transformationHistory: [],
     };
     
     expect(() => tracker.addEntry('case-001', { ...baseEntry, dataQualityScore: -1 })).toThrow('Invalid entry: dataQualityScore must be a number between 0 and 100');
     expect(() => tracker.addEntry('case-001', { ...baseEntry, dataQualityScore: 101 })).toThrow('Invalid entry: dataQualityScore must be a number between 0 and 100');
     expect(() => tracker.addEntry('case-001', { ...baseEntry, dataQualityScore: 'invalid' as any })).toThrow('Invalid entry: dataQualityScore must be a number between 0 and 100');
   });

   it('should reject invalid qualityFlags', () => {
     const tracker = new ProvenanceTracker();
     const baseEntry = {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       transformationHistory: [],
     };
     
     expect(() => tracker.addEntry('case-001', { ...baseEntry, qualityFlags: null as any })).toThrow('Invalid entry: qualityFlags must be an array');
     expect(() => tracker.addEntry('case-001', { ...baseEntry, qualityFlags: ['', 'valid'] })).toThrow('Invalid entry: qualityFlags must contain non-empty strings');
   });

   it('should reject invalid transformationHistory', () => {
     const tracker = new ProvenanceTracker();
     const baseEntry = {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: [],
     };
     
     expect(() => tracker.addEntry('case-001', { ...baseEntry, transformationHistory: null as any })).toThrow('Invalid entry: transformationHistory must be an array');
     expect(() => tracker.addEntry('case-001', { ...baseEntry, transformationHistory: [{ step: 123 as any, timestamp: '', description: '', parameters: {} }] })).toThrow('Invalid entry: transformationHistory elements must have a step string');
   });

   it('should remove entries', () => {
     const tracker = new ProvenanceTracker();
     tracker.addEntry('case-001', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: [],
       transformationHistory: [],
     });
     
     expect(tracker.getEntryCount()).toBe(1);
     expect(tracker.hasEntry('case-001')).toBe(true);
     
     const removed = tracker.removeEntry('case-001');
     expect(removed).toBe(true);
     expect(tracker.getEntryCount()).toBe(0);
     expect(tracker.hasEntry('case-001')).toBe(false);
     expect(tracker.removeEntry('nonexistent')).toBe(false);
   });

   it('should clear all entries', () => {
     const tracker = new ProvenanceTracker();
     tracker.addEntry('case-001', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: [],
       transformationHistory: [],
     });
     tracker.addEntry('case-002', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 85,
       qualityFlags: [],
       transformationHistory: [],
     });
     
     expect(tracker.getEntryCount()).toBe(2);
     tracker.clear();
     expect(tracker.getEntryCount()).toBe(0);
     expect(tracker.getAllEntries()).toEqual({});
   });

   it('should get entries by source connector', () => {
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
       sourceConnector: 'pipeline-B',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 85,
       qualityFlags: [],
       transformationHistory: [],
     });
     tracker.addEntry('case-003', {
       sourceConnector: 'pipeline-A',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 75,
       qualityFlags: [],
       transformationHistory: [],
     });
     
     const pipelineA = tracker.getEntriesBySource('pipeline-A');
     expect(Object.keys(pipelineA)).toHaveLength(2);
     expect(pipelineA['case-001']).toBeDefined();
     expect(pipelineA['case-003']).toBeDefined();
     
     const pipelineC = tracker.getEntriesBySource('pipeline-C');
     expect(Object.keys(pipelineC)).toHaveLength(0);
   });

   it('should get entries by quality score range', () => {
     const tracker = new ProvenanceTracker();
     tracker.addEntry('case-001', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: [],
       transformationHistory: [],
     });
     tracker.addEntry('case-002', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 75,
       qualityFlags: [],
       transformationHistory: [],
     });
     tracker.addEntry('case-003', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 45,
       qualityFlags: [],
       transformationHistory: [],
     });
     
     const highQuality = tracker.getEntriesByQualityRange(90, 100);
     expect(Object.keys(highQuality)).toHaveLength(1);
     expect(highQuality['case-001']).toBeDefined();
     
     const midQuality = tracker.getEntriesByQualityRange(70, 89);
     expect(Object.keys(midQuality)).toHaveLength(1);
     expect(midQuality['case-002']).toBeDefined();
     
     const lowQuality = tracker.getEntriesByQualityRange(0, 49);
     expect(Object.keys(lowQuality)).toHaveLength(1);
     expect(lowQuality['case-003']).toBeDefined();
   });

   it('should get all quality flags', () => {
     const tracker = new ProvenanceTracker();
     tracker.addEntry('case-001', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: ['missing_demographics', 'inconsistent_dates'],
       transformationHistory: [],
     });
     tracker.addEntry('case-002', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 85,
       qualityFlags: ['missing_demographics', 'small_sample_size'],
       transformationHistory: [],
     });
     
     const flags = tracker.getAllQualityFlags();
     expect(flags).toContain('missing_demographics');
     expect(flags).toContain('inconsistent_dates');
     expect(flags).toContain('small_sample_size');
     expect(flags.length).toBe(3);
   });

   it('should get entries with specific flag', () => {
     const tracker = new ProvenanceTracker();
     tracker.addEntry('case-001', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: ['missing_demographics'],
       transformationHistory: [],
     });
     tracker.addEntry('case-002', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 85,
       qualityFlags: ['small_sample_size'],
       transformationHistory: [],
     });
     tracker.addEntry('case-003', {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 75,
       qualityFlags: ['missing_demographics', 'small_sample_size'],
       transformationHistory: [],
     });
     
     const withMissingDemo = tracker.getEntriesWithFlag('missing_demographics');
     expect(Object.keys(withMissingDemo)).toHaveLength(2);
     expect(withMissingDemo['case-001']).toBeDefined();
     expect(withMissingDemo['case-003']).toBeDefined();
     
     const withSmallSample = tracker.getEntriesWithFlag('small_sample_size');
     expect(Object.keys(withSmallSample)).toHaveLength(2);
     expect(withSmallSample['case-002']).toBeDefined();
     expect(withSmallSample['case-003']).toBeDefined();
   });

   it('should verify integrity of entries', () => {
     const tracker = new ProvenanceTracker();
     const entry1 = {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: [],
       transformationHistory: [],
     };
     const entry2 = {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 85,
       qualityFlags: [],
       transformationHistory: [],
     };
     
     tracker.addEntry('case-001', entry1);
     tracker.addEntry('case-002', entry2);
     
     const integrity = tracker.verifyIntegrity();
     expect(integrity.valid).toEqual(['case-001', 'case-002']);
     expect(integrity.invalid).toEqual([]);
     
     // Tamper with an entry
     const retrieved = tracker.getEntry('case-001');
     if (retrieved) {
       retrieved.dataQualityScore = 50; // This should invalidate the hash
     }
     
     const integrityAfterTamper = tracker.verifyIntegrity();
     expect(integrityAfterTamper.valid).toEqual(['case-002']);
     expect(integrityAfterTamper.invalid).toEqual(['case-001']);
   });

   it('should export and import provenance', () => {
     const tracker = new ProvenanceTracker();
     const caseId = 'case-001';
     const entry = {
       sourceConnector: 'akashic-pipeline',
       sourceVersion: '1.0.0',
       ingestionTimestamp: new Date().toISOString(),
       dataQualityScore: 95,
       qualityFlags: ['test_flag'],
       transformationHistory: [{ step: 'test', timestamp: new Date().toISOString(), description: 'test step', parameters: {} }],
     };
     
     tracker.addEntry(caseId, entry);
     
     // Export as JSON string
     const json = tracker.exportProvenanceJSON();
     expect(typeof json).toBe('string');
     
     // Create new tracker and import
     const newTracker = new ProvenanceTracker();
     expect(() => newTracker.importProvenance(json)).not.toThrow();
     
     const importedEntry = newTracker.getEntry(caseId);
     expect(importedEntry).toBeDefined();
     expect(importedEntry?.sourceConnector).toBe('akashic-pipeline');
     expect(importedEntry?.dataQualityScore).toBe(95);
     expect(importedEntry?.qualityFlags).toContain('test_flag');
   });

   it('should handle getScoreBin edge cases', () => {
     // Access private method via casting
     const tracker = new ProvenanceTracker() as any;
     
     expect(tracker.getScoreBin(95)).toBe('excellent (90-100)');
     expect(tracker.getScoreBin(85)).toBe('good (70-89)');
     expect(tracker.getScoreBin(60)).toBe('fair (50-69)');
     expect(tracker.getScoreBin(30)).toBe('poor (<50)');
     expect(tracker.getScoreBin(-5)).toBe('poor (<50)');
     expect(tracker.getScoreBin(105)).toBe('excellent (90-100)');
     expect(tracker.getScoreBin(NaN)).toBe('unknown');
     expect(tracker.getScoreBin(undefined as any)).toBe('unknown');
     expect(tracker.getScoreBin(null as any)).toBe('unknown');
   });
 });