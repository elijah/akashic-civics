/**
 * CLI Project Manager
 *
 * Provides project initialization, session persistence (save/load/resume),
 * and result versioning for the Akashic Civics analysis workflows.
 *
 * On-disk layout:
 *   <root>/.akashic/
 *     project.json          project manifest
 *     sessions/
 *       <sessionId>.json    saved session state
 *     results/
 *       <resultId>.json     versioned analysis results
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export const PROJECT_DIR_NAME = '.akashic';

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface ProjectConfig {
  name: string;
  description: string;
  jurisdictionId: string;
  jurisdictionName: string;
  template: 'blank' | 'disparity-analysis' | 'sentencing-analysis' | 'trend-monitoring';
  alpha: number;
  createdAt: string;
}

export interface ProjectState {
  config: ProjectConfig;
  status: ProjectStatus;
  version: number;
  sessions: SessionSummary[];
  results: ResultSummary[];
}

export interface SessionStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: string;
  notes?: string;
}

export interface SessionState {
  sessionId: string;
  projectName: string;
  startedAt: string;
  updatedAt: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  steps: SessionStep[];
  analysisConfig: Record<string, unknown>;
  dataSource?: string;
  resultIds: string[];
  notes: string;
}

export interface SessionSummary {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  status: SessionState['status'];
  completedSteps: number;
  totalSteps: number;
}

export interface VersionedResult {
  resultId: string;
  projectName: string;
  version: number;
  createdAt: string;
  label: string;
  parentResultId?: string;
  payload: Record<string, unknown>;
  metrics: Record<string, number>;
  notes: string;
}

export interface ResultSummary {
  resultId: string;
  version: number;
  createdAt: string;
  label: string;
}

export interface InitOptions {
  name: string;
  description?: string;
  jurisdictionId: string;
  jurisdictionName: string;
  template?: ProjectConfig['template'];
  alpha?: number;
  rootDir?: string;
}

export interface ProjectManagerOptions {
  rootDir: string;
  /** Optional clock injection for deterministic tests. */
  now?: () => Date;
}

export class ProjectManager {
  private rootDir: string;
  private projectDir: string;
  private now: () => Date;

  constructor(options: ProjectManagerOptions) {
    this.rootDir = path.resolve(options.rootDir);
    this.projectDir = path.join(this.rootDir, PROJECT_DIR_NAME);
    this.now = options.now ?? (() => new Date());
  }

  /** Absolute path to the .akashic directory. */
  getProjectDir(): string {
    return this.projectDir;
  }

  /** Absolute path to the sessions directory. */
  getSessionsDir(): string {
    return path.join(this.projectDir, 'sessions');
  }

  /** Absolute path to the results directory. */
  getResultsDir(): string {
    return path.join(this.projectDir, 'results');
  }

  /** True when the directory contains an initialized project. */
  exists(): boolean {
    return fs.existsSync(path.join(this.projectDir, 'project.json'));
  }

  /**
   * Initialize a new project, creating the directory structure and manifest.
   * Throws if a project already exists in the target root.
   */
  initProject(options: InitOptions): ProjectState {
    if (this.exists()) {
      throw new Error(`A project already exists at ${this.projectDir}`);
    }

    const template = options.template ?? 'blank';

    fs.mkdirSync(this.getSessionsDir(), { recursive: true });
    fs.mkdirSync(this.getResultsDir(), { recursive: true });
    fs.mkdirSync(path.join(this.projectDir, 'data'), { recursive: true });
    fs.mkdirSync(path.join(this.projectDir, 'output'), { recursive: true });

    const config: ProjectConfig = {
      name: options.name,
      description: options.description ?? '',
      jurisdictionId: options.jurisdictionId,
      jurisdictionName: options.jurisdictionName,
      template,
      alpha: options.alpha ?? 0.05,
      createdAt: this.now().toISOString(),
    };

    const state: ProjectState = {
      config,
      status: 'active',
      version: 1,
      sessions: [],
      results: [],
    };

    this.writeProjectState(state);
    this.applyTemplate(template);

    return state;
  }

  /** Read the project manifest. Throws if the project is not initialized. */
  loadProject(): ProjectState {
    const manifestPath = path.join(this.projectDir, 'project.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`No project found at ${this.projectDir}. Run "akashic init" first.`);
    }
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ProjectState;
  }

