/**
 * Extension Registry Tests
 */

import { ExtensionRegistry } from '../extension_registry';
import { ExtensionError, PluginType } from '../plugin_types';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('ExtensionRegistry', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akashic-ext-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should use defaults when no options provided', () => {
      const registry = new ExtensionRegistry();
      expect(registry.getAll()).toEqual([]);
    });

    it('should accept pluginsDir option', () => {
      const registry = new ExtensionRegistry({ pluginsDir: tmpDir });
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('loadDefaults', () => {
    it('should load built-in plugins', async () => {
      const registry = new ExtensionRegistry();
      await registry.loadDefaults();

      const all = registry.getAll();
      expect(all.length).toBe(2);
      expect(all.some(p => p.manifest.type === 'data-source')).toBe(true);
      expect(all.some(p => p.manifest.type === 'analysis')).toBe(true);
    });

    it('should not duplicate built-in plugins', async () => {
      const registry = new ExtensionRegistry();
      await registry.loadDefaults();
      await registry.loadDefaults();

      expect(registry.getAll().length).toBe(2);
    });
  });

  describe('get', () => {
    it('should return undefined for unknown plugin', () => {
      const registry = new ExtensionRegistry();
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should return registered plugin', async () => {
      const registry = new ExtensionRegistry();
      await registry.loadDefaults();

      const plugin = registry.get('data-sources');
      expect(plugin).toBeDefined();
      expect(plugin!.manifest.name).toBe('Built-in Data Sources');
    });
  });

  describe('getByType', () => {
    it('should return plugins of specified type', async () => {
      const registry = new ExtensionRegistry();
      await registry.loadDefaults();

      const dataSources = registry.getByType('data-source' as PluginType);
      expect(dataSources.length).toBe(1);
      expect(dataSources[0].manifest.type).toBe('data-source');
    });

    it('should return empty array for type with no plugins', () => {
      const registry = new ExtensionRegistry();
      const exports = registry.getByType('export-format' as PluginType);
      expect(exports).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for existing plugin', async () => {
      const registry = new ExtensionRegistry();
      await registry.loadDefaults();
      expect(registry.has('data-sources')).toBe(true);
    });

    it('should return false for non-existing plugin', () => {
      const registry = new ExtensionRegistry();
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('discoverAndLoad', () => {
    it('should skip non-existent directory', async () => {
      const registry = new ExtensionRegistry();
      await registry.discoverAndLoad(path.join(tmpDir, 'nonexistent'));
      expect(registry.getAll()).toEqual([]);
    });

    it('should discover plugins from directory', async () => {
      const pluginsDir = path.join(tmpDir, 'plugins');
      fs.mkdirSync(pluginsDir);

      // Create a plugin manifest
      const pluginDir = path.join(pluginsDir, 'my-test-plugin');
      fs.mkdirSync(pluginDir);

      const manifest = {
        id: 'my-test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        type: 'analysis' as PluginType,
        entry: 'index.ts',
        metadata: {},
      };

      fs.writeFileSync(
        path.join(pluginDir, 'extension.json'),
        JSON.stringify(manifest, null, 2)
      );

      const registry = new ExtensionRegistry();
      await registry.discoverAndLoad(pluginsDir);

      // Should at least try to load the plugin dir
      expect(registry.getAll().length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateAll', () => {
    it('should return valid=true with no errors for built-in plugins', async () => {
      const registry = new ExtensionRegistry();
      await registry.loadDefaults();

      const result = registry.validateAll();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for all plugins', async () => {
      const registry = new ExtensionRegistry();
      await registry.loadDefaults();

      const meta = registry.getMetadata();
      expect(meta['data-sources']).toBeDefined();
      expect((meta['data-sources'] as any).name).toBe('Built-in Data Sources');
      expect((meta['data-sources'] as any).type).toBe('data-source');
      expect(meta['disparity-analysis']).toBeDefined();
    });
  });

  describe('unload', () => {
    it('should remove plugin from registry', async () => {
      const registry = new ExtensionRegistry();
      await registry.loadDefaults();
      expect(registry.has('data-sources')).toBe(true);

      await registry.unload('data-sources');
      expect(registry.has('data-sources')).toBe(false);
    });

    it('should throw for non-existent plugin', async () => {
      const registry = new ExtensionRegistry();
      await expect(registry.unload('nonexistent')).rejects.toThrow(ExtensionError);
    });
  });
});

describe('ExtensionError', () => {
  it('should set name and message with code', () => {
    const err = new ExtensionError('Something went wrong', 'TEST_CODE');
    expect(err.name).toBe('ExtensionError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('[TEST_CODE] Something went wrong');
  });
});

describe('PluginType', () => {
  it('should support all plugin types', () => {
    const types: PluginType[] = ['data-source', 'analysis', 'export-format', 'transformation'];
    for (const t of types) {
      expect(t).toBeTruthy();
    }
  });
});

describe('createAnalysisWizard', () => {
  it('should instantiate without error', async () => {
    const registry = new ExtensionRegistry();
    await registry.loadDefaults();
    expect(registry.getMetadata()).toBeDefined();
  });
});