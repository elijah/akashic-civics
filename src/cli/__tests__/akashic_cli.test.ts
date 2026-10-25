/**
 * Akashic CLI Entry Point Tests
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AkashicCli, createCli, runCli } from '../akashic_cli';

describe('AkashicCli', () => {
  let tmpDir: string;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let outSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akashic-cli-run-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    outSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    outSpy.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function output(): string {
    return logSpy.mock.calls.map(c => c.join(' ')).join('\n');
  }

  describe('init', () => {
    it('should initialize a project', async () => {
      const cli = createCli();
      const code = await cli.run([
        'node',
        'akashic',
        'init',
        '--name',
        'CLI Project',
        '--jurisdiction-id',
        'TX-001',
        '--jurisdiction-name',
        'Test County',
        '--root',
        tmpDir,
      ]);

      expect(code).toBe(0);
      expect(fs.existsSync(path.join(tmpDir, '.akashic', 'project.json'))).toBe(true);
      expect(output()).toContain('Initialized project');
    });

it('should report an error when the project already exists', async () => {
      const cli = createCli();
      const argv = [
        'node',
        'akashic',
        'init',
        '--name',
        'Dup',
        '--jurisdiction-id',
        'TX-001',
        '--jurisdiction-name',
        'Test County',
        '--root',
        tmpDir,
      ];
      await cli.run(argv); // first init: success
      const second = await createCli().run(argv); // second init: error expected
      expect(second).toBe(1); // expect exit code 1 for the error
      expect(errorSpy.mock.calls.map(c => c.join(' ')).join('\n')).toContain(
        'already exists'
      );
    });
  });

  describe('status', () => {
    it('should error when no project exists', async () => {
      const cli = createCli();
      await cli.run(['node', 'akashic', 'status', '--root', tmpDir]);
      expect(errorSpy.mock.calls.map(c => c.join(' ')).join('\n')).toContain(
        'No project found'
      );
    });

    it('should print project details', async () => {
      await createCli().run([
        'node',
        'akashic',
        'init',
        '--name',
        'Status Project',
        '--jurisdiction-id',
        'TX-001',
        '--jurisdiction-name',
        'Test County',
        '--root',
        tmpDir,
      ]);
      logSpy.mockClear();

      await createCli().run(['node', 'akashic', 'status', '--root', tmpDir]);
      const text = output();
      expect(text).toContain('Status Project');
      expect(text).toContain('Test County');
    });
  });

  describe('session', () => {
    beforeEach(async () => {
      await createCli().run([
        'node',
        'akashic',
        'init',
        '--name',
        'Session Project',
        '--jurisdiction-id',
        'TX-001',
        '--jurisdiction-name',
        'Test County',
        '--root',
        tmpDir,
      ]);
      logSpy.mockClear();
    });

    it('should list sessions', async () => {
      await createCli().run([
        'node',
        'akashic',
        'session',
        'start',
        '--root',
        tmpDir,
      ]);
      logSpy.mockClear();

      await createCli().run([
        'node',
        'akashic',
        'session',
        'list',
        '--root',
        tmpDir,
      ]);
      expect(output()).toContain('session_');
    });

    it('should report when there are no sessions', async () => {
      await createCli().run([
        'node',
        'akashic',
        'session',
        'list',
        '--root',
        tmpDir,
      ]);
      expect(output()).toContain('No sessions recorded');
    });

    it('should resume the most recent session', async () => {
      await createCli().run([
        'node',
        'akashic',
        'session',
        'start',
        '--root',
        tmpDir,
      ]);
      logSpy.mockClear();

      await createCli().run([
        'node',
        'akashic',
        'session',
        'resume',
        '--root',
        tmpDir,
      ]);
      expect(output()).toContain('Resumed session');
    });
  });

  describe('results', () => {
    it('should report when there are no results', async () => {
      await createCli().run([
        'node',
        'akashic',
        'init',
        '--name',
        'Results Project',
        '--jurisdiction-id',
        'TX-001',
        '--jurisdiction-name',
        'Test County',
        '--root',
        tmpDir,
      ]);
      logSpy.mockClear();

      await createCli().run([
        'node',
        'akashic',
        'results',
        'list',
        '--root',
        tmpDir,
      ]);
      expect(output()).toContain('No results recorded');
    });
  });

  describe('export', () => {
    it('should export a JSON payload to markdown on stdout', async () => {
      const inputPath = path.join(tmpDir, 'payload.json');
      fs.writeFileSync(
        inputPath,
        JSON.stringify({ heading: 'Exported', value: 42 }),
        'utf8'
      );

      await createCli().run([
        'node',
        'akashic',
        'export',
        '--input',
        inputPath,
        '--format',
        'markdown',
        '--root',
        tmpDir,
      ]);

      const written = outSpy.mock.calls.map(c => String(c[0])).join('');
      expect(written).toContain('## heading');
      expect(written).toContain('42');
    });

    it('should write output to a file', async () => {
      const inputPath = path.join(tmpDir, 'payload.json');
      const outputPath = path.join(tmpDir, 'out', 'report.md');
      fs.writeFileSync(inputPath, JSON.stringify({ heading: 'File Output' }), 'utf8');

      await createCli().run([
        'node',
        'akashic',
        'export',
        '--input',
        inputPath,
        '--output',
        outputPath,
        '--root',
        tmpDir,
      ]);

      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.readFileSync(outputPath, 'utf8')).toContain('File Output');
    });

    it('should error on a missing input file', async () => {
      await createCli().run([
        'node',
        'akashic',
        'export',
        '--input',
        path.join(tmpDir, 'nope.json'),
        '--root',
        tmpDir,
      ]);
      expect(errorSpy.mock.calls.map(c => c.join(' ')).join('\n')).toContain(
        'Input file not found'
      );
    });

    it('should error on invalid JSON', async () => {
      const inputPath = path.join(tmpDir, 'bad.json');
      fs.writeFileSync(inputPath, '{not json', 'utf8');

      await createCli().run([
        'node',
        'akashic',
        'export',
        '--input',
        inputPath,
        '--root',
        tmpDir,
      ]);
      expect(errorSpy.mock.calls.map(c => c.join(' ')).join('\n')).toContain(
        'Failed to parse JSON'
      );
    });
  });

  describe('runCli', () => {
    it('should return a zero exit code for a valid command', async () => {
      const code = await runCli([
        'node',
        'akashic',
        'init',
        '--name',
        'Run CLI',
        '--jurisdiction-id',
        'TX-001',
        '--jurisdiction-name',
        'Test County',
        '--root',
        tmpDir,
      ]);
      expect(code).toBe(0);
    });
  });

  describe('AkashicCli class', () => {
    it('should be constructible directly', () => {
      expect(new AkashicCli()).toBeInstanceOf(AkashicCli);
    });
  });
});