  /** Update the project manifest. */
  writeProjectState(state: ProjectState): void {
    fs.mkdirSync(this.projectDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.projectDir, 'project.json'),
      JSON.stringify(state, null, 2),
      'utf8'
    );
  }

  /** Create a new session with the given step list. */
  startSession(
    analysisConfig: Record<string, unknown>,
    steps: string[] = [],
    dataSource?: string
  ): SessionState {
    const project = this.loadProject();
    const sessionId = this.generateId('session', JSON.stringify({ ...analysisConfig, dataSource, n: project.sessions.length }));

    const session: SessionState = {
      sessionId,
      projectName: project.config.name,
      startedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
      status: 'in_progress',
      steps: steps.map(name => ({ name, status: 'pending' })),
      analysisConfig,
      dataSource,
      resultIds: [],
      notes: '',
    };

    this.saveSession(session);
    return session;
  }

  /** Persist a session to disk and refresh the project manifest summary. */
  saveSession(session: SessionState): SessionState {
    session.updatedAt = this.now().toISOString();
    fs.mkdirSync(this.getSessionsDir(), { recursive: true });
    fs.writeFileSync(
      path.join(this.getSessionsDir(), `${session.sessionId}.json`),
      JSON.stringify(session, null, 2),
      'utf8'
    );
    this.refreshManifest();
    return session;
  }

  /** Load a session by id. */
  loadSession(sessionId: string): SessionState {
    const sessionPath = path.join(this.getSessionsDir(), `${sessionId}.json`);
    if (!fs.existsSync(sessionPath)) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as SessionState;
  }

  /**
   * Load a session and mark it in-progress again. Supports resuming
   * interrupted analysis runs.
   */
  resumeSession(sessionId: string): SessionState {
    const session = this.loadSession(sessionId);
    session.status = 'in_progress';
    return this.saveSession(session);
  }

  /** List all sessions for the project, newest first. */
  listSessions(): SessionSummary[] {
    if (!this.exists()) {
      return [];
    }
    const dir = this.getSessionsDir();
    if (!fs.existsSync(dir)) {
      return [];
    }
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const session = JSON.parse(
          fs.readFileSync(path.join(dir, f), 'utf8')
        ) as SessionState;
        return this.summarizeSession(session);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Find the most recently updated in-progress session, if any. */
  findResumableSession(): SessionSummary | null {
    const inProgress = this.listSessions().filter(s => s.status === 'in_progress');
    return inProgress.length > 0 ? inProgress[0] : null;
  }

  /**
   * Store a new version of an analysis result. Versions increment per
   * label within a project, and each entry records its parent for lineage.
   */
  saveResult(
    label: string,
    payload: Record<string, unknown>,
    metrics: Record<string, number> = {},
    notes: string = '',
    parentResultId?: string
  ): VersionedResult {
    const project = this.loadProject();
    const siblings = project.results.filter(r => r.label === label);
    const version = siblings.length + 1;
    const resultId = this.generateId('result', `${project.config.name}:${label}:${version}`);

    const result: VersionedResult = {
      resultId,
      projectName: project.config.name,
      version,
      createdAt: this.now().toISOString(),
      label,
      parentResultId: parentResultId ?? siblings[siblings.length - 1]?.resultId,
      payload,
      metrics,
      notes,
    };

    fs.mkdirSync(this.getResultsDir(), { recursive: true });
    fs.writeFileSync(
      path.join(this.getResultsDir(), `${resultId}.json`),
      JSON.stringify(result, null, 2),
      'utf8'
    );
    this.refreshManifest();
    return result;
  }

  /** Load a stored result by id. */
  loadResult(resultId: string): VersionedResult {
    const resultPath = path.join(this.getResultsDir(), `${resultId}.json`);
    if (!fs.existsSync(resultPath)) {
      throw new Error(`Result not found: ${resultId}`);
    }
    return JSON.parse(fs.readFileSync(resultPath, 'utf8')) as VersionedResult;
  }

  /** List all stored results, newest first. */
  listResults(): ResultSummary[] {
    if (!this.exists()) {
      return [];
    }
    const dir = this.getResultsDir();
    if (!fs.existsSync(dir)) {
      return [];
    }
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const result = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as VersionedResult;
        return {
          resultId: result.resultId,
          version: result.version,
          createdAt: result.createdAt,
          label: result.label,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Compare two stored results on their shared numeric metrics.
   * Returns the deltas plus the direction of change for each metric.
   */
  compareResults(
    baselineResultId: string,
    candidateResultId: string
  ): {
    baseline: ResultSummary;
    candidate: ResultSummary;
    metricDeltas: Array<{
      metric: string;
      baseline: number;
      candidate: number;
      delta: number;
      direction: 'increased' | 'decreased' | 'unchanged';
    }>;
  } {
    const baseline = this.loadResult(baselineResultId);
    const candidate = this.loadResult(candidateResultId);

    const metricNames = Array.from(
      new Set([...Object.keys(baseline.metrics), ...Object.keys(candidate.metrics)])
    ).sort();

    const metricDeltas = metricNames.map(metric => {
      const b = baseline.metrics[metric] ?? 0;
      const c = candidate.metrics[metric] ?? 0;
      const delta = c - b;
      const direction: 'increased' | 'decreased' | 'unchanged' =
        delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'unchanged';
      return {
        metric,
        baseline: b,
        candidate: c,
        delta,
        direction,
      };
    });

    return {
      baseline: {
        resultId: baseline.resultId,
        version: baseline.version,
        createdAt: baseline.createdAt,
        label: baseline.label,
      },
      candidate: {
        resultId: candidate.resultId,
        version: candidate.version,
        createdAt: candidate.createdAt,
        label: candidate.label,
      },
      metricDeltas,
    };
  }

  /** Set the project status. */
  setStatus(status: ProjectStatus): ProjectState {
    const project = this.loadProject();
    project.status = status;
    this.writeProjectState(project);
    return project;
  }

  /** Recompute session/result summaries in the manifest. */
  private refreshManifest(): void {
    const project = this.loadProject();
    project.sessions = this.listSessions();
    project.results = this.listResults();
    project.version = project.version + 1;
    this.writeProjectState(project);
  }

  private summarizeSession(session: SessionState): SessionSummary {
    return {
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      status: session.status,
      completedSteps: session.steps.filter(s => s.status === 'completed').length,
      totalSteps: session.steps.length,
    };
  }

  /** Write template-specific starter files into the project. */
  private applyTemplate(template: ProjectConfig['template']): void {
    const templates: Record<ProjectConfig['template'], { path: string; content: string }[]> = {
      blank: [],
      'disparity-analysis': [
        {
          path: 'analysis/disparity_config.json',
          content: JSON.stringify(
            {
              outcome: 'conviction',
              primaryGroup: 'race_ethnicity',
              referenceGroup: 'White',
              controlVariables: ['offense_severity', 'prior_record'],
              alpha: 0.05,
            },
            null,
            2
          ),
        },
      ],
      'sentencing-analysis': [
        {
          path: 'analysis/sentencing_config.json',
          content: JSON.stringify(
            {
              outcome: 'sentence_months',
              primaryGroup: 'race_ethnicity',
              referenceGroup: 'White',
              controlVariables: ['offense_severity', 'prior_record', 'count'],
              alpha: 0.05,
            },
            null,
            2
          ),
        },
      ],
      'trend-monitoring': [
        {
          path: 'analysis/trend_config.json',
          content: JSON.stringify(
            {
              metric: 'conviction_rate',
              interval: 'year',
              baselinePeriod: '2019',
              comparisonPeriod: '2023',
              alpha: 0.05,
            },
            null,
            2
          ),
        },
      ],
    };

    for (const file of templates[template]) {
      const full = path.join(this.projectDir, file.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, file.content, 'utf8');
    }
  }

  /** Deterministic id derived from a namespace and seed. */
  private generateId(namespace: string, seed: string): string {
    const hash = createHash('sha256').update(`${namespace}:${seed}`).digest('hex');
    return `${namespace}_${hash.slice(0, 12)}`;
  }
}

/** Convenience factory used by the CLI entry point. */
export function createProjectManager(rootDir: string, now?: () => Date): ProjectManager {
  return new ProjectManager({ rootDir, now });
}
