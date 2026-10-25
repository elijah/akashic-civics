/**
 * Interactive Tutorial System
 *
 * Provides step-by-step guided tutorials, automated exercises,
 * and an in-browser analysis playground for the Akashic Civics platform.
 */

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  code?: string;
  expectedOutput?: any;
  hints?: string[];
  validation?: (output: any) => boolean;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  prerequisites: string[];
  steps: TutorialStep[];
  tags: string[];
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  tutorialId: string;
  stepId: string;
  starterCode: string;
  solutionCode: string;
  tests: string[];
  maxAttempts: number;
}

export interface TutorialProgress {
  tutorialId: string;
  completedSteps: string[];
  currentStepIndex: number;
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  exerciseAttempts: Map<string, number>;
}

export interface PlaygroundState {
  code: string;
  output: any;
  isRunning: boolean;
  error?: string;
}

/** Built-in tutorials for common workflows */
export const TUTORIALS: Tutorial[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Akashic Civics',
    description: 'Learn the basics of loading data, running analyses, and interpreting results',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    prerequisites: [],
    tags: ['intro', 'basics'],
    steps: [
      {
        id: 'load-data',
        title: 'Load Your Dataset',
        description: 'Load a case-level dataset from JSONL or CSV format',
        code: `import { DataNormalizer } from 'akashic-civics/normalization';

const normalizer = new DataNormalizer();
const cases = await normalizer.loadFromJSONL('./data/cases.jsonl');
console.log(\`Loaded \${cases.length} cases\`);`,
        hints: [
          'Ensure your JSONL file has one case per line',
          'Each case should have conviction, race_ethnicity, and offense_severity fields'
        ],
        validation: (output) => output && output.includes('Loaded')
      },
      {
        id: 'descriptive-stats',
        title: 'Compute Descriptive Statistics',
        description: 'Calculate conviction rates, sentence lengths, and demographic distributions',
        code: `import { computeDescriptiveStatistics } from 'akashic-civics/statistical';

const stats = computeDescriptiveStatistics(cases);
console.log(\`Conviction Rate: \${(stats.conviction_rate * 100).toFixed(1)}%\`);
console.log(\`Avg Sentence: \${stats.avg_sentence_months.toFixed(1)} months\`);
console.log(\`Demographic Distribution:\`, stats.demographic_distribution);`,
        hints: [
          'The conviction_rate is a proportion (0-1)',
          'demographic_distribution shows the proportion of cases by race/ethnicity'
        ],
        validation: (output) => output && output.includes('Conviction Rate')
      },
      {
        id: 'disconfirmation-test',
        title: 'Run Disconfirmation Tests',
        description: 'Test your findings against multiple alternative explanations',
        code: `import { AdaptiveDisconfirmation } from 'akashic-civics/statistical';

const disconfirmation = new AdaptiveDisconfirmation();
const results = await disconfirmation.runAllTests(cases, {
  outcomeType: 'binary',
  sampleSize: cases.length
});
console.log(\`Overall Score: \${results.aggregatedScore}\`);
console.log(\`Tests Passed: \${results.passed.length}/\${results.total.length}\`);`,
        hints: [
          'The adaptive system selects appropriate tests based on your data',
          'A score above 0.7 indicates robust findings'
        ],
        validation: (output) => output && output.includes('Overall Score')
      }
    ]
  },
  {
    id: 'disparity-analysis',
    title: 'Racial Disparity Analysis',
    description: 'Comprehensive analysis of racial disparities in sentencing outcomes',
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    prerequisites: ['getting-started'],
    tags: ['disparity', 'race', 'sentencing'],
    steps: [
      {
        id: 'baseline-comparison',
        title: 'Create Historical Baseline',
        description: 'Establish a historical baseline for comparison',
        code: `import { HistoricalBaseline } from 'akashic-civics/statistical';

const baseline = new HistoricalBaseline();
const baselineResult = await baseline.createBaseline(cases, {
  jurisdictionId: 'TX-001',
  timeWindow: '5y',
  minimumCases: 100
});
console.log(\`Baseline conviction rate: \${baselineResult.convictionRate}\`);`,
        hints: [
          'Choose a time window appropriate for your data volume',
          'minimumCases ensures statistical reliability'
        ],
        validation: (output) => output && output.includes('Baseline conviction rate')
      },
      {
        id: 'peer-comparison',
        title: 'Peer Jurisdiction Comparison',
        description: 'Compare your jurisdiction against similar peers',
        code: `import { PeerComparison } from 'akashic-civics/accountability';

const peerComp = new PeerComparison();
const comparison = await peerComp.compareJurisdiction('TX-001', {
  demographicMatch: true,
  caseMixAdjust: true,
  propensityScoreMatch: true
});
console.log(\`Peer percentile: \${comparison.percentile}\`);
console.log(\`Disparity vs peers: \${comparison.disparityScore}\`);`,
        hints: [
          'demographicMatch ensures fair comparisons',
          'propensityScoreMatch controls for case mix differences'
        ],
        validation: (output) => output && output.includes('Peer percentile')
      }
    ]
  },
  {
    id: 'advanced-statistics',
    title: 'Advanced Statistical Modeling',
    description: 'Logistic regression, survival analysis, and causal inference',
    difficulty: 'advanced',
    estimatedMinutes: 45,
    prerequisites: ['getting-started', 'disparity-analysis'],
    tags: ['regression', 'survival', 'causal'],
    steps: [
      {
        id: 'logistic-regression',
        title: 'Logistic Regression for Conviction Prediction',
        description: 'Model conviction probability as a function of defendant and case characteristics',
        code: `import { runOLSRegression } from 'akashic-civics/statistical';

const regression = runOLSRegression(cases, [
  'race_ethnicity',
  'offense_severity',
  'prior_convictions'
]);
console.log('Coefficients:', regression.coefficients);
console.log('R-squared:', regression.r_squared.toFixed(3));`,
        hints: [
          'Interpret coefficients as log-odds changes',
          'Check R-squared for model fit'
        ],
        validation: (output) => output && output.includes('Coefficients')
      },
      {
        id: 'survival-analysis',
        title: 'Time-to-Disposition Survival Analysis',
        description: 'Analyze time-to-disposition using Kaplan-Meier and Cox models',
        code: `import { SurvivalAnalysis } from 'akashic-civics/statistical';

const survival = new SurvivalAnalysis();
const km = survival.kaplanMeier(cases.map(c => ({
  time: c.days_to_disposition,
  event: c.conviction === 1
})));
console.log('Median survival time:', km.median);`,
        hints: [
          'Time variable should be days_to_disposition',
          'Event indicates case resolution'
        ],
        validation: (output) => output && output.includes('Median survival time')
      }
    ]
  }
];

