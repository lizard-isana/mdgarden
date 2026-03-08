import { PluginConfig } from './config.js';

const hasSearchComponentForViewer = (viewer) => {
  if (!viewer || !viewer.id || typeof document === "undefined" || !document || typeof document.querySelectorAll !== "function") {
    return false;
  }
  const escapedId = typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function"
    ? CSS.escape(viewer.id)
    : viewer.id.replace(/"/g, '\\"');
  const explicit = document.querySelectorAll(`mdg-search[viewer-id="${escapedId}"], mdg-search[viewer="${escapedId}"]`);
  if (explicit.length > 0) {
    return true;
  }
  if (viewer.id !== "main") {
    return false;
  }
  const implicit = document.querySelectorAll("mdg-search:not([viewer-id]):not([viewer])");
  return implicit.length > 0;
};

const parseConfiguredPluginNames = (viewer) => {
  const configured = viewer.dataset.plugins
    ? viewer.dataset.plugins
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean)
    : [...PluginConfig.defaultPlugins];

  if (viewer.dataset.inlineSpa === "true" && configured.indexOf('inline-spa') < 0) {
    configured.push('inline-spa');
  }
  if (viewer.dataset.inlineSpa === "true" && configured.indexOf('search') < 0) {
    configured.push('search');
  }
  if (configured.indexOf('search') < 0 && hasSearchComponentForViewer(viewer)) {
    configured.push('search');
  }
  return configured;
};

const registerBuiltinPlugins = (mdgardenApi, viewer) => {
  const pluginNames = parseConfiguredPluginNames(viewer);
  pluginNames.forEach((pluginName) => {
    const entry = PluginConfig.registry[pluginName];
    if (!entry || typeof entry.create !== 'function') {
      console.warn(`[MDGarden] Unknown plugin in config: ${pluginName}`);
      return;
    }
    mdgardenApi.registerPlugin(viewer.id, entry.create(viewer));
  });
};

export { registerBuiltinPlugins };
