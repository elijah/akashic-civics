/**
 * R Execution Manager
 * 
 * Provides robust R script execution with:
 * - Configurable timeout with cancellation
 * - Progress reporting via callbacks
 * - Session reuse (optional)
 * - Resource cleanup
 */

import { spawn, ChildProcess } from 'child_process';
import { tmpdir } from 'os';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export interface ExecutionOptions {
  timeout?: number;           // milliseconds (default: 300000 = 5 min)
  useWorker?: boolean;        // use worker pool
  workerId?: number;
  onProgress?: (progress: ExecutionProgress) => void;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface ExecutionProgress {
  stage: 'starting' | 'running' | 'parsing' | 'complete' | 'error' | 'cancelled';
  message: string;
  elapsedMs: number;
  percentComplete?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  outputFile?: string;
  success: boolean;
  timedOut: boolean;
  cancelled: boolean;
  durationMs: number;
}

export interface WorkerInfo {
  id: number;
  busy: boolean;
  process?: ChildProcess;
  startTime?: number;
}

export class RExecutionManager {
  private rScriptPath: string;
  private workerPool: WorkerInfo[];
  private defaultTimeout: number;
  private maxWorkers: number;
  private activeExecutions: Map<string, ChildProcess> = new Map();

  constructor(
    rScriptPath: string = '/usr/bin/Rscript',
    options: { maxWorkers?: number; defaultTimeout?: number } = {}
  ) {
    this.rScriptPath = rScriptPath;
    this.defaultTimeout = options.defaultTimeout ?? 300000; // 5 minutes
    this.maxWorkers = options.maxWorkers ?? Math.max(1, require('os').cpus().length - 1);
    this.workerPool = [];
    
    // Initialize worker pool
    for (let i = 0; i < this.maxWorkers; i++) {
      this.workerPool.push({ id: i, busy: false });
    }
  }

  /**
   * Execute R script content with timeout and progress reporting
   */
  async executeScript(
    rScript: string,
    outputFile: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    const timeout = options.timeout ?? this.defaultTimeout;

    return new Promise((resolve, reject) => {
      // Write script to temp file
      const scriptPath = join(tmpdir(), `akashic_script_${executionId}.R`);
      writeFileSync(scriptPath, rScript);

      // Track progress
      let timedOut = false;
      let cancelled = false;
      let stdout = '';
      let stderr = '';

      const progressCallback = (stage: ExecutionProgress['stage'], message: string, percentComplete?: number) => {
        if (options.onProgress) {
          options.onProgress({
            stage,
            message,
            elapsedMs: Date.now() - startTime,
            percentComplete
          });
        }
      };

      progressCallback('starting', 'Initializing R process');

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
        progressCallback('error', `Execution timed out after ${timeout}ms`);
        
        if (process && !process.killed) {
          process.kill('SIGTERM');
          // Force kill after 5 seconds
          setTimeout(() => {
            if (process && !process.killed) {
              process.kill('SIGKILL');
            }
          }, 5000);
        }
      }, timeout);

      // Spawn R process
      let process: ChildProcess;
      try {
        process = spawn(this.rScriptPath, [scriptPath], {
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: tmpdir()
        });
      } catch (error) {
        clearTimeout(timeoutId);
        unlinkSync(scriptPath);
        reject(new Error(`Failed to spawn R process: ${(error as Error).message}`));
        return;
      }

      // Track active execution
      this.activeExecutions.set(executionId, process);

      // Assign worker if requested
      let assignedWorker: WorkerInfo | undefined;
      if (options.useWorker) {
        assignedWorker = options.workerId !== undefined
          ? this.workerPool.find(w => w.id === options.workerId)
          : this.workerPool.find(w => !w.busy);
        
        if (assignedWorker) {
          assignedWorker.busy = true;
          assignedWorker.process = process;
          assignedWorker.startTime = Date.now();
        }
      }

      progressCallback('running', 'R script executing', 10);

      // Handle stdout
      if (process && process.stdout && !process.stdout.closed) {
        process.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout += text;
          if (options.onStdout) options.onStdout(text);
        });
      }

      // Handle stderr
      if (process && process.stderr && !process.stderr.closed) {
        process.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          if (options.onStderr) options.onStderr(text);
          
          // Parse progress from stderr if possible
          if (text.includes('Progress:') && options.onProgress) {
            const match = text.match(/Progress:\s*(\d+)%/);
            if (match) {
              progressCallback('running', 'R script executing', parseInt(match[1], 10));
            }
          }
        });
      }

      // Handle process close
      process.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        this.activeExecutions.delete(executionId);
        
        // Clean up worker
        if (assignedWorker) {
          assignedWorker.busy = false;
          assignedWorker.process = undefined;
          assignedWorker.startTime = undefined;
        }

        // Clean up script file
        try {
          if (existsSync(scriptPath)) unlinkSync(scriptPath);
        } catch { /* ignore */ }

        // Read output file if it exists
        let outputFileContent: string | undefined;
        if (existsSync(outputFile)) {
          try {
            // We don't read it here - let caller handle it
            outputFileContent = outputFile;
          } catch { /* ignore */ }
        }

        const durationMs = Date.now() - startTime;

        if (cancelled) {
          progressCallback('cancelled', 'Execution was cancelled', 0);
          resolve({
            stdout,
            stderr,
            exitCode: code,
            outputFile: outputFileContent,
            success: false,
            timedOut: false,
            cancelled: true,
            durationMs
          });
          return;
        }

        if (timedOut) {
          progressCallback('error', 'Execution timed out', 0);
          resolve({
            stdout,
            stderr,
            exitCode: code,
            outputFile: outputFileContent,
            success: false,
            timedOut: true,
            cancelled: false,
            durationMs
          });
          return;
        }

        if (code === 0) {
          progressCallback('complete', 'Execution completed successfully', 100);
          resolve({
            stdout,
            stderr,
            exitCode: code,
            outputFile: outputFileContent,
            success: true,
            timedOut: false,
            cancelled: false,
            durationMs
          });
        } else {
          progressCallback('error', `R script failed with exit code ${code}`);
          resolve({
            stdout,
            stderr,
            exitCode: code,
            outputFile: outputFileContent,
            success: false,
            timedOut: false,
            cancelled: false,
            durationMs
          });
        }
      });

      // Handle process error
      process.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        this.activeExecutions.delete(executionId);
        
        if (assignedWorker) {
          assignedWorker.busy = false;
          assignedWorker.process = undefined;
          assignedWorker.startTime = undefined;
        }

        try {
          if (existsSync(scriptPath)) unlinkSync(scriptPath);
        } catch { /* ignore */ }

        progressCallback('error', `Process error: ${error.message}`);
        resolve({
          stdout,
          stderr: error.message,
          exitCode: null,
          success: false,
          timedOut: false,
          cancelled: false,
          durationMs: Date.now() - startTime
        });
      });

      // Return cancellation function
      const cancel = () => {
        cancelled = true;
        if (process && !process.killed) {
          process.kill('SIGTERM');
        }
      };

      // Attach cancel method to the promise (via a wrapper)
      (resolve as any).cancel = cancel;
    });
  }

  /**
   * Execute multiple scripts in parallel (batch mode)
   */
  async executeBatch(
    scripts: Array<{ rScript: string; outputFile: string }>,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult[]> {
    const concurrency = Math.min(this.maxWorkers, scripts.length);
    const results: ExecutionResult[] = [];
    const executing: Promise<ExecutionResult>[] = [];
    let executePromise: Promise<ExecutionResult>;

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      
      executePromise = this.executeScript(script.rScript, script.outputFile, {
        ...options,
        useWorker: true,
        workerId: i % this.maxWorkers
      });

      executing.push(executePromise);

      // Limit concurrency
      if (executing.length >= concurrency) {
        const completed = await Promise.race(executing);
        results.push(completed);
        const idx = executing.findIndex(p => p === executePromise);
        if (idx >= 0) executing.splice(idx, 1);
      }
    }

    // Wait for remaining
    while (executing.length > 0) {
      const completed = await Promise.race(executing);
      results.push(completed);
      const idx = executing.findIndex(p => p === executePromise);
      if (idx >= 0) executing.splice(idx, 1);
    }

    return results;
  }

  /**
   * Cancel all running executions
   */
  cancelAll(): number {
    let count = 0;
    for (const [_id, process] of this.activeExecutions) {
      if (!process.killed) {
        process.kill('SIGTERM');
        count++;
      }
    }
    this.activeExecutions.clear();
    return count;
  }

  /**
   * Get status of active executions
   */
  getActiveExecutions(): Array<{ id: string; durationMs: number }> {
    const now = Date.now();
    return Array.from(this.activeExecutions.entries()).map(([id, process]) => ({
      id,
      durationMs: now - (process as any)._startTime || 0
    }));
  }

  /**
   * Get worker pool status
   */
  getWorkerStatus(): WorkerInfo[] {
    return this.workerPool.map(w => ({ ...w }));
  }

  /**
   * Check R availability
   */
  async checkRAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      const process = spawn(this.rScriptPath, ['--version']);
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => stdout += data.toString());
      process.stderr.on('data', (data) => stderr += data.toString());
      
      process.on('close', (code) => {
        if (code === 0) {
          const versionMatch = stdout.match(/version\s+(\d+\.\d+\.\d+)/i);
          resolve({
            available: true,
            version: versionMatch ? versionMatch[1] : undefined
          });
        } else {
          resolve({
            available: false,
            error: stderr || 'R not available'
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          available: false,
          error: error.message
        });
      });
    });
  }

  /**
   * Get manager statistics
   */
  getStats(): {
    maxWorkers: number;
    busyWorkers: number;
    activeExecutions: number;
    defaultTimeout: number;
  } {
    return {
      maxWorkers: this.maxWorkers,
      busyWorkers: this.workerPool.filter(w => w.busy).length,
      activeExecutions: this.activeExecutions.size,
      defaultTimeout: this.defaultTimeout
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cancelAll();
    this.workerPool = [];
    this.activeExecutions.clear();
  }

  private generateExecutionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance for convenience
let defaultManager: RExecutionManager | null = null;

export function getDefaultExecutionManager(rScriptPath?: string): RExecutionManager {
  if (!defaultManager) {
    defaultManager = new RExecutionManager(rScriptPath);
  }
  return defaultManager;
}

export function setDefaultExecutionManager(manager: RExecutionManager): void {
  defaultManager = manager;
}