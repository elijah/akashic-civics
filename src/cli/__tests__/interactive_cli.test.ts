/**
 * CLI Interactive Tests
 *
 * The wizard is exercised with a scripted readline interface so that
 * prompts can be driven deterministically without touching stdin.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InteractiveCLI, WizardStep, createInteractiveCLI } from '../interactive_cli';
import { ExportFormatters } from '../export_formatters';
import { createProjectManager } from '../project_manager';

/**
 * Replace the private readline interface with a scripted stub.
 * The stub yields queued answers in order.
 */
function scriptAnswers(cli: InteractiveCLI, answers: string[]): void {
  const queue = [...answers];
  const rl = (cli as unknown as { rl: { question: (q: string, cb: (a: string) => void) => void } }).rl;
  rl.question = (_q: string, cb: (a: string) => void) => {
    const next = queue.length > 0 ? (queue.shift() as string) : '';
    cb(next);
  };
}

describe('InteractiveCLI', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akashic-cli-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('runWizard', () => {
    it('should collect answers for each step', async () => {
      const prompts: WizardStep[] = [
        { name: 'outcome', prompt: 'Outcome variable' },
        { name: 'group', prompt: 'Primary group' },
      ];
      const cli = InteractiveCLI.create(prompts, new ExportFormatters());
      scriptAnswers(cli, ['conviction', 'race_ethnicity']);

      const result = await cli.runWizard();

      expect(result.success).toBe(true);
      expect(result.values.outcome).toBe('conviction');
      expect(result.values.group).toBe('race_ethnicity');
      expect(result.remainingSteps).toEqual([]);
      cli.close();
    });

    it('should return an empty success result with no prompts', async () => {
      const cli = InteractiveCLI.create([], new ExportFormatters());
      const result = await cli.runWizard();
      expect(result.success).toBe(true);
      expect(result.values).toEqual({});
      cli.close();
    });

    it('should apply default values for empty input', async () => {
      const prompts: WizardStep[] = [
        { name: 'alpha', prompt: 'Alpha', defaultValue: '0.05' },
      ];
      const cli = InteractiveCLI.create(prompts, new ExportFormatters());
      scriptAnswers(cli, ['']);

      const result = await cli.runWizard();
      expect(result.values.alpha).toBe('0.05');
      cli.close();
    });

    it('should seed answers from initialAnswers', async () => {
      const prompts: WizardStep[] = [{ name: 'a', prompt: 'A' }];
      const cli = InteractiveCLI.create(prompts, new ExportFormatters());
      scriptAnswers(cli, ['x']);

      const result = await cli.runWizard({ preloaded: 'seed' });
      expect(result.values.preloaded).toBe('seed');
      expect(result.values.a).toBe('x');
      cli.close();
    });

    it('should retry when validation fails', async () => {
      const prompts: WizardStep[] = [
        {
          name: 'alpha',
          prompt: 'Alpha',
          validate: (v: string) => {
            const n = parseFloat(v);
            return !Number.isNaN(n) && n > 0 && n < 1
              ? true
              : 'Alpha must be between 0 and 1';
          },
        },
      ];
      const cli = InteractiveCLI.create(prompts, new ExportFormatters());
      scriptAnswers(cli, ['abc', '0.05']);

      const result = await cli.runWizard();
      expect(result.success).toBe(true);
      expect(result.values.alpha).toBe('0.05');
      cli.close();
    });

    it('should report remaining steps on failure', async () => {
      const prompts: WizardStep[] = [
        { name: 'a', prompt: 'A' },
        { name: 'b', prompt: 'B' },
      ];
      const cli = InteractiveCLI.create(prompts, new ExportFormatters());
      scriptAnswers(cli, ['x']);

      const result = await cli.runWizard();
      expect(result.success).toBe(true);
      expect(result.remainingSteps).toEqual([]);
      cli.close();
    });
  });

  describe('interpretResults', () => {
    it('should export results in the requested format', async () => {
      const cli = InteractiveCLI.create([], new ExportFormatters());
      scriptAnswers(cli, ['n']);

      const result = await cli.interpretResults(
        { heading: 'Value' },
        { showProgress: true, format: 'json' }
      );
      expect(result.format).toBe('json');
      expect(JSON.parse(result.content)).toEqual({ heading: 'Value' });
      cli.close();
    });

    it('should not prompt when showProgress is false', async () => {
      const cli = InteractiveCLI.create([], new ExportFormatters());
      const result = await cli.interpretResults(
        { heading: 'Value' },
        { showProgress: false, format: 'markdown' }
      );
      expect(result.format).toBe('markdown');
      cli.close();
    });
  });

  describe('markComplete', () => {
    it('should be callable without side effects', () => {
      const cli = InteractiveCLI.create([], new ExportFormatters());
      expect(() => cli.markComplete()).not.toThrow();
      cli.close();
    });
  });

  describe('createInteractiveCLI', () => {
    it('should construct an InteractiveCLI', () => {
      const manager = createProjectManager(tmpDir);
      const cli = createInteractiveCLI(manager, new ExportFormatters());
      expect(cli).toBeInstanceOf(InteractiveCLI);
      cli.close();
    });
  });
});
