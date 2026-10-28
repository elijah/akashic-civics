import { BiasAudit, BiasAuditConfig } from '../bias_audit';

describe('E27: Bias Audit Framework', () => {
  describe('Basic Structure', () => {
    it('should create a BiasAudit instance', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, score: 0.8, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 0, score: 0.6, attributes: {} },
        { id: 'c3', group: 'Black', predictedOutcome: 1, actualOutcome: 1, score: 0.7, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 0, score: 0.5, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] };
      const audit = new BiasAudit(cases, config);
      expect(audit).toBeInstanceOf(BiasAudit);
    });

    it('should compute group metrics correctly', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 0, attributes: {} },
        { id: 'c3', group: 'White', predictedOutcome: 0, actualOutcome: 1, attributes: {} },
        { id: 'c4', group: 'White', predictedOutcome: 0, actualOutcome: 0, attributes: {} },
      ];
      const audit = new BiasAudit(cases, { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] });
      const metrics = (audit as any).getGroupMetrics('White');
      expect(metrics.count).toBe(4);
      expect(metrics.positiveRate).toBe(0.5);
      expect(metrics.negativeRate).toBe(0.5);
      expect(metrics.truePositiveRate).toBe(0.5);
      expect(metrics.trueNegativeRate).toBe(0.5);
      expect(metrics.falsePositiveRate).toBe(0.5);
      expect(metrics.falseNegativeRate).toBe(0.5);
      expect(metrics.precision).toBe(0.5);
    });
  });

  describe('Demographic Parity', () => {
    it('should detect bias when rates differ across groups', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c3', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c5', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] };
      const audit = new BiasAudit(cases, config);
      const result = audit.runAudit();
      const dpMetric = result.metrics.find(m => m.name.includes('Demographic Parity'));
      expect(dpMetric).toBeDefined();
      expect(dpMetric!.passed).toBe(true);
    });

    it('should pass when groups have equal rates', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c3', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] };
      const audit = new BiasAudit(cases, config);
      const result = audit.runAudit();
      const dpMetric = result.metrics.find(m => m.name.includes('Demographic Parity'));
      expect(dpMetric!.passed).toBe(true);
    });
  });

  describe('Equalized Odds', () => {
    it('should detect bias when TPR differs', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c3', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c5', group: 'Black', predictedOutcome: 0, actualOutcome: 1, attributes: {} },
        { id: 'c6', group: 'Black', predictedOutcome: 0, actualOutcome: 1, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] };
      const audit = new BiasAudit(cases, config);
      const result = audit.runAudit();
      const eoMetric = result.metrics.find(m => m.name.includes('Equalized Odds'));
      expect(eoMetric).toBeDefined();
      expect(eoMetric!.passed).toBe(false);
    });

    it('should pass when TPRs are equal', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c3', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] };
      const audit = new BiasAudit(cases, config);
      const result = audit.runAudit();
      const eoMetric = result.metrics.find(m => m.name.includes('Equalized Odds'));
      expect(eoMetric!.passed).toBe(true);
    });
  });

  describe('Disparate Impact', () => {
    it('should detect disparate impact ratio below 80%', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c3', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c5', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c6', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] };
      const audit = new BiasAudit(cases, config);
      const result = audit.runAudit();
      const diMetric = result.metrics.find(m => m.name.includes('Disparate Impact'));
      expect(diMetric!.passed).toBe(true);
    });

    it('should fail when ratio is below 80%', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c3', group: 'Black', predictedOutcome: 0, actualOutcome: 1, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] };
      const audit = new BiasAudit(cases, config);
      const result = audit.runAudit();
      const diMetric = result.metrics.find(m => m.name.includes('Disparate Impact'));
      expect(diMetric!.passed).toBe(false);
    });
  });

  describe('Full Audit', () => {
    it('should run complete audit with all metrics', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, score: 0.9, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 0, score: 0.7, attributes: {} },
        { id: 'c3', group: 'Black', predictedOutcome: 1, actualOutcome: 1, score: 0.8, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 0, score: 0.6, attributes: {} },
        { id: 'c5', group: 'Hispanic', predictedOutcome: 1, actualOutcome: 1, score: 0.75, attributes: {} },
        { id: 'c6', group: 'Hispanic', predictedOutcome: 1, actualOutcome: 0, score: 0.55, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'], thresholds: { demographicParity: 0.1, equalizedOdds: 0.1, calibration: 0.05, disparateImpact: 0.8 } };
      const audit = new BiasAudit(cases, config);
      const result = audit.runAudit();
      expect(result.auditId).toBeDefined();
      expect(result.timestamp).toBeTruthy();
      expect(result.datasetSize).toBe(6);
      expect(result.overallAssessment).toBeDefined();
      expect(result.metrics.length).toBeGreaterThan(0);
      expect(result.groupMetrics.length).toBe(3);
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Markdown Export', () => {
    it('should export to markdown format', () => {
      const cases = [{ id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} }];
      const audit = new BiasAudit(cases, { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] });
      const result = audit.runAudit();
      const markdown = audit.exportToMarkdown(result);
      expect(markdown).toContain('Bias Audit Report');
      expect(markdown).toContain('Overall Assessment');
      expect(markdown).toContain('Metric');
      expect(markdown).toContain('Group');
      expect(markdown).toContain('Recommendations');
    });
  });

  describe('JSON Export', () => {
    it('should export to JSON format', () => {
      const cases = [{ id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} }];
      const audit = new BiasAudit(cases, { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'] });
      const result = audit.runAudit();
      const json = audit.exportToJSON(result) as any;
      expect(json.auditId).toBeDefined();
      expect(json.exportFormat).toBe('akashic-bias-audit-v1');
      expect(json.schemaVersion).toBe('1.0.0');
    });
  });

  describe('Comprehensive Scenario', () => {
    it('should produce assessment with failed metrics and recommendations', () => {
      const cases = [
        { id: 'c1', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c2', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c3', group: 'White', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c4', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c5', group: 'Black', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c6', group: 'Hispanic', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c7', group: 'Hispanic', predictedOutcome: 1, actualOutcome: 1, attributes: {} },
        { id: 'c8', group: 'Hispanic', predictedOutcome: 0, actualOutcome: 1, attributes: {} },
      ];
      const config: BiasAuditConfig = { referenceGroup: 'White', favorableOutcome: 1, protectedAttributes: ['group'], thresholds: { demographicParity: 0.1, equalizedOdds: 0.1, calibration: 0.05, disparateImpact: 0.8 } };
      const audit = new BiasAudit(cases, config);
      const result = audit.runAudit();
      const failed = result.metrics.filter(m => m.passed === false);
      expect(failed.length).toBeGreaterThan(0);
      expect(result.overallAssessment).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});