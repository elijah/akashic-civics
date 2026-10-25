/**
 * Interactive CLI
 *
 * Wizard-style guided analysis setup with readline prompts and progress
 * monitoring. Provides interactive result interpretation and format selection.
 *
 * Usage:
 *   const cli = InteractiveCLI.create();
 *   const result = await cli.runWizard(initialConfig);
 */

import * as readline from 'readline';
import { ProjectManager } from './project_manager';
import { ExportFormatters, ExportFormat, ExportResult } from './export_formatters';

export interface WizardStep {
  name: string;
  prompt: string;
  validate?: (input: string) => boolean | string;
  defaultValue?: string;
}

export interface WizardResult {
  success: boolean;
  values: Record<string, unknown>;
  remainingSteps: string[];
  error?: string;
}

export interface InterpreterOptions {
  showProgress: boolean;
  format?: ExportFormat;
}

/**
 * Wizard-driven analysis setup using Node's readline interface.
 * Prompts the user sequentially through configurable steps and returns
 * the collected values as a Record. Also supports progress monitoring
 * during analysis execution.
 */
export class InteractiveCLI {
  private rl: readline.Interface;
  private prompts: WizardStep[];
  private currentStep: number;
  private answers: Record<string, string>;
  private exportFormatters: ExportFormatters;