/** Built-in exercises for hands-on practice */
export const EXERCISES: Exercise[] = [
  {
    id: 'ex-load-data',
    title: 'Load and Inspect Data',
    description: 'Load a dataset and compute basic statistics',
    tutorialId: 'getting-started',
    stepId: 'load-data',
    starterCode: `// TODO: Load cases from ./data/sample.jsonl
// TODO: Print the number of cases`,
    solutionCode: `import { DataNormalizer } from 'akashic-civics/normalization';

const normalizer = new DataNormalizer();
const cases = await normalizer.loadFromJSONL('./data/sample.jsonl');
console.log(\`Loaded \${cases.length} cases\`);`,
    tests: ['cases.length > 0'],
    maxAttempts: 3
  },
  {
    id: 'ex-conviction-rate',
    title: 'Compute Conviction Rate by Race',
    description: 'Calculate and compare conviction rates across racial groups',
    tutorialId: 'getting-started',
    stepId: 'descriptive-stats',
    starterCode: `// TODO: Compute descriptive statistics
// TODO: Print conviction rate for each racial group`,
    solutionCode: `import { computeDescriptiveStatistics } from 'akashic-civics/statistical';

const stats = computeDescriptiveStatistics(cases);
console.log(\`Overall: \${(stats.conviction_rate * 100).toFixed(1)}%\`);
// Group by race
const byRace = cases.reduce((acc, c) => {
  if (!acc[c.race_ethnicity]) acc[c.race_ethnicity] = { total: 0, convicted: 0 };
  acc[c.race_ethnicity].total++;
  if (c.conviction === 1) acc[c.race_ethnicity].convicted++;
  return acc;
}, {} as Record<string, { total: number; convicted: number }>);
for (const [race, data] of Object.entries(byRace)) {
  console.log(\`\${race}: \${(data.convicted / data.total * 100).toFixed(1)}%\`);
}`,
    tests: ['Object.keys(byRace).length >= 2'],
    maxAttempts: 3
  }
];

/** Tutorial player class for running tutorials */
export class TutorialPlayer {
  private tutorials: Map<string, Tutorial> = new Map();
  private exercises: Map<string, Exercise> = new Map();
  private progress: Map<string, TutorialProgress> = new Map();

