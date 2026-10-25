/**
 * Parallel Analysis Framework
 *
 * Worker thread pools for CPU-bound analysis tasks.
 * Supports configurable concurrency, a priority task queue, and
 * graceful shutdown. Integrates with independent statistical test
 * parallelization for the R bridge.
 */

import { Worker, isMainThread } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

export interface Task<TInput> {
  id: string;
  input: TInput;
  priority?: number;
  timeout?: number;
}

export interface TaskResult<TOutput> {
  taskId: string;
  success: boolean;
  output?: TOutput;
  error?: string;
  durationMs: number;
}

export interface WorkerPoolConfig {
  numWorkers?: number;
  maxQueueSize?: number;
  shutdownTimeout?: number;
  workerScript?: string;
}

const DEFAULT_CONFIG: Required<WorkerPoolConfig> = {
  numWorkers: os.cpus().length,
  maxQueueSize: 1000,
  shutdownTimeout: 30000,
  workerScript: 'worker_threads',
};

/**
 * Generic worker pool for parallelizing CPU-bound analysis tasks.
 *
 * Usage:
 *   const pool = new WorkerPool<AnalysisInput, AnalysisOutput>({ numWorkers: 4 });
 *   const results = await pool.runAll([{input:...}, ...]);
 *   await pool.shutdown();
 */
export class WorkerPool<TInput, TOutput> extends EventEmitter {
  private config: Required<WorkerPoolConfig>;
  private workers: Worker[];
  private pending: Task<TInput>[];
  private active: Map<number, {
    task: Task<TInput>;
    resolve: (v: TaskResult<TOutput>) => void;
    reject: (e: Error) => void;
  }>;
  private controllers: Map<string, { resolve: (v: TaskResult<TOutput>) => void; reject: (e: Error) => void }>;
  private nextTaskId: number;
  private isShuttingDown: boolean;
  private _workerScriptPath?: string;

  constructor(config: WorkerPoolConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workers = [];
    this.pending = [];
    this.active = new Map();
    this.controllers = new Map();
    this.nextTaskId = 0;
    this.isShuttingDown = false;

    if (isMainThread) {
      this.spawnWorkers();
    }
  }

  /** Spawn the configured number of workers. */
  private spawnWorkers(): void {
    const scriptPath = this.resolveWorkerPath();
    for (let i = 0; i < this.config.numWorkers; i++) {
      const worker = new Worker(scriptPath, {
        workerData: { workerIndex: i, poolConfig: this.config },
      });
      worker.on('message', (msg: PoolMessage<TOutput>) => {
        this.handleWorkerMessage(i, msg);
      });
      worker.on('error', (err: Error) => {
        this.handleWorkerError(i, err);
      });
      worker.on('exit', (code: number) => {
        this.handleWorkerExit(i, code);
      });
      this.workers.push(worker);
    }
  }

