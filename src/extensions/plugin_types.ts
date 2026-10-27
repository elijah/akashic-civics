/**
 * Plugin Types
 *
 * Core interfaces that all Akashic Civics plugins must implement.
 * Plugins are loaded dynamically and provide extensibility for data sources,
 * analysis methods, export formats, and data transformations.
 */

import { LegalJusticeCase } from '../normalization';
import { ExportFormat, ExportResult } from '../cli/export_formatters';

export type PluginType =
  | 'data-source'
  | 'analysis'
  | 'export-format'
  | 'transformation'
  | 'visualization'
  | 'report-template';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  type: PluginType;
  entry: string;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface PluginContext {
  readonly jurisdictionId: string;
  readonly alpha: number;
  readonly config: Record<string, unknown>;
  log: (msg: string) => void;
  error: (msg: string) => void;
}

export interface DataSourcePlugin {
  readonly type: 'data-source';

  fetch(options: Record<string, unknown>): Promise<{
    data: LegalJusticeCase[];
    metadata: Record<string, unknown>;
  }>;

  getStats(): Record<string, unknown>;

  validateConfig(config: Record<string, unknown>): boolean;
}

export interface AnalysisPlugin {
  readonly type: 'analysis';

  analyze(cases: LegalJusticeCase[], options: Record<string, unknown>): Promise<Record<string, unknown>>;

  getSupportedMetrics(): string[];

  validateInput(cases: LegalJusticeCase[]): { valid: boolean; errors: string[] };
}

export interface ExportPlugin {
  readonly type: 'export-format';

  export(data: Record<string, unknown>, options: Record<string, unknown>): Promise<ExportResult>;

  getFormat(): ExportFormat;

  getContentType(): string;
}

export interface TransformationPlugin {
  readonly type: 'transformation';

  transform(data: LegalJusticeCase[], options: Record<string, unknown>): Promise<LegalJusticeCase[]>;

  getTransformationName(): string;

  getSupportedFields(): string[];
}

export type AnyPlugin = DataSourcePlugin | AnalysisPlugin | ExportPlugin | TransformationPlugin;

export interface PluginInterface {
  manifest: PluginManifest;
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
  [key: string]: unknown;
}

export class ExtensionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(`[${code}] ${message}`);
    this.name = 'ExtensionError';
  }
}

export function isDataSourcePlugin(plugin: PluginInterface): plugin is DataSourcePlugin & PluginInterface {
  return (plugin as any).type === 'data-source';
}

export function isAnalysisPlugin(plugin: PluginInterface): plugin is AnalysisPlugin & PluginInterface {
  return (plugin as any).type === 'analysis';
}

export function isExportPlugin(plugin: PluginInterface): plugin is ExportPlugin & PluginInterface {
  return (plugin as any).type === 'export-format';
}

export function isTransformationPlugin(plugin: PluginInterface): plugin is TransformationPlugin & PluginInterface {
  return (plugin as any).type === 'transformation';
}