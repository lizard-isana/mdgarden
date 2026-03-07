const DEFAULT_TRUSTED_ORIGINS = Object.freeze([
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com'
]);

const isPlainObject = (value) => {
  return value != null && typeof value === 'object' && !Array.isArray(value);
};

const normalizeLibraryName = (value) => {
  const name = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
    return null;
  }
  return name;
};

const normalizeGlobalName = (value) => {
  const globalName = String(value || '').trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(globalName)) {
    return null;
  }
  return globalName;
};

const normalizeTrustedOrigins = (source) => {
  const set = new Set(DEFAULT_TRUSTED_ORIGINS);
  if (!Array.isArray(source)) {
    return [...set];
  }
  source.forEach((item) => {
    try {
      const url = new URL(String(item || ''));
      if (url.protocol !== 'https:') {
        return;
      }
      set.add(url.origin);
    } catch (_error) {
      // ignore invalid origin entries
    }
  });
  return [...set];
};

const normalizeUrls = (source, trustedOriginSet) => {
  const raw = Array.isArray(source) ? source : [source];
  const normalized = [];
  raw.forEach((item) => {
    try {
      const url = new URL(String(item || ''));
      if (url.protocol !== 'https:') {
        return;
      }
      if (!trustedOriginSet.has(url.origin)) {
        return;
      }
      const href = url.toString();
      if (normalized.indexOf(href) >= 0) {
        return;
      }
      normalized.push(href);
    } catch (_error) {
      // ignore invalid url entries
    }
  });
  return normalized;
};

const normalizeLibraryEntry = (entry, trustedOriginSet) => {
  if (!isPlainObject(entry)) {
    return null;
  }
  const globalName = normalizeGlobalName(entry.global);
  if (!globalName) {
    return null;
  }
  const urls = normalizeUrls(entry.urls, trustedOriginSet);
  if (urls.length === 0) {
    return null;
  }
  return Object.freeze({
    global: globalName,
    urls: Object.freeze(urls)
  });
};

const resolvePluginConfig = (viewer, pluginName) => {
  if (!viewer || !viewer.option || !isPlainObject(viewer.option.plugins)) {
    return {};
  }
  const pluginConfig = viewer.option.plugins[pluginName];
  return isPlainObject(pluginConfig) ? pluginConfig : {};
};

const resolveSandboxLibraryConfig = ({ viewer, pluginName, defaultRegistry }) => {
  const pluginConfig = resolvePluginConfig(viewer, pluginName);
  const trustedOrigins = normalizeTrustedOrigins(pluginConfig.trustedOrigins);
  const trustedOriginSet = new Set(trustedOrigins);

  const mergedRegistry = {};
  const defaults = isPlainObject(defaultRegistry) ? defaultRegistry : {};
  Object.keys(defaults).forEach((rawName) => {
    const name = normalizeLibraryName(rawName);
    if (!name) {
      return;
    }
    const entry = normalizeLibraryEntry(defaults[rawName], trustedOriginSet);
    if (!entry) {
      return;
    }
    mergedRegistry[name] = entry;
  });

  if (isPlainObject(pluginConfig.libraries)) {
    Object.keys(pluginConfig.libraries).forEach((rawName) => {
      const name = normalizeLibraryName(rawName);
      if (!name) {
        return;
      }
      const entry = normalizeLibraryEntry(pluginConfig.libraries[rawName], trustedOriginSet);
      if (!entry) {
        return;
      }
      mergedRegistry[name] = entry;
    });
  }

  let allowed = Object.keys(mergedRegistry);
  if (Array.isArray(pluginConfig.allowList) && pluginConfig.allowList.length > 0) {
    allowed = pluginConfig.allowList
      .map(normalizeLibraryName)
      .filter(Boolean)
      .filter((name, index, self) => self.indexOf(name) === index);
  }

  const registry = {};
  allowed.forEach((name) => {
    if (mergedRegistry[name]) {
      registry[name] = mergedRegistry[name];
    }
  });

  return {
    registry: registry,
    trustedOrigins: trustedOrigins
  };
};

const parseRequestedLibraries = (code, availableRegistry) => {
  const source = String(code || '');
  const match = source.match(/^\s*\/\/\s*libs?\s*:\s*([^\r\n]+)/im);
  if (!match || !match[1]) {
    return [];
  }
  const available = new Set(Object.keys(isPlainObject(availableRegistry) ? availableRegistry : {}));
  const tokens = match[1]
    .split(',')
    .map((item) => normalizeLibraryName(item))
    .filter(Boolean);
  const requested = [];
  tokens.forEach((name) => {
    if (!available.has(name)) {
      return;
    }
    if (requested.indexOf(name) >= 0) {
      return;
    }
    requested.push(name);
  });
  return requested;
};

export { resolveSandboxLibraryConfig, parseRequestedLibraries, DEFAULT_TRUSTED_ORIGINS };