  /** Resolve the absolute path to the worker entry script. */
  private resolveWorkerPath(): string {
    const workerCode = `
const { parentPort, workerData } = require('worker_threads');
function processTask(task) {
  return { echo: true, input: task.input };
}
parentPort.on('message', (msg) => {
  if (msg.type === 'task') {
    const start = Date.now();
    try {
      const output = processTask(msg);
      parentPort.postMessage({ type: 'result', taskId: msg.taskId, output, durationMs: Date.now() - start });
    } catch (err) {
      parentPort.postMessage({ type: 'error', taskId: msg.taskId, error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start });
    }
  } else if (msg.type === 'shutdown') {
    parentPort.close();
    process.exit(0);
  }
});
process.on('uncaughtException', (err) => {
  try { parentPort.postMessage({ type: 'error', error: err.message }); } catch {}
  process.exit(1);
});
`;
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `akashic_worker_${process.pid}.js`);
    fs.writeFileSync(tmpFile, workerCode);
    this._workerScriptPath = tmpFile;
    return tmpFile;
  }

  /** Submit a single task to the pool. */
  submit(input: TInput, options: { priority?: number; timeout?: number } = {}): Promise<TaskResult<TOutput>> {
    return new Promise((resolve, reject) => {
      if (this.isShuttingDown) {
        reject(new Error('Pool is shutting down'));
        return;
      }

      const task: Task<TInput> = {
        id: `task_${++this.nextTaskId}`,
        input,
        priority: options.priority ?? 0,
        timeout: options.timeout,
      };

      // Insert by priority (higher priority first)
      let inserted = false;
      for (let i = 0; i < this.pending.length; i++) {
        const existingPriority = this.pending[i].priority ?? 0;
        if (existingPriority < (task.priority ?? 0)) {
          this.pending.splice(i, 0, task);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        this.pending.push(task);
      }

      // Backpressure check
      if (this.pending.length > this.config.maxQueueSize) {
        this.emit('backpressure', this.pending.length);
      }

      this.controllers.set(task.id, { resolve, reject });

      this.dispatch();
    });
  }

  /** Submit multiple tasks and wait for all to complete. */
  async runAll(
    inputs: TInput[],
    options: { priority?: number; timeout?: number } = {}
  ): Promise<TaskResult<TOutput>[]> {
    const promises = inputs.map(input => this.submit(input, options));
    return Promise.all(promises);
  }

  /** Dispatch pending tasks to idle workers. */
  private dispatch(): void {
    while (this.pending.length > 0 && this.active.size < this.workers.length) {
      const task = this.pending.shift()!;
      const idleWorkerIndex = this.workers.findIndex((_, i) => !this.active.has(i));
      if (idleWorkerIndex === -1) {
        // No idle worker; put the task back at front
        this.pending.unshift(task);
        break;
      }

      const controller = this.controllers.get(task.id);
      if (!controller) {
        // Task was removed from queue; skip
        continue;
      }

      this.active.set(idleWorkerIndex, { task, resolve: controller.resolve, reject: controller.reject });
      this.controllers.delete(task.id);

      this.workers[idleWorkerIndex].postMessage({
        type: 'task',
        taskId: task.id,
        input: task.input,
        timeout: task.timeout ?? 60000,
      } as WorkerTaskMessage<TInput>);
    }
  }

  /** Handle a message from a worker. */
  private handleWorkerMessage(workerIndex: number, msg: PoolMessage<TOutput>): void {
    const entry = this.active.get(workerIndex);
    if (!entry) {
      console.warn(`Received message from unknown worker ${workerIndex}`);
      return;
    }

    this.active.delete(workerIndex);

    if (msg.type === 'result') {
      entry.resolve({
        taskId: msg.taskId,
        success: true,
        output: msg.output,
        durationMs: msg.durationMs,
      });
    } else if (msg.type === 'error') {
      entry.resolve({
        taskId: msg.taskId,
        success: false,
        error: msg.error,
        durationMs: msg.durationMs,
      });
    }

    // Dispatch next pending task
    this.dispatch();
  }

  /** Handle a worker error. */
  private handleWorkerError(workerIndex: number, err: Error): void {
    const entry = this.active.get(workerIndex);
    if (entry) {
      entry.reject(err);
      this.active.delete(workerIndex);
    }
    this.emit('workerError', workerIndex, err);
  }

  /** Handle a worker exit. */
  private handleWorkerExit(workerIndex: number, code: number): void {
    this.active.delete(workerIndex);
    if (code !== 0 && !this.isShuttingDown) {
      console.warn(`Worker ${workerIndex} exited with code ${code}`);
    }
  }

  /** Gracefully shut down the pool. */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    const start = Date.now();
    while (this.active.size > 0 && Date.now() - start < this.config.shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    for (const worker of this.workers) {
      await worker.terminate();
    }
    this.workers = [];
    this.pending = [];

    // Clean up the temporary worker script file
    if (this._workerScriptPath && fs.existsSync(this._workerScriptPath)) {
      fs.unlinkSync(this._workerScriptPath);
      this._workerScriptPath = undefined;
    }
  }

  /** Get current pool statistics. */
  getStats(): { workers: number; active: number; pending: number } {
    return {
      workers: this.workers.length,
      active: this.active.size,
      pending: this.pending.length,
    };
  }
}

interface WorkerTaskMessage<TInput> {
  type: 'task';
  taskId: string;
  input: TInput;
  timeout: number;
}

interface PoolMessage<TOutput> {
  type: 'result' | 'error';
  taskId: string;
  output?: TOutput;
  error?: string;
  durationMs: number;
}