  private constructor(
    prompts: WizardStep[],
    exportFormatters: ExportFormatters
  ) {
    this.prompts = prompts;
    this.currentStep = 0;
    this.answers = {};
    this.exportFormatters = exportFormatters;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /** Create an InteractiveCLI with the given prompt sequence and formatters. */
  static create(
    prompts: WizardStep[],
    exportFormatters: ExportFormatters
  ): InteractiveCLI {
    return new InteractiveCLI(prompts, exportFormatters);
  }

  /** Start the interactive wizard and collect all answers. */
  async runWizard(initialAnswers?: Record<string, unknown>): Promise<WizardResult> {
    this.answers = { ...initialAnswers } as Record<string, string>;

    while (this.currentStep < this.prompts.length) {
      const step = this.prompts[this.currentStep];
      try {
        const answer = await this.promptStep(step);
        if (answer === null) {
          // User pressed Ctrl+C
          return {
            success: false,
            values: {},
            remainingSteps: this.prompts
              .slice(this.currentStep)
              .map(s => s.name),
          };
        }
        this.answers[step.name] = answer;

        // Apply default after storing, in case step logic needs it
        if (step.defaultValue !== undefined && answer === '') {
          this.answers[step.name] = step.defaultValue;
        }
      } catch (e) {
        return {
          success: false,
          values: this.answers,
          remainingSteps: this.prompts
            .slice(this.currentStep)
            .map(s => s.name),
          error: e instanceof Error ? e.message : String(e),
        };
      }
      this.currentStep++;
    }

    return {
      success: true,
      values: this.answers,
      remainingSteps: [],
    };
  }

  /** Single prompt with validation. */
  private async promptStep(step: WizardStep): Promise<string> {
    const { prompt: text, validate, defaultValue } = step;
    const defaultStr = defaultValue !== undefined ? ` [${defaultValue}]` : '';
    const question = `${text}${defaultStr}: `;

    return new Promise(resolve => {
      const ask = () => {
        this.rl.question(question, input => {
          if (input.trim() === '' && defaultValue !== undefined) {
            resolve(defaultValue);
          } else if (validate) {
            const result = validate(input);
            if (result === true) {
              resolve(input);
            } else {
              console.log(result || 'Invalid input. Please try again.');
              ask(); // retry
            }
          } else {
            resolve(input);
          }
        });
      };
      ask();
    });
  }

  /** Mark a step as complete (for progress monitoring). */
  markComplete(): void {
    // No-op base implementation; subclasses or extensions can hook into this
    // to update a progress indicator or emit events.
  }

  /** Interpret analysis results interactively, supporting format selection. */
  async interpretResults(
    results: Record<string, unknown>,
    options: InterpreterOptions = { showProgress: true, format: 'markdown' }
  ): Promise<ExportResult> {
    // `results.template` selects the audience (simplified/technical/policy);
    // `options.format` selects the serialization format. They are orthogonal.
    const template = this.audienceTemplate(results);
    const format = options.format ?? 'markdown';

    const baseRender = this.exportFormatters.exportReport(results, {
      format,
      template,
    });

    if (options.showProgress) {
      console.log('\n--- Interpretation Summary ---');
      console.log(`Template: ${template}`);
      console.log(`Format: ${this.formatToLabel(format)}`);
    }

    // Ask whether user wants a different format
    if (options.showProgress) {
      const tryOther = await this.askYN('\nTry a different format? (y/n): ');
      if (tryOther) {
        const otherFormat = await this.askFormatSelection();
        if (otherFormat) {
          return this.exportFormatters.exportReport(results, {
            format: otherFormat,
            template,
          });
        }
      }
    }

    return baseRender;
  }

  /** Resolve the audience template carried on a results payload. */
  private audienceTemplate(
    results: Record<string, unknown>
  ): 'simplified' | 'technical' | 'policy' {
    const t = results.template;
    if (t === 'simplified' || t === 'policy' || t === 'technical') {
      return t;
    }
    return 'technical';
  }

  /** Prompt the user to select a format from the supported list. */
  private async askFormatSelection(): Promise<ExportFormat> {
    console.log('\nAvailable formats:');
    console.log('  1. Markdown');
    console.log('  2. HTML');
    console.log('  3. JSON');
    console.log('  4. CSV');
    const choice = await this.askNumber(1, 4);
    const map: Record<number, ExportFormat> = {
      1: 'markdown',
      2: 'html',
      3: 'json',
      4: 'csv',
    };
    return map[choice] ?? 'markdown';
  }

  /** Ask a yes/no question. */
  private askYN(question: string): Promise<boolean> {
    return new Promise(resolve => {
      this.rl.question(`${question} `, input => {
        resolve(/^y(es)?$/i.test(input.trim()));
      });
    });
  }

  /** Ask a numeric choice within a range (retries on invalid input). */
  private askNumber(min: number, max: number): Promise<number> {
    const askAgain = (): Promise<number> => {
      return new Promise(resolve => {
        this.rl.question(`Select (${min}-${max}): `, input => {
          const n = Number(input);
          if (Number.isNaN(n) || n < min || n > max) {
            console.log(`Please enter a number between ${min} and ${max}`);
            resolve(askAgain());
          } else {
            resolve(n);
          }
        });
      });
    };
    return askAgain();
  }

  /** Close the readline interface after the wizard completes. */
  close(): void {
    this.rl.close();
  }

  /** Map a format key to a human-readable label. */
  private formatToLabel(format: ExportFormat): string {
    const map: Record<ExportFormat, string> = {
      markdown: 'Markdown',
      html: 'HTML',
      json: 'JSON',
      csv: 'CSV',
      txt: 'Plain Text',
      auto: 'Auto',
    };
    return map[format] ?? format;
  }
}

/**
 * Convenience factory tied to a ProjectManager + default ExportFormatters.
 * The project manager is retained for callers that need to persist sessions
 * discovered during the wizard.
 */
export function createInteractiveCLI(
  projectManager: ProjectManager,
  exportFormatters: ExportFormatters
): InteractiveCLI {
  void projectManager;
  return InteractiveCLI.create([], exportFormatters);
}

/** CLI-friendly shorthand: ask for the most common wizard fields. */
export async function promptWizardFields(
  fields: Array<{ name: string; prompt: string; defaultValue?: string; validate?: (input: string) => boolean | string }>
): Promise<Record<string, unknown>> {
  const prompts: WizardStep[] = fields.map(f => ({
    name: f.name,
    prompt: f.prompt,
    validate: f.validate,
    defaultValue: f.defaultValue,
  }));

  const ef = new ExportFormatters();
  const cli = InteractiveCLI.create(prompts, ef);
  const result = await cli.runWizard();

  if (!result.success) {
    return {};
  }
  return result.values as Record<string, unknown>;
}

/** Ask the user whether they want to save the current session. */
export async function askSaveSession(): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Save session? (y/n): ', input => {
      rl.close();
      resolve(/^y(es)?$/i.test(input.trim()));
    });
  });
}

/** Ask for a project name. */
export async function promptProjectName(existing?: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(
      `Project name (${existing || 'new'}): `,
      input => {
        rl.close();
        resolve(input.trim() || existing || 'MyProject');
      }
    );
  });
}