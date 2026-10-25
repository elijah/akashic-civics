/**
 * CLI Project Manager Tests
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ProjectManager, createProjectManager, PROJECT_DIR_NAME } from '../project_manager';

describe('ProjectManager', () => {
  let tmpDir: string;
  let manager: ProjectManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akashic-pm-'));
    manager = createProjectManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('initProject', () => {
    it('should create the .akashic directory structure', () => {
      manager.initProject({
        name: 'Test Project',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
      });

      expect(fs.existsSync(path.join(tmpDir, PROJECT_DIR_NAME))).toBe(true);
      expect(fs.existsSync(manager.getSessionsDir())).toBe(true);
      expect(fs.existsSync(manager.getResultsDir())).toBe(true);
      expect(fs.existsSync(path.join(manager.getProjectDir(), 'data'))).toBe(true);
      expect(fs.existsSync(path.join(manager.getProjectDir(), 'output'))).toBe(true);
    });

    it('should write a project manifest', () => {
      const state = manager.initProject({
        name: 'Test Project',
        description: 'A description',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
        alpha: 0.01,
      });

      expect(state.config.name).toBe('Test Project');
      expect(state.config.description).toBe('A description');
      expect(state.config.alpha).toBe(0.01);
      expect(state.status).toBe('active');
      expect(state.version).toBe(1);
      expect(manager.exists()).toBe(true);
    });

    it('should default alpha to 0.05', () => {
      const state = manager.initProject({
        name: 'Test Project',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
      });
      expect(state.config.alpha).toBe(0.05);
    });

    it('should throw when a project already exists', () => {
      manager.initProject({
        name: 'First',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
      });
      expect(() =>
        manager.initProject({
          name: 'Second',
          jurisdictionId: 'TX-002',
          jurisdictionName: 'Other County',
        })
      ).toThrow(/already exists/);
    });

    it('should apply the disparity-analysis template', () => {
      manager.initProject({
        name: 'Test Project',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
        template: 'disparity-analysis',
      });
      const configPath = path.join(
        manager.getProjectDir(),
        'analysis',
        'disparity_config.json'
      );
      expect(fs.existsSync(configPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(config.outcome).toBe('conviction');
      expect(config.referenceGroup).toBe('White');
    });

    it('should apply the sentencing-analysis template', () => {
      manager.initProject({
        name: 'Test Project',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
        template: 'sentencing-analysis',
      });
      const configPath = path.join(
        manager.getProjectDir(),
        'analysis',
        'sentencing_config.json'
      );
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should not write template files for the blank template', () => {
      manager.initProject({
        name: 'Test Project',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
        template: 'blank',
      });
      expect(fs.existsSync(path.join(manager.getProjectDir(), 'analysis'))).toBe(false);
    });
  });

  describe('loadProject', () => {
    it('should throw when no project exists', () => {
      expect(() => manager.loadProject()).toThrow(/No project found/);
    });

    it('should round-trip the project state', () => {
      manager.initProject({
        name: 'Round Trip',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
      });
      const loaded = manager.loadProject();
      expect(loaded.config.name).toBe('Round Trip');
      expect(loaded.config.jurisdictionId).toBe('TX-001');
    });
  });

  describe('sessions', () => {
    beforeEach(() => {
      manager.initProject({
        name: 'Session Project',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
      });
    });

    it('should start a session with steps', () => {
      const session = manager.startSession({ outcome: 'conviction' }, [
        'normalize',
        'baseline',
        'report',
      ]);
      expect(session.sessionId).toMatch(/^session_/);
      expect(session.steps).toHaveLength(3);
      expect(session.steps[0].status).toBe('pending');
      expect(session.status).toBe('in_progress');
    });

    it('should persist a session to disk', () => {
      const session = manager.startSession({ outcome: 'conviction' }, ['normalize']);
      const sessionPath = path.join(
        manager.getSessionsDir(),
        `${session.sessionId}.json`
      );
      expect(fs.existsSync(sessionPath)).toBe(true);
    });

    it('should save and load a session', () => {
      const session = manager.startSession({ alpha: 0.05 }, ['a', 'b']);
      session.steps[0].status = 'completed';
      session.notes = 'partial progress';
      manager.saveSession(session);

      const loaded = manager.loadSession(session.sessionId);
      expect(loaded.steps[0].status).toBe('completed');
      expect(loaded.notes).toBe('partial progress');
    });

    it('should throw when loading a missing session', () => {
      expect(() => manager.loadSession('session_nonexistent')).toThrow(
        /Session not found/
      );
    });

    it('should resume an interrupted session', () => {
      const session = manager.startSession({}, ['a']);
      session.status = 'abandoned';
      manager.saveSession(session);

      const resumed = manager.resumeSession(session.sessionId);
      expect(resumed.status).toBe('in_progress');
    });

    it('should list sessions newest first', () => {
      const first = manager.startSession({ n: 1 }, ['a']);
      const second = manager.startSession({ n: 2 }, ['b']);
      const sessions = manager.listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.sessionId)).toContain(first.sessionId);
      expect(sessions.map(s => s.sessionId)).toContain(second.sessionId);
    });

    it('should find a resumable session', () => {
      const session = manager.startSession({}, ['a']);
      const resumable = manager.findResumableSession();
      expect(resumable).not.toBeNull();
      expect(resumable!.sessionId).toBe(session.sessionId);
    });

    it('should return null when no session is in progress', () => {
      const session = manager.startSession({}, ['a']);
      session.status = 'completed';
      manager.saveSession(session);
      expect(manager.findResumableSession()).toBeNull();
    });

    it('should count completed steps in the summary', () => {
      const session = manager.startSession({}, ['a', 'b', 'c']);
      session.steps[0].status = 'completed';
      session.steps[1].status = 'completed';
      manager.saveSession(session);

      const summary = manager.listSessions()[0];
      expect(summary.completedSteps).toBe(2);
      expect(summary.totalSteps).toBe(3);
    });
  });

  describe('result versioning', () => {
    beforeEach(() => {
      manager.initProject({
        name: 'Result Project',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
      });
    });

    it('should save a result with version 1', () => {
      const result = manager.saveResult('baseline', { a: 1 }, { gap: 0.1 });
      expect(result.version).toBe(1);
      expect(result.resultId).toMatch(/^result_/);
      expect(result.label).toBe('baseline');
    });

    it('should increment version for the same label', () => {
      manager.saveResult('baseline', { a: 1 });
      const second = manager.saveResult('baseline', { a: 2 });
      expect(second.version).toBe(2);
    });

    it('should track version independently per label', () => {
      manager.saveResult('baseline', {});
      manager.saveResult('baseline', {});
      const other = manager.saveResult('policy-model', {});
      expect(other.version).toBe(1);
    });

    it('should link to the parent result', () => {
      const first = manager.saveResult('baseline', {});
      const second = manager.saveResult('baseline', {});
      expect(second.parentResultId).toBe(first.resultId);
    });

    it('should load a stored result', () => {
      const result = manager.saveResult('baseline', { x: 42 }, { gap: 0.5 });
      const loaded = manager.loadResult(result.resultId);
      expect(loaded.payload).toEqual({ x: 42 });
      expect(loaded.metrics.gap).toBe(0.5);
    });

    it('should throw when loading a missing result', () => {
      expect(() => manager.loadResult('result_nonexistent')).toThrow(
        /Result not found/
      );
    });

    it('should list results', () => {
      manager.saveResult('baseline', {});
      manager.saveResult('policy-model', {});
      expect(manager.listResults()).toHaveLength(2);
    });

    it('should compare two results and report metric deltas', () => {
      const baseline = manager.saveResult('run', {}, { gap: 0.10, rate: 0.60 });
      const candidate = manager.saveResult('run', {}, { gap: 0.15, rate: 0.55 });

      const comparison = manager.compareResults(baseline.resultId, candidate.resultId);
      expect(comparison.metricDeltas).toHaveLength(2);

      const gap = comparison.metricDeltas.find(m => m.metric === 'gap')!;
      expect(gap.baseline).toBeCloseTo(0.10);
      expect(gap.candidate).toBeCloseTo(0.15);
      expect(gap.delta).toBeCloseTo(0.05);
      expect(gap.direction).toBe('increased');

      const rate = comparison.metricDeltas.find(m => m.metric === 'rate')!;
      expect(rate.direction).toBe('decreased');
    });

    it('should report unchanged metrics', () => {
      const baseline = manager.saveResult('run', {}, { gap: 0.10 });
      const candidate = manager.saveResult('run', {}, { gap: 0.10 });
      const comparison = manager.compareResults(baseline.resultId, candidate.resultId);
      expect(comparison.metricDeltas[0].direction).toBe('unchanged');
    });
  });

  describe('setStatus', () => {
    it('should update the project status', () => {
      manager.initProject({
        name: 'Status Project',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
      });
      const state = manager.setStatus('paused');
      expect(state.status).toBe('paused');
      expect(manager.loadProject().status).toBe('paused');
    });
  });

  describe('clock injection', () => {
    it('should use the injected clock for createdAt', () => {
      const fixed = new Date('2024-06-01T00:00:00.000Z');
      const m = new ProjectManager({ rootDir: tmpDir, now: () => fixed });
      const state = m.initProject({
        name: 'Fixed Clock',
        jurisdictionId: 'TX-001',
        jurisdictionName: 'Test County',
      });
      expect(state.config.createdAt).toBe('2024-06-01T00:00:00.000Z');
    });
  });
});
