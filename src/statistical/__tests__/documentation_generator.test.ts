import {
  generateDisconfirmationReport,
  generateMarkdownReport,
  generateExecutiveSummary,
  getOverallInterpretation,
  documentTestResult
} from '../documentation_generator';
import { TestName, CredibilityLevel, DisconfirmationScore } from '../scoring_framework';

function makeScore(overall: number = 0.75, tier: CredibilityLevel = CredibilityLevel.HIGH): DisconfirmationScore {
  return {
    overall,
    tier,
    tierLabel: 'High',
    tierInterpretation: 'Highly credible',
    tierAction: 'Report',
    breakdown: [],
    testsRun: 6,
    testsSkipped: 0,
    coverage: 1.0,
    recommendations: [],
    criticalFailures: [],
    reportable: true
  };
}

describe('Documentation Generator', () => {
  describe('documentTestResult', () => {
    test('returns documentation for a test result', () => {
      const result: any = {
        test: TestName.PLACEBO,
        passed: true,
        evidence: { pValue: 0.3 },
        score: 1.0,
        notes: ''
      };
      const doc = documentTestResult(result);
      expect(doc.test).toBe(TestName.PLACEBO);
      expect(doc.name).toBeDefined();
      expect(doc.title).toBeDefined();
      expect(doc.passed).toBe(true);
      expect(doc.score).toBeDefined();
    });
  });

  describe('getOverallInterpretation', () => {
    test('returns interpretation for HIGH tier', () => {
      const score = makeScore(0.95, CredibilityLevel.HIGH);
      const interpretation = getOverallInterpretation(score);
      expect(interpretation.summary).toBeDefined();
      expect(interpretation.confidenceLevel).toBeDefined();
      expect(interpretation.caveats).toBeDefined();
      expect(interpretation.nextSteps).toBeDefined();
    });

    test('returns interpretation for NOT_CREDIBLE tier', () => {
      const score = makeScore(0.05, CredibilityLevel.NOT_CREDIBLE);
      const interpretation = getOverallInterpretation(score);
      expect(interpretation.summary).toBeDefined();
      expect(interpretation.caveats.length).toBeGreaterThan(0);
    });
  });

  describe('generateDisconfirmationReport', () => {
    test('returns a complete report', () => {
      const score = makeScore(0.8, CredibilityLevel.HIGH);
      const testResults: any[] = [];
      const report = generateDisconfirmationReport(score, testResults as any, { analysisName: 'Test Analysis' });
      expect(report.header.analysisName).toBe('Test Analysis');
      expect(report.score.overall).toBe(0.8);
      expect(report.testResults).toEqual([]);
      expect(report.keyFindings).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('generateMarkdownReport', () => {
    test('returns markdown string', () => {
      const score = makeScore(0.8, CredibilityLevel.HIGH);
      const testResults: any[] = [];
      const md = generateMarkdownReport(score, testResults as any, { analysisName: 'Test Analysis' });
      expect(typeof md).toBe('string');
      expect(md.length).toBeGreaterThan(0);
      expect(md).toContain('# Disconfirmation Testing Report');
    });
  });

  describe('generateExecutiveSummary', () => {
    test('returns executive summary string', () => {
      const score = makeScore(0.8, CredibilityLevel.HIGH);
      const summary = generateExecutiveSummary(score, 'Test Analysis');
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    test('handles unknown tier gracefully', () => {
      const score = makeScore(0.5, CredibilityLevel.TENTATIVE);
      const summary = generateExecutiveSummary(score, 'Test Analysis');
      expect(typeof summary).toBe('string');
    });
  });
});