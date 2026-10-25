/**
 * Akashic Civics CLI Entry Point
 *
 * Provides the `akashic` command with subcommands for project management,
 * session handling, result versioning, and multi-format report export.
 *
 * Usage:
 *   akashic init --name my-project --jurisdiction-id TX-001
 *   akashic status
 *   akashic session list
 *   akashic results list
 *   akashic export --format markdown --input report.json --output out.md
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createProjectManager } from './project_manager';
import { ExportFormat, createExportFormatters } from './export_formatters';

export interface CliOptions {
  root: string;
  verbose: boolean;
}

export interface CommandRunner {
  /** Run a CLI command with the given argument vector. Returns process exit code. */
  run(argv: string[]): Promise<number>;
}

export class AkashicCli implements CommandRunner {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.program
      .name('akashic')
      .description(
        'Akashic Civics - methodologically rigorous legal bias analysis'
      )
      .version('1.10.0');
    this.registerCommands();
  }

  async run(argv: string[]): Promise<number> {
    try {
      await this.program.parseAsync(argv, { from: 'node' });
      return 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      return 1;
    }
  }

  private resolveRoot(options: { root?: string }): string {
    return path.resolve(options.root ?? process.cwd());
  }

  private registerCommands(): void {
    this.program
      .command('init')
      .description('Initialize a new analysis project')
      .requiredOption('--name <name>', 'project name')
      .requiredOption('--jurisdiction-id <id>', 'jurisdiction identifier')
      .requiredOption('--jurisdiction-name <name>', 'jurisdiction display name')
      .option('--description <text>', 'project description')
      .option(
        '--template <template>',
        'blank | disparity-analysis | sentencing-analysis | trend-monitoring',
        'blank'
      )
      .option('--alpha <number>', 'significance level', '0.05')
      .option('--root <dir>', 'project root directory')
      .action((opts: Record<string, string>) => {
        const manager = createProjectManager(this.resolveRoot(opts));
        const state = manager.initProject({
          name: opts.name,
          description: opts.description,
          jurisdictionId: opts.jurisdictionId,
          jurisdictionName: opts.jurisdictionName,
          template: opts.template as 'blank',
          alpha: parseFloat(opts.alpha),
        });
        console.log(`Initialized project "${state.config.name}" at ${manager.getProjectDir()}`);
      });

    this.program
      .command('status')
      .description('Show project status and summary')
      .option('--root <dir>', 'project root directory')
      .action((opts: Record<string, string>) => {
        const manager = createProjectManager(this.resolveRoot(opts));
        if (!manager.exists()) {
          console.error('No project found. Run "akashic init" first.');
          return;
        }
        const state = manager.loadProject();
        console.log(`Project: ${state.config.name}`);
        console.log(`  Jurisdiction: ${state.config.jurisdictionName} (${state.config.jurisdictionId})`);
        console.log(`  Template: ${state.config.template}`);
        console.log(`  Alpha: ${state.config.alpha}`);
        console.log(`  Status: ${state.status}`);
        console.log(`  Sessions: ${state.sessions.length}`);
        console.log(`  Results: ${state.results.length}`);
      });

    this.program
      .command('session')
      .description('Session management')
      .argument('<action>', 'list | start | resume | show')
      .option('--id <id>', 'session id')
      .option('--root <dir>', 'project root directory')
      .action((action: string, opts: Record<string, string>) => {
        const manager = createProjectManager(this.resolveRoot(opts));
        if (!manager.exists()) {
          console.error('No project found. Run "akashic init" first.');
          return;
        }
        switch (action) {
          case 'list': {
            const sessions = manager.listSessions();
            if (sessions.length === 0) {
              console.log('No sessions recorded.');
              return;
            }
            for (const s of sessions) {
              console.log(
                `${s.sessionId}  ${s.status.padEnd(12)}  ${s.completedSteps}/${s.totalSteps} steps  ${s.updatedAt}`
              );
            }
            return;
          }
          case 'start': {
            const session = manager.startSession({});
            console.log(`Started session ${session.sessionId}`);
            return;
          }
          case 'resume': {
            if (!opts.id) {
              const resumable = manager.findResumableSession();
              if (!resumable) {
                console.error('No resumable session found.');
                return;
              }
              opts.id = resumable.sessionId;
            }
            const session = manager.resumeSession(opts.id);
            console.log(`Resumed session ${session.sessionId}`);
            return;
          }
          case 'show': {
            if (!opts.id) {
              console.error('--id is required for "session show"');
              return;
            }
            const session = manager.loadSession(opts.id);
            console.log(JSON.stringify(session, null, 2));
            return;
          }
          default:
            console.error(`Unknown session action: ${action}`);
        }
      });

    this.program
      .command('results')
      .description('Result versioning')
      .argument('<action>', 'list | compare')
      .option('--id <id>', 'result id')
      .option('--against <id>', 'baseline result id for compare')
      .option('--root <dir>', 'project root directory')
      .action((action: string, opts: Record<string, string>) => {
        const manager = createProjectManager(this.resolveRoot(opts));
        if (!manager.exists()) {
          console.error('No project found. Run "akashic init" first.');
          return;
        }
        switch (action) {
          case 'list': {
            const results = manager.listResults();
            if (results.length === 0) {
              console.log('No results recorded.');
              return;
            }
            for (const r of results) {
              console.log(
                `${r.resultId}  v${r.version}  ${r.label.padEnd(24)}  ${r.createdAt}`
              );
            }
            return;
          }
          case 'compare': {
            if (!opts.id || !opts.against) {
              console.error('--id and --against are required for "results compare"');
              return;
            }
            const comparison = manager.compareResults(opts.against, opts.id);
            console.log(`Comparing ${comparison.baseline.label} -> ${comparison.candidate.label}`);
            for (const m of comparison.metricDeltas) {
              console.log(
                `  ${m.metric.padEnd(24)} ${m.baseline} -> ${m.candidate} (${m.delta > 0 ? '+' : ''}${m.delta})`
              );
            }
            return;
          }
          default:
            console.error(`Unknown results action: ${action}`);
        }
      });

    this.program
      .command('export')
      .description('Export analysis output in multiple formats')
      .requiredOption('--input <file>', 'input JSON payload file')
      .option(
        '--format <format>',
        'markdown | html | json | csv | txt',
        'markdown'
      )
      .option('--output <file>', 'output file path (defaults to stdout)')
      .option('--root <dir>', 'project root directory')
      .action((opts: Record<string, string>) => {
        const manager = createProjectManager(this.resolveRoot(opts));
        const formatters = createExportFormatters();
        const inputPath = path.resolve(opts.input);
        if (!fs.existsSync(inputPath)) {
          console.error(`Input file not found: ${inputPath}`);
          return;
        }
        let payload: unknown;
        try {
          payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        } catch (err) {
          console.error(
            `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`
          );
          return;
        }
        const result = formatters.exportReport(payload, {
          format: opts.format as ExportFormat,
        });
        if (opts.output) {
          const outPath = path.resolve(opts.output);
          fs.mkdirSync(path.dirname(outPath), { recursive: true });
          fs.writeFileSync(outPath, result.content, 'utf8');
          console.log(`Wrote ${result.bytes} bytes to ${outPath}`);
        } else {
          process.stdout.write(result.content);
        }
        void manager;
      });
  }
}

/** Create the CLI instance. */
export function createCli(): AkashicCli {
  return new AkashicCli();
}

/** Run the CLI with the given argv (defaults to process.argv). */
export async function runCli(argv?: string[]): Promise<number> {
  const cli = createCli();
  return cli.run(argv ?? process.argv);
}