  constructor(customTutorials: Tutorial[] = [], customExercises: Exercise[] = []) {
    for (const t of [...TUTORIALS, ...customTutorials]) {
      this.tutorials.set(t.id, t);
    }
    for (const e of [...EXERCISES, ...customExercises]) {
      this.exercises.set(e.id, e);
    }
  }

  /** Get all available tutorials */
  getTutorials(): Tutorial[] {
    return Array.from(this.tutorials.values());
  }

  /** Get a specific tutorial */
  getTutorial(id: string): Tutorial | undefined {
    return this.tutorials.get(id);
  }

  /** Get exercises for a tutorial */
  getExercises(tutorialId: string): Exercise[] {
    return Array.from(this.exercises.values()).filter(e => e.tutorialId === tutorialId);
  }

  /** Start a tutorial */
  startTutorial(tutorialId: string): TutorialProgress {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      throw new Error(`Tutorial not found: ${tutorialId}`);
    }

    const progress: TutorialProgress = {
      tutorialId,
      completedSteps: [],
      currentStepIndex: 0,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      exerciseAttempts: new Map()
    };

    this.progress.set(tutorialId, progress);
    return progress;
  }

  /** Get current progress */
  getProgress(tutorialId: string): TutorialProgress | undefined {
    return this.progress.get(tutorialId);
  }

  /** Complete a step */
  completeStep(tutorialId: string, stepId: string): boolean {
    const progress = this.progress.get(tutorialId);
    if (!progress) return false;

    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) return false;

    const step = tutorial.steps.find(s => s.id === stepId);
    if (!step) return false;

    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);
      progress.currentStepIndex = Math.max(
        progress.currentStepIndex,
        tutorial.steps.findIndex(s => s.id === stepId) + 1
      );
      progress.lastAccessedAt = new Date();

      if (progress.completedSteps.length === tutorial.steps.length) {
        progress.completedAt = new Date();
      }
    }

    this.progress.set(tutorialId, progress);
    return true;
  }

  /** Get current step */
  getCurrentStep(tutorialId: string): TutorialStep | undefined {
    const progress = this.progress.get(tutorialId);
    const tutorial = this.tutorials.get(tutorialId);
    if (!progress || !tutorial) return undefined;

    return tutorial.steps[progress.currentStepIndex];
  }

  /** Attempt an exercise */
  attemptExercise(exerciseId: string, userCode: string): { passed: boolean; feedback: string } {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) {
      return { passed: false, feedback: 'Exercise not found' };
    }

    const progress = this.progress.get(exercise.tutorialId);
    if (!progress) {
      return { passed: false, feedback: 'Tutorial not started' };
    }

    const attempts = (progress.exerciseAttempts.get(exerciseId) || 0) + 1;
    progress.exerciseAttempts.set(exerciseId, attempts);

    if (attempts > exercise.maxAttempts) {
      return { passed: false, feedback: 'Max attempts exceeded' };
    }

    const passed = userCode.length > 10;

    return {
      passed,
      feedback: passed ? 'Great job! Exercise passed.' : `Attempt ${attempts}/${exercise.maxAttempts}. Keep trying!`
    };
  }

  /** Reset tutorial progress */
  resetTutorial(tutorialId: string): void {
    this.progress.delete(tutorialId);
  }

  /** Export progress for persistence */
  exportProgress(): Record<string, TutorialProgress> {
    const obj: Record<string, TutorialProgress> = {};
    for (const [id, progress] of this.progress) {
      obj[id] = {
        ...progress,
        exerciseAttempts: Object.fromEntries(progress.exerciseAttempts)
      } as any;
    }
    return obj;
  }

  /** Import progress from persistence */
  importProgress(data: Record<string, any>): void {
    for (const [id, progress] of Object.entries(data)) {
      this.progress.set(id, {
        ...progress,
        startedAt: new Date(progress.startedAt),
        lastAccessedAt: new Date(progress.lastAccessedAt),
        completedAt: progress.completedAt ? new Date(progress.completedAt) : undefined,
        exerciseAttempts: new Map(Object.entries(progress.exerciseAttempts))
      });
    }
  }
}

/** Create a tutorial player with default tutorials */
export function createTutorialPlayer(
  customTutorials: Tutorial[] = [],
  customExercises: Exercise[] = []
): TutorialPlayer {
  return new TutorialPlayer(customTutorials, customExercises);
}