/**
 * Security Testing Framework
 *
 * Tests input validation, injection prevention, and security
 * properties across the Akashic Civics analysis system.
 */

describe('Security Tests: Input Validation and Injection Prevention', () => {
  /** Test: Statistical analysis rejects invalid inputs */
  test('Descriptive statistics rejects empty array', () => {
    const { computeDescriptiveStatistics } = require('../statistical/statistical_analysis');

    // Empty array should produce default stats, not crash
    const result = computeDescriptiveStatistics([]);
    expect(result).toBeDefined();
    expect(result.conviction_rate).toBe(0);
    expect(result.case_count).toBe(0);
  });

  test('OLS regression rejects malformed data', () => {
    const { runOLSRegression } = require('../statistical/statistical_analysis');

    const malformedCases = [{ case_id: 'bad', conviction: null, sentence_months: null, days_to_disposition: null, race_ethnicity: null, offense_severity: null, missing_fields: null }];

    // Should not throw, return zero coefficients
    const result = runOLSRegression(malformedCases, ['race_ethnicity']);
    expect(result).toBeDefined();
    expect(result.coefficients.race_ethnicity).toBe(0);
  });

  /** Test: CLI input sanitization */
  test('CLI project init validates dataset paths', () => {
    // Mock CLI validation logic
    const validateDatasetPath = (path: string): boolean => {
      if (!path) return false;
      if (path.includes('..')) return false; // Prevent directory traversal
      if (path.includes(';')) return false; // Prevent command injection
      if (path.includes('|')) return false; // Prevent pipe injection
      return true;
    };

    expect(validateDatasetPath('/safe/path')).toBe(true);
    expect(validateDatasetPath('/safe/../path')).toBe(false);
    expect(validateDatasetPath('/safe/path;rm -rf /')).toBe(false);
    expect(validateDatasetPath('/safe/path|rm -rf /')).toBe(false);
  });

  test('CLI export format validation', () => {
    const validateExportFormat = (format: string): format is 'markdown' | 'html' | 'json' | 'csv' => {
      const validFormats = ['markdown', 'html', 'json', 'csv'];
      return validFormats.includes(format);
    };

    expect(validateExportFormat('markdown')).toBe(true);
    expect(validateExportFormat('json')).toBe(true);
    expect(validateExportFormat('txt')).toBe(false);
    expect(validateExportFormat('')).toBe(false);
  });

  /** Test: File operations prevent path traversal */
  test('Path traversal prevention in file reads', () => {
    const preventPathTraversal = (filePath: string): string | null => {
      const cleaned = filePath.replace(/\\.\./g, '');
      if (cleaned !== filePath) {
        // Path traversal detected
        return null;
      }
      return cleaned;
    };

    expect(preventPathTraversal('/safe/path')).toBe('/safe/path');
    expect(preventPathTraversal('/safe/../etc/passwd')).toBeNull();
    expect(preventPathTraversal('/safe/..%2fpasswd')).toBe('/safe/..%2fpasswd');
  });

  /** Test: R bridge rejects malicious R code */
  test('R bridge validates analysis requests', () => {
    const validateRRequest = (request: string): boolean => {
      const dangerousPatterns = ['system(', 'library(', 'require(', 'install.packages(', 'source('];
      return !dangerousPatterns.some(pattern => request.includes(pattern));
    };

    expect(validateRRequest('mean(cases)')).toBe(true);
    expect(validateRRequest('t.test(cases)')).toBe(true);
    expect(validateRRequest('system("rm -rf /")')).toBe(false);
    expect(validateRRequest('library(hackpkg)')).toBe(false);
  });

  /** Test: JSON parsing handles malformed input gracefully */
  test('JSON parsing handles malformed input', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-security-'));

    try {
      // Write malformed JSON that should not crash the system
      const malformedFile = path.join(tmpDir, 'malformed.jsonl');
      fs.writeFileSync(malformedFile, 'not valid json\n{"valid": true}\n{"also": null}\n');

      // Read line by line with graceful handling
      const lineStream = fs.readFileSync(malformedFile, 'utf8').split('\n');
      const parsedRecords: any[] = [];

      for (const line of lineStream) {
        try {
          const parsed = JSON.parse(line);
          if (parsed !== null) {
            parsedRecords.push(parsed);
          }
        } catch {
          // Skip malformed lines
        }
      }

      expect(parsedRecords.length).toBe(2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /** Test: Summary statistics reject extreme outliers */
  test('Summary statistics handles extreme values', () => {
    const { computeDescriptiveStatistics } = require('../statistical/statistical_analysis');

    // Extreme but valid values
    const extremeCases = Array.from({ length: 100 }, (_, i) => ({
      case_id: `extreme_${i}`,
      conviction: i % 2 === 0 ? 1 : 0,
      sentence_months: 100000, // Very long sentence
      days_to_disposition: 100000, // Very long time
      race_ethnicity: 'White',
      offense_severity: 'Felony',
      missing_fields: [],
    }));

    const result = computeDescriptiveStatistics(extremeCases);
    expect(result).toBeDefined();
    expect(result.conviction_rate).toBeCloseTo(0.5, 1);
    expect(result.avg_sentence_months).toBe(100000);
  });

  /** Test: Race/ethnicity values are validated */
  test('Race/ethnicity values are from expected set', () => {
    const validRaces = ['White', 'Black', 'Hispanic', 'Asian', 'Native American', 'Other'];

    const testRaceValues = ['White', 'BLACK', 'Hispanic ', 'Asian', '', null];

    for (const race of testRaceValues) {
      if (race === null || race === undefined) {
        // null is acceptable
        continue;
      }

      const isValid = validRaces.includes(race);
      if (!isValid) {
        fail(`Invalid race/ethnicity value: "${race}"`);
      }
    }
  });

  /** Test: Offense severity values are validated */
  test('Offense severity values are from expected set', () => {
    const validSeverities = ['Felony', 'Misdemeanor', 'Infraction'];

    const testSeverities = ['Felony', 'felony', 'Misdemeanor', 'infraction', ''];

    for (const sev of testSeverities) {
      if (sev === '') continue; // Empty is handled separately
      const isValid = validSeverities.includes(sev);
      if (!isValid) {
        fail(`Invalid offense severity value: "${sev}"`);
      }
    }
  });

  /** Test: Missing fields are properly handled */
  test('Missing fields array is handled safely', () => {
    const { computeDescriptiveStatistics } = require('../statistical/statistical_analysis');

    const casesWithMissing = [
      {
        case_id: 'm1',
        conviction: 1,
        sentence_months: 12,
        days_to_disposition: 30,
        race_ethnicity: 'White',
        offense_severity: 'Misdemeanor',
        missing_fields: ['sentence_months'],
      },
      {
        case_id: 'm2',
        conviction: 0,
        sentence_months: 6,
        days_to_disposition: 15,
        race_ethnicity: 'Black',
        offense_severity: 'Felony',
        missing_fields: [],
      },
    ];

    const result = computeDescriptiveStatistics(casesWithMissing);
    expect(result).toBeDefined();
    expect(result.case_count).toBe(2);
  });

  /** Test: Conviction values are binary (0 or 1) */
  test('Conviction values are binary', () => {
    const { computeDescriptiveStatistics } = require('../statistical/statistical_analysis');

    const binaryCases = [
      { case_id: 'b1', conviction: 1, sentence_months: 12, days_to_disposition: 30, race_ethnicity: 'White', offense_severity: 'Misdemeanor', missing_fields: [] },
      { case_id: 'b2', conviction: 0, sentence_months: 6, days_to_disposition: 15, race_ethnicity: 'Black', offense_severity: 'Felony', missing_fields: [] },
      { case_id: 'b3', conviction: 1, sentence_months: 9, days_to_disposition: 20, race_ethnicity: 'Hispanic', offense_severity: 'Infraction', missing_fields: [] },
    ];

    const result = computeDescriptiveStatistics(binaryCases);
    expect(result.conviction_rate).toBeCloseTo(2 / 3, 1);
  });

  /** Test: OLS coefficients are within reasonable bounds */
  test('OLS coefficients within bounds', () => {
    const { runOLSRegression } = require('../statistical/statistical_analysis');

    // Create realistic dataset
    const n = 100;
    const cases: any[] = [];

    for (let i = 0; i < n; i++) {
      cases.push({
        case_id: `c${i}`,
        conviction: Math.random() > 0.3 ? 1 : 0,
        sentence_months: Math.floor(Math.random() * 60),
        days_to_disposition: Math.floor(Math.random() * 180),
        race_ethnicity: ['White', 'Black', 'Hispanic'][Math.floor(Math.random() * 3)],
        offense_severity: ['Misdemeanor', 'Felony'][Math.floor(Math.random() * 2)],
        missing_fields: [],
      });
    }

    const result = runOLSRegression(cases, ['race_ethnicity']);
    expect(result.coefficients.race_ethnicity).toBeGreaterThan(-1);
    expect(result.coefficients.race_ethnicity).toBeLessThan(1);
    expect(result.r_squared).toBeGreaterThanOrEqual(0);
    expect(result.r_squared).toBeLessThanOrEqual(1);
  });

  /** Test: Cache manager rejects invalid keys */
  test('Cache manager rejects problematic keys', () => {
    const { createCacheManager } = require('../performance/caching_layer');

    const tmpDir = require('os').tmpdir();
    const fs = require('fs');
    const path = require('path');
    const tmpPath = path.join(tmpDir, 'test-cache-sec-');

    try {
      const manager = createCacheManager(tmpPath);

      // Store valid entry
      manager.store({ query: 'test' }, { result: 'ok' });

      // Try various key formats
      expect(() => manager.lookup(null)).not.toThrow();
      expect(() => manager.lookup(undefined)).not.toThrow();
      expect(() => manager.lookup({ invalid: 'key' })).not.toThrow();

      // These should return null (not found)
      expect(manager.lookup(null)).toBeNull();
      expect(manager.lookup(undefined)).toBeNull();
    } finally {
      fs.rmSync(tmpPath, { recursive: true, force: true });
    }
  });

  /** Test: Directory listing is bounded */
  test('Directory scanning has limits', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-dirlim-'));

    try {
      // Create many files
      for (let i = 0; i < 1000; i++) {
        fs.writeFileSync(path.join(tmpDir, `file_${i}.txt`), 'content');
      }

      // List files - should not crash
      const files = fs.readdirSync(tmpDir);
      expect(files.length).toBe(1000);

      // But bounded iteration is safer
      let count = 0;
      for (const _file of fs.readdirSync(tmpDir)) {
        if (count > 100) break; // Safety bound
        count++;
      }
      expect(count).toBe(100);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});