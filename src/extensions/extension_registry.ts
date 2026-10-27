/**
 * Extension Registry
 *
 * Central registry for managing Akashic Civics plugins. Handles:
 * - Plugin discovery and loading
 * - Plugin registration and metadata
 * - Plugin lifecycle (initialize/shutdown)
 * - Plugin conflict resolution
 * - Plugin validation and security
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ExtensionError,
  PluginManifest,
  PluginContext,
  PluginType,
} from './plugin_types';

export interface RegistryOptions {
  pluginsDir?: string;
  allowedTypes?: PluginType[];
  requireManifest?: boolean;
  sandbox?: boolean;
}

export interface RegisteredPlugin {
  manifest: PluginManifest;
  instance: Record<string, unknown>;
  loadedAt: number;
  filepath: string;
}

export class ExtensionRegistry {
  private plugins = new Map<string, RegisteredPlugin>();
  private readonly options: RegistryOptions;

  constructor(options: RegistryOptions = {}) {
    this.options = {
      pluginsDir: options.pluginsDir,
      allowedTypes: options.allowedTypes,
      requireManifest: options.requireManifest !== false,
      sandbox: options.sandbox ?? false,
    };
  }

  /** Discover and load plugins from a directory. */
  async discoverAndLoad(dir?: string): Promise<void> {
    const searchDir = dir || this.options.pluginsDir || path.join(process.cwd(), 'plugins');

    if (!fs.existsSync(searchDir)) {
      console.warn(`Plugins directory not found: ${searchDir}`);
      return;
    }

    const entries = fs.readdirSync(searchDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.loadPluginFromDir(path.join(searchDir, entry.name));
      }
    }

    console.log(`Discovered ${this.plugins.size} plugins`);
  }

  /** Load a single plugin from a directory. */
  private async loadPluginFromDir(pluginDir: string): Promise<void> {
    const manifestPath = path.join(pluginDir, 'extension.json');
    let manifest: PluginManifest;

    if (this.options.requireManifest && fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } else {
      const pkgPath = path.join(pluginDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        manifest = {
          id: pkg.name || path.basename(pluginDir),
          name: pkg.name || path.basename(pluginDir),
          version: pkg.version || '0.0.1',
          description: pkg.description || '',
          type: 'extension' as PluginType,
          entry: pkg.main || 'index.ts',
          dependencies: pkg.dependencies,
        };
      } else {
        console.warn(`No manifest found in ${pluginDir}`);
        return;
      }
    }

    if (!manifest.id) {
      console.warn(`Plugin missing id: ${manifest.id}`);
      return;
    }
    if (!manifest.name) manifest.name = manifest.id;
    if (!manifest.version) manifest.version = '0.0.1';
    if (!manifest.type) manifest.type = 'extension' as PluginType;

    if (this.plugins.has(manifest.id)) {
      console.warn(`Duplicate plugin id: ${manifest.id}`);
      return;
    }

    if (this.options.allowedTypes && !this.options.allowedTypes.includes(manifest.type)) {
      console.warn(`Plugin type not allowed: ${manifest.type}`);
      return;
    }

    let instance: Record<string, unknown>;
    try {
      const entryPath = path.resolve(path.join(pluginDir, manifest.entry));
      if (!fs.existsSync(entryPath)) {
        console.warn(`Plugin entry not found: ${manifest.entry}`);
        return;
      }

      const module = await import(entryPath);
      instance = this.extractPluginInstance(module);

      if (!instance || typeof instance !== 'object') {
        console.warn(`No valid plugin instance in ${entryPath}`);
        return;
      }

      if (!instance.manifest) {
        instance.manifest = manifest;
      }

      const context: PluginContext = {
        jurisdictionId: String(manifest.metadata?.jurisdictionId ?? ''),
        alpha: Number(manifest.metadata?.alpha ?? 0.05),
        config: (manifest.metadata?.config as Record<string, unknown>) ?? {},
        log: (msg: string) => console.log(`[plugin:${manifest.id}] ${msg}`),
        error: (msg: string) => console.error(`[plugin:${manifest.id}] ${msg}`),
      };

      if (instance.initialize && typeof instance.initialize === 'function') {
        await instance.initialize(context);
      }

      const registered: RegisteredPlugin = {
        manifest,
        instance,
        loadedAt: Date.now(),
        filepath: pluginDir,
      };

      this.plugins.set(manifest.id, registered);
      console.log(`Loaded plugin: ${manifest.id} v${manifest.version}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to load plugin from ${pluginDir}: ${errMsg}`);
      throw new ExtensionError(`Failed to load plugin: ${errMsg}`, 'PLUGIN_LOAD_ERROR');
    }
  }

  /** Extract plugin instance from a loaded module. */
  private extractPluginInstance(module: Record<string, unknown>): Record<string, unknown> {
    if (module.default) return module.default as Record<string, unknown>;
    if (module.plugin) return module.plugin as Record<string, unknown>;
    if (module.dataSource) return module.dataSource as Record<string, unknown>;
    if (module.analysis) return module.analysis as Record<string, unknown>;
    if (module.exportFormat) return module.exportFormat as Record<string, unknown>;
    if (module.transformation) return module.transformation as Record<string, unknown>;
    return module;
  }

  /** Load built-in/default plugins. */
  async loadDefaults(): Promise<void> {
    const builtIns: Array<{ id: string; manifest: PluginManifest }> = [
      {
        id: 'data-sources',
        manifest: {
          id: 'data-sources',
          name: 'Built-in Data Sources',
          version: '1.0.0',
          description: 'FBI UCR and BJS data sources',
          type: 'data-source' as PluginType,
          entry: '',
        },
      },
      {
        id: 'disparity-analysis',
        manifest: {
          id: 'disparity-analysis',
          name: 'Disparity Analysis',
          version: '1.0.0',
          description: 'Group-based disparity analysis',
          type: 'analysis' as PluginType,
          entry: '',
        },
      },
    ];

    for (const bi of builtIns) {
      if (!this.plugins.has(bi.id)) {
        let instance: Record<string, unknown> = { initialize: async () => {}, shutdown: async () => {} };

        if (bi.manifest.type === 'data-source') {
          (instance as any).fetch = async () => ({ data: [], metadata: {} });
          (instance as any).getStats = async () => ({});
          (instance as any).validateConfig = async () => true;
        } else if (bi.manifest.type === 'analysis') {
          (instance as any).analyze = async () => ({});
          (instance as any).getSupportedMetrics = async () => [];
          (instance as any).validateInput = async () => ({ valid: true, errors: [] });
        }

        const registered: RegisteredPlugin = {
          manifest: bi.manifest,
          instance,
          loadedAt: Date.now(),
          filepath: `__builtin__:${bi.id}`,
        };
        this.plugins.set(bi.id, registered);
      }
    }

    console.log('Loaded built-in extensions');
  }

  /** Get a registered plugin by id. */
  get(id: string): RegisteredPlugin | undefined {
    return this.plugins.get(id);
  }

  /** Get all registered plugins. */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /** Get plugins by type. */
  getByType(type: PluginType): RegisteredPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.manifest.type === type);
  }

  /** Check if a plugin id exists. */
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  /** Unload a plugin. */
  async unload(id: string): Promise<void> {
    const registered = this.plugins.get(id);
    if (!registered) {
      throw new ExtensionError(`Plugin not found: ${id}`, 'PLUGIN_NOT_FOUND');
    }

    if (registered.instance.shutdown && typeof registered.instance.shutdown === 'function') {
      try {
        await registered.instance.shutdown();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`Error shutting down plugin ${id}: ${errMsg}`);
      }
    }

    this.plugins.delete(id);
    console.log(`Unloaded plugin: ${id}`);
  }

  /** Validate all loaded plugins. */
  validateAll(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [id, registered] of this.plugins) {
      const pluginErrors = this.validatePlugin(registered);
      errors.push(...pluginErrors.map(e => `${id}: ${e}`));
    }

    return { valid: errors.length === 0, errors };
  }

  /** Validate a single plugin. */
  private validatePlugin(registered: RegisteredPlugin): string[] {
    const errors: string[] = [];
    const { manifest, instance } = registered;

    if (!manifest.id) errors.push('Missing manifest.id');
    if (!manifest.name) errors.push('Missing manifest.name');
    if (!manifest.version) errors.push('Missing manifest.version');
    if (!manifest.type) errors.push('Missing manifest.type');

    if (manifest.type === 'data-source' && !instance.fetch) errors.push('data-source plugin missing fetch method');
    if (manifest.type === 'analysis' && !instance.analyze) errors.push('analysis plugin missing analyze method');
    if (manifest.type === 'export-format' && !instance.export) errors.push('export-format plugin missing export method');
    if (manifest.type === 'transformation' && !instance.transform) errors.push('transformation plugin missing transform method');

    return errors;
  }

  /** Get plugin metadata summary. */
  getMetadata(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [id, registered] of this.plugins) {
      const m = registered.manifest;
      result[id] = {
        name: m.name,
        version: m.version,
        type: m.type,
        description: m.description,
        loadedAt: registered.loadedAt,
      };
    }
    return result;
  }
}

export default ExtensionRegistry;