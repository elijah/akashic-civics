export * from './plugin_types';
export * from './extension_registry';

import { ExtensionRegistry } from './extension_registry';
import { ExtensionError, PluginType } from './plugin_types';

export { ExtensionRegistry, ExtensionError, PluginType };

export default ExtensionRegistry;
