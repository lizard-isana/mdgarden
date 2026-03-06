const AUTO_INDEXER_SCHEMA_VERSION = 1;
const AUTO_INDEXER_VERSION = "1.0";
const DEFAULT_DB_PREFIX = "mdgarden_auto_indexer";
const DEFAULT_SITEMAP_PATH = "sitemap.json";
const DEFAULT_FILE_NAME = "sitemap.json";
const DEFAULT_PBKDF2_ITERATIONS = 210000;
const STARTUP_STATES = Object.freeze({
  NORMAL: "normal",
  INIT_REQUIRED: "init-required",
  RECOVERY_REQUIRED: "recovery-required",
  ERROR: "error"
});
const RUNTIME_MODES = Object.freeze({
  READER: "reader",
  AUTHOR: "author"
});
const LIMITS = Object.freeze({
  MAX_PAGES: 5000,
  MAX_URL_LENGTH: 1024,
  MAX_TITLE_LENGTH: 256,
  MAX_LINKS_PER_PAGE: 512
});
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const REQUIRED_CONTENT_EVENTS = new Set(["content_loaded", "content_reloaded"]);
const REQUIRED_INCLUDE_MODE = "include-only";
const KEY_OWNER_HASH = "ownerHash";
const KEY_SALT = "salt";
const KEY_SCHEMA_VERSION = "schemaVersion";
const KEY_REVISION = "revision";
const KEY_LAST_SAVED_AT = "lastSavedAt";
const KEY_FILE_HANDLE = "fileHandle";
const KEY_RUNTIME_OVERRIDE = "runtimeOverride";
const KEY_DIRTY = "dirty";
const KEY_LAST_ERROR = "lastError";
const AUTO_INDEXER_AUTHOR_PANEL_TAG = "mdg-author";
const AUTO_INDEXER_PAGE_LIST_TAG = "mdg-auto-indexer-page-list";
const AUTO_INDEXER_BACKLINK_LIST_TAG = "mdg-auto-indexer-backlinks";
const AUTO_INDEXER_STATE_EVENT = "mdgarden:auto-indexer-state";
const AUTO_INDEXER_SITEMAP_EVENT = "mdgarden:auto-indexer-sitemap";
const AUTO_INDEXER_DEFAULT_VIEWER_ID = "main";
const AUTO_INDEXER_EMBED_PAGE_LIST_CLASS = "auto-indexer-page-list";
const AUTO_INDEXER_EMBED_BACKLINK_LIST_CLASS = "auto-indexer-backlinks";

const isObject = (value) => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const isElementNode = (value) => {
  return !!value && typeof value === "object" && value.nodeType === 1;
};

const boolFrom = (value, fallback = false) => {
  if (value === true || value === "true") {
    return true;
  }
  if (value === false || value === "false") {
    return false;
  }
  return fallback;
};

const optionalBoolFrom = (value) => {
  if (value === true || value === "true") {
    return true;
  }
  if (value === false || value === "false") {
    return false;
  }
  return undefined;
};

const nowIso = () => {
  return new Date().toISOString();
};

const toPositiveInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return Math.floor(n);
};

const toTrimmedString = (value, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
};

const normalizeContentHash = (value) => {
  const hash = toTrimmedString(String(value || ""), "").toLowerCase();
  return /^[a-f0-9]{64}$/.test(hash) ? hash : "";
};

const normalizeDbName = (prefix, viewId) => {
  const normalizedPrefix = toTrimmedString(prefix, DEFAULT_DB_PREFIX).replace(/[^a-zA-Z0-9_-]/g, "_");
  const normalizedViewId = toTrimmedString(viewId, "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${normalizedPrefix}_${normalizedViewId}`;
};

const normalizeAutoIndexerOption = (rawOption, viewId) => {
  const option = isObject(rawOption) ? rawOption : {};
  const mode = toTrimmedString(option.mode, REQUIRED_INCLUDE_MODE);
  return {
    enabled: boolFrom(option.enabled, false),
    strict: boolFrom(option.strict, true),
    mode: mode === REQUIRED_INCLUDE_MODE ? REQUIRED_INCLUDE_MODE : REQUIRED_INCLUDE_MODE,
    sitemapPath: toTrimmedString(option.sitemap_path || option.sitemapPath, DEFAULT_SITEMAP_PATH) || DEFAULT_SITEMAP_PATH,
    dbName: normalizeDbName(option.db_prefix || option.dbPrefix || DEFAULT_DB_PREFIX, viewId),
    pbkdf2Iterations: toPositiveInt(option.pbkdf2_iterations || option.pbkdf2Iterations, DEFAULT_PBKDF2_ITERATIONS)
  };
};

const normalizeLocalEditorOption = (rawOption) => {
  const option = isObject(rawOption) ? rawOption : {};
  const autoReloadRaw = option.auto_reload !== undefined
    ? option.auto_reload
    : (option.autoReload !== undefined
      ? option.autoReload
      : (option.reload_after_save !== undefined ? option.reload_after_save : option.reloadAfterSave));
  const autoReload = boolFrom(autoReloadRaw, true);
  return {
    enabled: boolFrom(option.enabled, false),
    autoReload: autoReload,
    // Backward-compatible alias for older configs/API callers.
    reloadAfterSave: autoReload
  };
};

const normalizeInlineExportOption = (rawOption) => {
  const option = isObject(rawOption) ? rawOption : {};
  return {
    enabled: boolFrom(option.enabled, true),
    fileName: toTrimmedString(option.file_name || option.fileName, "offline-wiki.html") || "offline-wiki.html",
    queryParam: toTrimmedString(option.query_param || option.queryParam, "page") || "page",
    defaultPage: toTrimmedString(option.default_page || option.defaultPage, ""),
    viewerId: toTrimmedString(option.viewer_id || option.viewerId, "")
  };
};

const resolveAuthorModeSettings = (viewerOption) => {
  const option = isObject(viewerOption) ? viewerOption : {};
  const authorMode = isObject(option.author_mode) ? option.author_mode : null;
  const authorModeEnabled = authorMode
    ? boolFrom(authorMode.enabled, false)
    : true;
  return {
    enabled: authorModeEnabled,
    deploy: authorMode && authorMode.deploy !== undefined ? authorMode.deploy : option.deploy,
    autoIndexerOption: authorMode && isObject(authorMode.auto_indexer)
      ? authorMode.auto_indexer
      : option.auto_indexer,
    localEditorOption: authorMode && isObject(authorMode.local_editor)
      ? authorMode.local_editor
      : option.local_editor,
    inlineExportOption: authorMode && isObject(authorMode.offline_export)
      ? authorMode.offline_export
      : (authorMode && isObject(authorMode.inline_export)
        ? authorMode.inline_export
        : (isObject(option.offline_export) ? option.offline_export : option.inline_export))
  };
};

const normalizeRuntimeOverrideOption = (rawOption) => {
  const option = isObject(rawOption) ? rawOption : {};
  const localEditor = isObject(option.local_editor) ? option.local_editor : {};
  const offlineExport = isObject(option.offline_export)
    ? option.offline_export
    : (isObject(option.inline_export) ? option.inline_export : {});
  const autoIndexer = isObject(option.auto_indexer) ? option.auto_indexer : {};
  const fileNameValue = toTrimmedString(offlineExport.file_name || offlineExport.fileName, "");
  const queryParamValue = toTrimmedString(offlineExport.query_param || offlineExport.queryParam, "");
  const defaultPageValue = toTrimmedString(offlineExport.default_page || offlineExport.defaultPage, "");
  const viewerIdValue = toTrimmedString(offlineExport.viewer_id || offlineExport.viewerId, "");
  return {
    auto_indexer: {
      strict: optionalBoolFrom(autoIndexer.strict)
    },
    local_editor: {
      enabled: optionalBoolFrom(localEditor.enabled),
      auto_reload: optionalBoolFrom(
        localEditor.auto_reload !== undefined
          ? localEditor.auto_reload
          : (localEditor.autoReload !== undefined
            ? localEditor.autoReload
            : (localEditor.reload_after_save !== undefined ? localEditor.reload_after_save : localEditor.reloadAfterSave))
      )
    },
    offline_export: {
      enabled: optionalBoolFrom(offlineExport.enabled),
      file_name: fileNameValue || undefined,
      query_param: queryParamValue || undefined,
      default_page: defaultPageValue || undefined,
      viewer_id: viewerIdValue || undefined
    }
  };
};

const hasRuntimeOverrideValue = (option) => {
  const normalized = normalizeRuntimeOverrideOption(option);
  const autoIndexer = normalized.auto_indexer || {};
  const localEditor = normalized.local_editor || {};
  const offlineExport = normalized.offline_export || {};
  return autoIndexer.strict !== undefined ||
    localEditor.enabled !== undefined ||
    localEditor.auto_reload !== undefined ||
    offlineExport.enabled !== undefined ||
    !!offlineExport.file_name ||
    !!offlineExport.query_param ||
    !!offlineExport.default_page ||
    !!offlineExport.viewer_id;
};

const buildEffectiveRuntimeSettings = (runtime) => {
  return {
    auto_indexer: {
      strict: runtime.option && runtime.option.strict === true
    },
    local_editor: {
      enabled: runtime.localEditorOption && runtime.localEditorOption.enabled === true,
      auto_reload: runtime.localEditorOption && runtime.localEditorOption.autoReload === true
    },
    offline_export: {
      enabled: runtime.inlineExportOption && runtime.inlineExportOption.enabled === true,
      file_name: runtime.inlineExportOption && runtime.inlineExportOption.fileName ? runtime.inlineExportOption.fileName : "offline-wiki.html",
      query_param: runtime.inlineExportOption && runtime.inlineExportOption.queryParam ? runtime.inlineExportOption.queryParam : "page",
      default_page: runtime.inlineExportOption && runtime.inlineExportOption.defaultPage ? runtime.inlineExportOption.defaultPage : "",
      viewer_id: runtime.inlineExportOption && runtime.inlineExportOption.viewerId ? runtime.inlineExportOption.viewerId : ""
    }
  };
};

const buildRuntimeSettingsState = (runtime) => {
  const override = normalizeRuntimeOverrideOption(runtime ? runtime.runtimeOverrideOption : null);
  return {
    hasOverride: hasRuntimeOverrideValue(override),
    effective: runtime ? buildEffectiveRuntimeSettings(runtime) : null,
    override: override
  };
};

const applyRuntimeOverrideOption = (runtime) => {
  if (!runtime) {
    return;
  }
  const baseOption = isObject(runtime.baseAutoIndexerOption) ? runtime.baseAutoIndexerOption : normalizeAutoIndexerOption({}, "main");
  const baseLocalEditor = isObject(runtime.baseLocalEditorOption) ? runtime.baseLocalEditorOption : normalizeLocalEditorOption({});
  const baseOfflineExport = isObject(runtime.baseInlineExportOption) ? runtime.baseInlineExportOption : normalizeInlineExportOption({});
  const override = normalizeRuntimeOverrideOption(runtime.runtimeOverrideOption);

  runtime.option = {
    ...baseOption
  };
  runtime.localEditorOption = {
    ...baseLocalEditor
  };
  runtime.inlineExportOption = {
    ...baseOfflineExport
  };

  if (override.auto_indexer.strict !== undefined) {
    runtime.option.strict = override.auto_indexer.strict === true;
  }
  if (override.local_editor.enabled !== undefined) {
    runtime.localEditorOption.enabled = override.local_editor.enabled === true;
  }
  if (override.local_editor.auto_reload !== undefined) {
    const autoReload = override.local_editor.auto_reload === true;
    runtime.localEditorOption.autoReload = autoReload;
    runtime.localEditorOption.reloadAfterSave = autoReload;
  }
  if (override.offline_export.enabled !== undefined) {
    runtime.inlineExportOption.enabled = override.offline_export.enabled === true;
  }
  if (override.offline_export.file_name !== undefined) {
    runtime.inlineExportOption.fileName = toTrimmedString(override.offline_export.file_name, runtime.inlineExportOption.fileName) || runtime.inlineExportOption.fileName;
  }
  if (override.offline_export.query_param !== undefined) {
    runtime.inlineExportOption.queryParam = normalizeInlineExportQueryParam(override.offline_export.query_param);
  }
  if (override.offline_export.default_page !== undefined) {
    runtime.inlineExportOption.defaultPage = toTrimmedString(override.offline_export.default_page, "");
  }
  if (override.offline_export.viewer_id !== undefined) {
    runtime.inlineExportOption.viewerId = toTrimmedString(override.offline_export.viewer_id, "");
  }

  if (runtime.authorModeEnabled !== true) {
    runtime.option.enabled = false;
    runtime.localEditorOption.enabled = false;
    runtime.inlineExportOption.enabled = false;
  }
};

const snapshotRuntimeBaseOption = (runtime) => {
  if (!runtime) {
    return {
      authorModeEnabled: false,
      option: normalizeAutoIndexerOption({}, "main"),
      localEditorOption: normalizeLocalEditorOption({}),
      inlineExportOption: normalizeInlineExportOption({}),
      deployEntriesJson: "[]"
    };
  }
  return {
    authorModeEnabled: runtime.authorModeEnabled === true,
    option: {
      ...(isObject(runtime.baseAutoIndexerOption)
        ? runtime.baseAutoIndexerOption
        : normalizeAutoIndexerOption({}, "main"))
    },
    localEditorOption: {
      ...(isObject(runtime.baseLocalEditorOption)
        ? runtime.baseLocalEditorOption
        : normalizeLocalEditorOption({}))
    },
    inlineExportOption: {
      ...(isObject(runtime.baseInlineExportOption)
        ? runtime.baseInlineExportOption
        : normalizeInlineExportOption({}))
    },
    deployEntriesJson: JSON.stringify(runtime.deployConfig && runtime.deployConfig.entries ? runtime.deployConfig.entries : [])
  };
};

const safeParseUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
};

const normalizeDeployEntries = (deploy) => {
  const input = Array.isArray(deploy) ? deploy : (typeof deploy === "string" ? [deploy] : []);
  const entries = [];
  input.forEach((item) => {
    const parsed = safeParseUrl(String(item || ""));
    if (!parsed || !parsed.origin) {
      return;
    }
    let path = parsed.pathname || "/";
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    entries.push({
      origin: parsed.origin,
      pathname: path
    });
  });
  return {
    valid: entries.length > 0,
    entries: entries
  };
};

const isPathWithinBase = (pathname, basePathname) => {
  const path = String(pathname || "/");
  let base = String(basePathname || "/");
  if (!base.startsWith("/")) {
    base = `/${base}`;
  }
  if (base === "/") {
    return true;
  }
  if (path === base) {
    return true;
  }
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return path.startsWith(normalizedBase);
};

const isProductionMatch = (currentUrl, deployConfig) => {
  if (!currentUrl || !deployConfig || deployConfig.valid !== true) {
    return false;
  }
  return deployConfig.entries.some((entry) => {
    return currentUrl.origin === entry.origin && isPathWithinBase(currentUrl.pathname, entry.pathname);
  });
};

const isLocalEnvironment = (currentUrl) => {
  if (!currentUrl) {
    return false;
  }
  if (currentUrl.protocol === "file:") {
    return true;
  }
  return LOCAL_HOSTS.has(currentUrl.hostname);
};

const canInitializeOwnerInCurrentEnvironment = (runtime, currentUrl = null) => {
  const url = currentUrl || safeParseUrl(typeof window !== "undefined" ? window.location.href : "");
  if (!runtime || !runtime.option || runtime.option.enabled !== true) {
    return false;
  }
  if (!url || !isLocalEnvironment(url)) {
    return false;
  }
  if (isProductionMatch(url, runtime.deployConfig)) {
    return false;
  }
  return true;
};

const isValidNormalizedPath = (value) => {
  if (typeof value !== "string") {
    return false;
  }
  const path = value.trim();
  if (!path || path.length > LIMITS.MAX_URL_LENGTH) {
    return false;
  }
  if (path.startsWith("/") || path.includes("..") || path.includes("?") || path.includes("#") || path.includes("\0")) {
    return false;
  }
  if (!path.toLowerCase().endsWith(".md")) {
    return false;
  }
  return /^([a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+\.md$/.test(path);
};

const normalizePathCandidate = (viewer, path, baseDocPath = "") => {
  const raw = toTrimmedString(path, "");
  if (!raw) {
    return null;
  }
  if (viewer && typeof viewer.ResolveMarkdownTarget === "function") {
    const normalized = viewer.ResolveMarkdownTarget(raw, baseDocPath || "");
    if (!normalized || !isValidNormalizedPath(normalized)) {
      return null;
    }
    return normalized;
  }
  return isValidNormalizedPath(raw) ? raw : null;
};

const sanitizeTitle = (title) => {
  const safe = toTrimmedString(String(title == null ? "" : title), "");
  if (!safe) {
    return "Untitled";
  }
  return safe.slice(0, LIMITS.MAX_TITLE_LENGTH);
};

const extractRenderedTitle = (root) => {
  if (!isElementNode(root)) {
    return "";
  }
  const h1 = root.querySelector("h1");
  return h1 ? toTrimmedString(h1.textContent || "", "") : "";
};

const parseFrontmatter = (context) => {
  if (!context || !isObject(context.frontmatter)) {
    return null;
  }
  return context.frontmatter;
};

const getEpoch = (value) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  return parsed;
};

const toRfc3339InputString = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  return "";
};

const normalizeRfc3339ToUtc = (value) => {
  const source = toRfc3339InputString(value);
  if (!source) {
    return "";
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(source)) {
    return "";
  }
  const parsed = Date.parse(source);
  if (!Number.isFinite(parsed)) {
    return "";
  }
  return new Date(parsed).toISOString();
};

const normalizeUtcIsoOrNow = (value) => {
  const normalized = normalizeRfc3339ToUtc(value);
  return normalized || nowIso();
};

const sortStringArray = (items) => {
  return [...items].sort((a, b) => a.localeCompare(b));
};

const normalizeInlineExportQueryParam = (value) => {
  if (typeof value !== "string") {
    return "page";
  }
  const next = value.trim();
  if (!next) {
    return "page";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(next)) {
    return "page";
  }
  return next;
};

const escapeHtmlAttribute = (value) => {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const escapeTemplateText = (value) => {
  return String(value == null ? "" : value).replace(/<\/template/gi, "<\\/template");
};

const toInlineWikiHref = (queryParam, normalizedPath) => {
  return `?${queryParam}=${encodeURIComponent(normalizedPath)}`;
};

const parseMarkdownDestination = (rawDestination) => {
  const raw = String(rawDestination == null ? "" : rawDestination).trim();
  if (!raw) {
    return null;
  }
  if (raw.startsWith("<")) {
    const end = raw.indexOf(">");
    if (end <= 1) {
      return null;
    }
    return {
      destination: raw.slice(1, end).trim(),
      suffix: raw.slice(end + 1)
    };
  }
  const matched = raw.match(/^(\S+)([\s\S]*)$/);
  if (!matched) {
    return null;
  }
  return {
    destination: matched[1],
    suffix: matched[2] || ""
  };
};

const parseEmbedAttributes = (rawText) => {
  const attrs = {};
  const text = String(rawText == null ? "" : rawText);
  const pattern = /([a-zA-Z0-9_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'}]+))/g;
  let matched;
  while ((matched = pattern.exec(text)) !== null) {
    const key = String(matched[1] || "").trim();
    if (!key) {
      continue;
    }
    const value = matched[3] != null
      ? matched[3]
      : (matched[4] != null ? matched[4] : (matched[5] != null ? matched[5] : ""));
    attrs[key] = value;
  }
  return attrs;
};

const parseSortKeys = (raw, fallback = []) => {
  const source = toTrimmedString(raw, "");
  if (!source) {
    return fallback;
  }
  const keys = source.split(",").map((item) => item.trim()).filter(Boolean);
  return keys.length > 0 ? keys : fallback;
};

const parseSortOrder = (raw, fallback = "desc") => {
  const lowered = toTrimmedString(raw, fallback).toLowerCase();
  return lowered === "asc" ? "asc" : "desc";
};

const parseSortType = (raw, fallback = "auto") => {
  const lowered = toTrimmedString(raw, fallback).toLowerCase();
  if (lowered === "date" || lowered === "number" || lowered === "string") {
    return lowered;
  }
  return "auto";
};

const resolveSortOption = (attrs, defaults) => {
  const safeDefaults = isObject(defaults) ? defaults : {};
  const baseKeys = Array.isArray(safeDefaults.sortKeys) ? safeDefaults.sortKeys : [];
  const baseOrder = toTrimmedString(safeDefaults.sortOrder, "desc") || "desc";
  const baseType = toTrimmedString(safeDefaults.sortType, "auto") || "auto";
  return {
    sortKeys: parseSortKeys(attrs["sort-key"], baseKeys),
    sortOrder: parseSortOrder(attrs["sort-order"], baseOrder),
    sortType: parseSortType(attrs["sort-type"], baseType)
  };
};

const resolveExportFieldValue = (record, path, pagePath) => {
  if (path === "path" || path === "url") {
    return pagePath;
  }
  const parts = String(path || "").split(".").map((item) => item.trim()).filter(Boolean);
  let cursor = record;
  for (const part of parts) {
    if (!isObject(cursor) || !(part in cursor)) {
      return undefined;
    }
    cursor = cursor[part];
  }
  return cursor;
};

const normalizeExportSortValue = (value, key, sortType) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : "";
  }
  if (value == null) {
    return "";
  }
  if (sortType === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
  }
  if (sortType === "date") {
    const time = Date.parse(String(value));
    return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
  }
  if (sortType === "string") {
    return String(value);
  }
  const loweredKey = String(key || "").toLowerCase();
  if (loweredKey.includes("date") || loweredKey.includes("modified") || loweredKey.endsWith("at")) {
    const time = Date.parse(String(value));
    if (Number.isFinite(time)) {
      return time;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return String(value);
};

const compareExportSortValues = (left, right) => {
  if (typeof left === "number" && typeof right === "number") {
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  }
  return String(left).localeCompare(String(right));
};

const sortExportEntries = (entries, sortOption) => {
  const safeOption = isObject(sortOption) ? sortOption : {};
  const sortKeys = Array.isArray(safeOption.sortKeys) && safeOption.sortKeys.length > 0
    ? safeOption.sortKeys
    : ["path"];
  const sortOrder = parseSortOrder(safeOption.sortOrder, "desc");
  const sortType = parseSortType(safeOption.sortType, "auto");
  const direction = sortOrder === "asc" ? 1 : -1;
  const copied = Array.isArray(entries) ? [...entries] : [];
  copied.sort((a, b) => {
    for (const key of sortKeys) {
      const rawA = resolveExportFieldValue(a.record, key, a.path);
      const rawB = resolveExportFieldValue(b.record, key, b.path);
      const valueA = normalizeExportSortValue(rawA, key, sortType);
      const valueB = normalizeExportSortValue(rawB, key, sortType);
      const compared = compareExportSortValues(valueA, valueB);
      if (compared !== 0) {
        return compared * direction;
      }
    }
    return a.path.localeCompare(b.path);
  });
  return copied;
};

const resolveBacklinkPathsForExport = (pagesObject, targetPath) => {
  const pages = isObject(pagesObject) ? pagesObject : {};
  const target = toTrimmedString(targetPath, "");
  if (!target) {
    return [];
  }
  const paths = new Set();
  const targetRecord = isObject(pages[target]) ? pages[target] : null;
  if (targetRecord && Array.isArray(targetRecord.backlinks)) {
    targetRecord.backlinks.forEach((item) => {
      const path = toTrimmedString(String(item || ""), "");
      if (path && path !== target && isObject(pages[path])) {
        paths.add(path);
      }
    });
  }
  Object.keys(pages).forEach((path) => {
    if (path === target) {
      return;
    }
    const record = isObject(pages[path]) ? pages[path] : {};
    const links = Array.isArray(record.links) ? record.links : [];
    if (links.indexOf(target) >= 0) {
      paths.add(path);
    }
  });
  return [...paths];
};

const renderInlineListEntries = (entries, queryParam, emptyLabel) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return `- ${emptyLabel}`;
  }
  return entries.map((entry) => {
    const path = toTrimmedString(entry.path, "");
    const record = isObject(entry.record) ? entry.record : {};
    const title = toTrimmedString(record.title, "") || path;
    return `- [${title}](${toInlineWikiHref(queryParam, path)})`;
  }).join("\n");
};

const expandInlineWikiEmbedLine = (line, pagesObject, currentPath, queryParam) => {
  const source = String(line == null ? "" : line);
  const pageListMatched = source.match(/^\s*.*\{\.auto-indexer-page-list([^}]*)\}\s*$/);
  if (pageListMatched) {
    const attrs = parseEmbedAttributes(pageListMatched[1]);
    const sortOption = resolveSortOption(attrs, {
      sortKeys: ["lastModified"],
      sortOrder: "desc",
      sortType: "auto"
    });
    const pages = isObject(pagesObject) ? pagesObject : {};
    const entries = sortExportEntries(
      Object.keys(pages).map((path) => {
        return {
          path: path,
          record: isObject(pages[path]) ? pages[path] : {}
        };
      }),
      sortOption
    );
    return renderInlineListEntries(
      entries,
      queryParam,
      toTrimmedString(attrs["empty-label"], "No pages in sitemap.")
    );
  }

  const backlinksMatched = source.match(/^\s*.*\{\.auto-indexer-backlinks([^}]*)\}\s*$/);
  if (backlinksMatched) {
    const attrs = parseEmbedAttributes(backlinksMatched[1]);
    const sortOption = resolveSortOption(attrs, {
      sortKeys: ["lastModified", "path"],
      sortOrder: "desc",
      sortType: "auto"
    });
    const pages = isObject(pagesObject) ? pagesObject : {};
    const targetPath = toTrimmedString(currentPath, "");
    const backlinkPaths = resolveBacklinkPathsForExport(pages, targetPath);
    const entries = sortExportEntries(
      backlinkPaths.map((path) => {
        return {
          path: path,
          record: isObject(pages[path]) ? pages[path] : {}
        };
      }),
      sortOption
    );
    return renderInlineListEntries(
      entries,
      queryParam,
      toTrimmedString(attrs["empty-label"], "No backlinks.")
    );
  }

  return source;
};

const rewriteMarkdownLineForInlineWiki = (runtime, line, baseDocPath, queryParam) => {
  const viewer = runtime && runtime.viewer ? runtime.viewer : null;
  if (!viewer || typeof line !== "string" || line.length === 0) {
    return line;
  }

  let rewritten = line.replace(/(!?\[[^\]]*\])\(([^)]+)\)/g, (full, label, rawDestination) => {
    const parsed = parseMarkdownDestination(rawDestination);
    if (!parsed || !parsed.destination) {
      return full;
    }
    const normalized = normalizePathCandidate(viewer, parsed.destination, baseDocPath);
    if (!normalized) {
      return full;
    }
    const href = toInlineWikiHref(queryParam, normalized);
    return `${label}(${href}${parsed.suffix})`;
  });

  rewritten = rewritten.replace(/(\bhref\s*=\s*)(["'])(.*?)\2/gi, (full, prefix, quote, href) => {
    const normalized = normalizePathCandidate(viewer, href, baseDocPath);
    if (!normalized) {
      return full;
    }
    const inlineHref = toInlineWikiHref(queryParam, normalized);
    return `${prefix}${quote}${inlineHref}${quote}`;
  });

  return rewritten;
};

const rewriteMarkdownLinksForInlineWiki = (runtime, markdown, baseDocPath, queryParam, pagesObject = null) => {
  const source = String(markdown == null ? "" : markdown);
  const lines = source.split("\n");
  let inFence = false;
  let fenceChar = "";
  let fenceLength = 0;

  const rewritten = lines.map((line) => {
    const fenceMatched = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatched) {
      const marker = fenceMatched[1];
      const markerChar = marker.charAt(0);
      const markerLength = marker.length;
      if (!inFence) {
        inFence = true;
        fenceChar = markerChar;
        fenceLength = markerLength;
      } else if (fenceChar === markerChar && markerLength >= fenceLength) {
        inFence = false;
      }
      return line;
    }
    if (inFence) {
      return line;
    }
    const expanded = expandInlineWikiEmbedLine(line, pagesObject, baseDocPath, queryParam);
    return rewriteMarkdownLineForInlineWiki(runtime, expanded, baseDocPath, queryParam);
  });

  return rewritten.join("\n");
};

const resolvePayloadRoot = (payload) => {
  if (isElementNode(payload)) {
    return payload;
  }
  if (payload && isElementNode(payload.target)) {
    return payload.target;
  }
  return null;
};

const resolvePayloadContext = (payload) => {
  if (payload && isObject(payload.context)) {
    return payload.context;
  }
  return {};
};

const getDocumentRoot = () => {
  if (typeof document === "undefined" || !document.documentElement) {
    return null;
  }
  return document.documentElement;
};

const buildRuntimeStateDetail = (runtime) => {
  const canInitializeOwner = runtime && runtime.canInitializeOwner === true;
  const localEditorEnabled = runtime && runtime.localEditorOption && runtime.localEditorOption.enabled === true;
  const localEditorReady = runtime && runtime.localEditorReady === true;
  const inlineExportEnabled = runtime && runtime.inlineExportOption && runtime.inlineExportOption.enabled === true;
  const inlineExportReady = runtime && runtime.inlineExportReady === true;
  const runtimeSettings = buildRuntimeSettingsState(runtime);
  const currentMarkdownPath = runtime ? toTrimmedString(runtime.currentMarkdownPath, "") : "";
  return {
    mode: runtime && runtime.mode ? runtime.mode : RUNTIME_MODES.READER,
    startupState: runtime && runtime.startupState ? runtime.startupState : STARTUP_STATES.NORMAL,
    dirty: runtime && runtime.dirty === true,
    ownerReady: true,
    canInitializeOwner: canInitializeOwner,
    lastError: runtime && runtime.lastError ? runtime.lastError : "",
    localEditorEnabled: localEditorEnabled,
    localEditorReady: localEditorReady,
    inlineExportEnabled: inlineExportEnabled,
    inlineExportReady: inlineExportReady,
    runtimeSettings: runtimeSettings,
    currentMarkdownPath: currentMarkdownPath
  };
};

const cloneSitemapDocument = (documentData) => {
  if (!isObject(documentData)) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(documentData));
  } catch (error) {
    return null;
  }
};

const dispatchSitemapEvent = (runtime, source = "") => {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent !== "function") {
    return;
  }
  const documentData = cloneSitemapDocument(runtime && runtime.sitemapDocument ? runtime.sitemapDocument : null);
  const pageCount = documentData && isObject(documentData.pages) ? Object.keys(documentData.pages).length : 0;
  window.dispatchEvent(new CustomEvent(AUTO_INDEXER_SITEMAP_EVENT, {
    detail: {
      source: toTrimmedString(source, ""),
      startupState: runtime && runtime.startupState ? runtime.startupState : STARTUP_STATES.NORMAL,
      pageCount: pageCount,
      document: documentData
    }
  }));
};

const defineAutoIndexerAuthorPanelElement = () => {
  if (typeof window === "undefined" || typeof HTMLElement !== "function" || !window.customElements) {
    return;
  }
  if (window.customElements.get(AUTO_INDEXER_AUTHOR_PANEL_TAG)) {
    return;
  }

  class AutoIndexerAuthorPanelElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.onRefreshClick = this.onRefreshClick.bind(this);
      this.onInitializeClick = this.onInitializeClick.bind(this);
      this.onSaveClick = this.onSaveClick.bind(this);
      this.onExportInlineClick = this.onExportInlineClick.bind(this);
      this.onEditClick = this.onEditClick.bind(this);
      this.onEditorSaveClick = this.onEditorSaveClick.bind(this);
      this.onEditorCloseClick = this.onEditorCloseClick.bind(this);
      this.onSettingsClick = this.onSettingsClick.bind(this);
      this.onSettingsApplyClick = this.onSettingsApplyClick.bind(this);
      this.onSettingsResetClick = this.onSettingsResetClick.bind(this);
      this.onGlobalStateChange = this.onGlobalStateChange.bind(this);
      this.onboardingNoticeShown = false;
      this.postInitializePendingSave = false;
      this.editorVisible = false;
      this.editorPath = "";
    }

    connectedCallback() {
      this.render();
      this.bindElements();
      this.bindEvents();
      this.setEditorVisible(false);
      this.applyModeHint(buildRuntimeStateDetail(null));
      this.renderStatus("initial");
    }

    disconnectedCallback() {
      if (this.refreshButton) {
        this.refreshButton.removeEventListener("click", this.onRefreshClick);
      }
      if (this.initializeButton) {
        this.initializeButton.removeEventListener("click", this.onInitializeClick);
      }
      if (this.saveButton) {
        this.saveButton.removeEventListener("click", this.onSaveClick);
      }
      if (this.exportInlineButton) {
        this.exportInlineButton.removeEventListener("click", this.onExportInlineClick);
      }
      if (this.editButton) {
        this.editButton.removeEventListener("click", this.onEditClick);
      }
      if (this.editorSaveButton) {
        this.editorSaveButton.removeEventListener("click", this.onEditorSaveClick);
      }
      if (this.editorCloseButton) {
        this.editorCloseButton.removeEventListener("click", this.onEditorCloseClick);
      }
      if (this.settingsButton) {
        this.settingsButton.removeEventListener("click", this.onSettingsClick);
      }
      if (this.settingsApplyButton) {
        this.settingsApplyButton.removeEventListener("click", this.onSettingsApplyClick);
      }
      if (this.settingsResetButton) {
        this.settingsResetButton.removeEventListener("click", this.onSettingsResetClick);
      }
      window.removeEventListener(AUTO_INDEXER_STATE_EVENT, this.onGlobalStateChange);
      if (this.rootObserver) {
        this.rootObserver.disconnect();
        this.rootObserver = null;
      }
    }

    getViewerId() {
      const value = toTrimmedString(this.getAttribute("viewer-id") || this.getAttribute("viewer"), "");
      return value || AUTO_INDEXER_DEFAULT_VIEWER_ID;
    }

    getFileName() {
      return toTrimmedString(this.getAttribute("file-name"), DEFAULT_FILE_NAME) || DEFAULT_FILE_NAME;
    }

    isReaderVisible() {
      if (!this.hasAttribute("show-reader")) {
        return false;
      }
      return boolFrom(this.getAttribute("show-reader"), true);
    }

    isAutoHideEnabled() {
      if (!this.hasAttribute("auto-hide")) {
        return false;
      }
      return boolFrom(this.getAttribute("auto-hide"), true);
    }

    getApi() {
      const viewerId = this.getViewerId();
      if (!window.MDGarden || !window.MDGarden[viewerId]) {
        return null;
      }
      return window.MDGarden[viewerId].authorMode || window.MDGarden[viewerId].autoIndexer || null;
    }

    bindElements() {
      this.panelElement = this.shadowRoot.querySelector(".panel");
      this.metaElement = this.shadowRoot.querySelector('[data-part="meta"]');
      this.statusElement = this.shadowRoot.querySelector('[data-part="status"]');
      this.refreshButton = this.shadowRoot.querySelector('[data-action="refresh"]');
      this.initializeButton = this.shadowRoot.querySelector('[data-action="initialize"]');
      this.saveButton = this.shadowRoot.querySelector('[data-action="save"]');
      this.exportInlineButton = this.shadowRoot.querySelector('[data-action="export-inline"]');
      this.editButton = this.shadowRoot.querySelector('[data-action="edit"]');
      this.settingsButton = this.shadowRoot.querySelector('[data-action="settings"]');
      this.settingsDetails = this.shadowRoot.querySelector('[data-part="settings-details"]');
      this.settingsStrictInput = this.shadowRoot.querySelector('[data-field="auto-indexer-strict"]');
      this.settingsLocalEditorEnabledInput = this.shadowRoot.querySelector('[data-field="local-editor-enabled"]');
      this.settingsLocalEditorAutoReloadInput = this.shadowRoot.querySelector('[data-field="local-editor-auto-reload"]');
      this.settingsExportEnabledInput = this.shadowRoot.querySelector('[data-field="export-enabled"]');
      this.settingsExportFileNameInput = this.shadowRoot.querySelector('[data-field="export-file-name"]');
      this.settingsExportQueryParamInput = this.shadowRoot.querySelector('[data-field="export-query-param"]');
      this.settingsExportDefaultPageInput = this.shadowRoot.querySelector('[data-field="export-default-page"]');
      this.settingsExportViewerIdInput = this.shadowRoot.querySelector('[data-field="export-viewer-id"]');
      this.settingsApplyButton = this.shadowRoot.querySelector('[data-action="settings-apply"]');
      this.settingsResetButton = this.shadowRoot.querySelector('[data-action="settings-reset"]');
      this.setupHintElement = this.shadowRoot.querySelector('[data-part="setup-hint"]');
      this.editorPanelElement = this.shadowRoot.querySelector('[data-part="editor-panel"]');
      this.editorPathElement = this.shadowRoot.querySelector('[data-part="editor-path"]');
      this.editorTextarea = this.shadowRoot.querySelector('[data-part="editor-textarea"]');
      this.editorSaveButton = this.shadowRoot.querySelector('[data-action="editor-save"]');
      this.editorCloseButton = this.shadowRoot.querySelector('[data-action="editor-close"]');
      this.runtimeSettingFields = [
        this.settingsStrictInput,
        this.settingsLocalEditorEnabledInput,
        this.settingsLocalEditorAutoReloadInput,
        this.settingsExportEnabledInput,
        this.settingsExportFileNameInput,
        this.settingsExportQueryParamInput,
        this.settingsExportDefaultPageInput,
        this.settingsExportViewerIdInput,
        this.settingsApplyButton,
        this.settingsResetButton
      ].filter(Boolean);
    }

    bindEvents() {
      this.refreshButton.addEventListener("click", this.onRefreshClick);
      this.initializeButton.addEventListener("click", this.onInitializeClick);
      this.saveButton.addEventListener("click", this.onSaveClick);
      this.exportInlineButton.addEventListener("click", this.onExportInlineClick);
      this.editButton.addEventListener("click", this.onEditClick);
      this.editorSaveButton.addEventListener("click", this.onEditorSaveClick);
      this.editorCloseButton.addEventListener("click", this.onEditorCloseClick);
      this.settingsButton.addEventListener("click", this.onSettingsClick);
      this.settingsApplyButton.addEventListener("click", this.onSettingsApplyClick);
      this.settingsResetButton.addEventListener("click", this.onSettingsResetClick);
      window.addEventListener(AUTO_INDEXER_STATE_EVENT, this.onGlobalStateChange);
      const root = getDocumentRoot();
      if (root && typeof MutationObserver === "function") {
        this.rootObserver = new MutationObserver(this.onGlobalStateChange);
        this.rootObserver.observe(root, {
          attributes: true,
          attributeFilter: [
            "data-auto-indexer-mode",
            "data-auto-indexer-state",
            "data-auto-indexer-dirty",
            "data-local-editor-enabled",
            "data-local-editor-ready",
            "data-export-enabled",
            "data-export-ready",
            "data-current-path"
          ]
        });
      }
      this.settingsButton.setAttribute("aria-expanded", "false");
    }

    readDocumentState() {
      const state = buildRuntimeStateDetail(null);
      const root = getDocumentRoot();
      if (!root) {
        return state;
      }
      state.mode = toTrimmedString(root.dataset.autoIndexerMode, state.mode) || state.mode;
      state.startupState = toTrimmedString(root.dataset.autoIndexerState, state.startupState) || state.startupState;
      state.dirty = root.dataset.autoIndexerDirty === "true";
      state.localEditorEnabled = root.dataset.localEditorEnabled === "true";
      state.localEditorReady = root.dataset.localEditorReady === "true";
      state.inlineExportEnabled = root.dataset.exportEnabled === "true";
      state.inlineExportReady = root.dataset.exportReady === "true";
      state.currentMarkdownPath = toTrimmedString(root.dataset.currentPath, "");
      return state;
    }

    setRuntimeSettingsControlsEnabled(enabled) {
      const allowed = enabled === true;
      if (!Array.isArray(this.runtimeSettingFields)) {
        return;
      }
      this.runtimeSettingFields.forEach((field) => {
        field.disabled = !allowed;
      });
    }

    applyRuntimeSettingsForm(state) {
      const runtimeSettings = state && isObject(state.runtimeSettings) ? state.runtimeSettings : null;
      const effective = runtimeSettings && isObject(runtimeSettings.effective) ? runtimeSettings.effective : null;
      if (!effective) {
        return;
      }
      const autoIndexer = isObject(effective.auto_indexer) ? effective.auto_indexer : {};
      const localEditor = isObject(effective.local_editor) ? effective.local_editor : {};
      const offlineExport = isObject(effective.offline_export) ? effective.offline_export : {};
      if (this.settingsStrictInput) {
        this.settingsStrictInput.checked = autoIndexer.strict === true;
      }
      if (this.settingsLocalEditorEnabledInput) {
        this.settingsLocalEditorEnabledInput.checked = localEditor.enabled === true;
      }
      if (this.settingsLocalEditorAutoReloadInput) {
        this.settingsLocalEditorAutoReloadInput.checked = localEditor.auto_reload === true;
      }
      if (this.settingsExportEnabledInput) {
        this.settingsExportEnabledInput.checked = offlineExport.enabled === true;
      }
      if (this.settingsExportFileNameInput) {
        this.settingsExportFileNameInput.value = toTrimmedString(offlineExport.file_name, "offline-wiki.html") || "offline-wiki.html";
      }
      if (this.settingsExportQueryParamInput) {
        this.settingsExportQueryParamInput.value = toTrimmedString(offlineExport.query_param, "page") || "page";
      }
      if (this.settingsExportDefaultPageInput) {
        this.settingsExportDefaultPageInput.value = toTrimmedString(offlineExport.default_page, "");
      }
      if (this.settingsExportViewerIdInput) {
        this.settingsExportViewerIdInput.value = toTrimmedString(offlineExport.viewer_id, "");
      }
    }

    collectRuntimeSettingsForm() {
      const fileName = toTrimmedString(this.settingsExportFileNameInput ? this.settingsExportFileNameInput.value : "", "");
      const queryParam = toTrimmedString(this.settingsExportQueryParamInput ? this.settingsExportQueryParamInput.value : "", "");
      const defaultPage = toTrimmedString(this.settingsExportDefaultPageInput ? this.settingsExportDefaultPageInput.value : "", "");
      const viewerId = toTrimmedString(this.settingsExportViewerIdInput ? this.settingsExportViewerIdInput.value : "", "");
      return {
        auto_indexer: {
          strict: this.settingsStrictInput ? this.settingsStrictInput.checked === true : undefined
        },
        local_editor: {
          enabled: this.settingsLocalEditorEnabledInput ? this.settingsLocalEditorEnabledInput.checked === true : undefined,
          auto_reload: this.settingsLocalEditorAutoReloadInput ? this.settingsLocalEditorAutoReloadInput.checked === true : undefined
        },
        offline_export: {
          enabled: this.settingsExportEnabledInput ? this.settingsExportEnabledInput.checked === true : undefined,
          file_name: fileName || undefined,
          query_param: queryParam || undefined,
          default_page: defaultPage || undefined,
          viewer_id: viewerId || undefined
        }
      };
    }

    isOnboardingActive(state) {
      return false;
    }

    applyModeHint(state) {
      const safeState = isObject(state) ? state : buildRuntimeStateDetail(null);
      const mode = toTrimmedString(safeState.mode, RUNTIME_MODES.READER) || RUNTIME_MODES.READER;
      const startupState = toTrimmedString(safeState.startupState, STARTUP_STATES.NORMAL) || STARTUP_STATES.NORMAL;
      const dirty = safeState.dirty === true;
      const onboardingActive = this.isOnboardingActive(safeState);
      const lastError = toTrimmedString(safeState.lastError, "");
      const shortError = lastError.length > 60 ? `${lastError.slice(0, 60)}...` : lastError;
      const isAuthor = mode === RUNTIME_MODES.AUTHOR;
      const localEditorEnabled = safeState.localEditorEnabled === true;
      const localEditorReady = safeState.localEditorReady === true;
      const inlineExportEnabled = safeState.inlineExportEnabled === true;
      const inlineExportReady = safeState.inlineExportReady === true;
      const runtimeSettings = safeState.runtimeSettings && isObject(safeState.runtimeSettings)
        ? safeState.runtimeSettings
        : null;
      const hasRuntimeOverride = runtimeSettings && runtimeSettings.hasOverride === true;
      const currentMarkdownPath = toTrimmedString(safeState.currentMarkdownPath, "");
      const keepVisibleForEditor = isAuthor && localEditorEnabled;
      const hiddenByAutoHide = this.isAutoHideEnabled() && !dirty && startupState === STARTUP_STATES.NORMAL && !keepVisibleForEditor;
      const visible = (isAuthor || this.isReaderVisible() || onboardingActive) && !hiddenByAutoHide;
      this.panelElement.style.display = visible ? "block" : "none";
      this.panelElement.dataset.mode = isAuthor ? RUNTIME_MODES.AUTHOR : RUNTIME_MODES.READER;
      this.saveButton.disabled = !(isAuthor && dirty);
      this.exportInlineButton.hidden = !(isAuthor && inlineExportEnabled);
      this.exportInlineButton.disabled = !(isAuthor && inlineExportEnabled && inlineExportReady);
      this.exportInlineButton.title = inlineExportReady ? "" : "Offline Wiki export は include モードのローカル AUTHOR_MODE で利用できます。";
      this.editButton.hidden = !(isAuthor && localEditorEnabled);
      this.editButton.disabled = !(isAuthor && localEditorEnabled && localEditorReady);
      this.editButton.title = localEditorReady ? "" : "編集はローカル AUTHOR_MODE かつ File System Access API 対応ブラウザで利用できます。";
      this.applyRuntimeSettingsForm(safeState);
      this.setRuntimeSettingsControlsEnabled(isAuthor);
      this.saveButton.title = "";
      this.initializeButton.hidden = true;
      this.initializeButton.disabled = true;
      this.initializeButton.title = "AUTHOR MODE 認証簡素化のため初期化は不要です。";
      const parts = [];
      parts.push(currentMarkdownPath || "(path unknown)");
      if (dirty) {
        parts.push("sitemap changed");
      }
      if (startupState !== STARTUP_STATES.NORMAL) {
        parts.push(startupState);
      }
      if (!localEditorEnabled) {
        parts.push("editor:off");
      } else if (!localEditorReady) {
        parts.push("editor:unavailable");
      }
      if (!inlineExportEnabled) {
        parts.push("export:off");
      } else if (!inlineExportReady) {
        parts.push("export:unavailable");
      }
      if (shortError) {
        parts.push(`error: ${shortError}`);
      }
      if (hasRuntimeOverride) {
        parts.push("runtime:override");
      }
      this.metaElement.textContent = parts.join(" | ");
      if (!(isAuthor && localEditorEnabled)) {
        this.setEditorVisible(false);
      }
      if (!this.editorVisible) {
        this.updateEditorPath(currentMarkdownPath);
      }
      this.writeSetupHint("", "muted");
    }

    writeStatus(payload) {
      this.statusElement.textContent = JSON.stringify(payload, null, 2);
    }

    writeError(error) {
      this.statusElement.textContent = String(error && error.message ? error.message : error || "unknown error");
    }

    writeSetupHint(message = "", tone = "muted") {
      if (!this.setupHintElement) {
        return;
      }
      const text = toTrimmedString(String(message || ""), "");
      this.setupHintElement.dataset.tone = tone;
      this.setupHintElement.hidden = text.length === 0;
      this.setupHintElement.textContent = text;
    }

    setEditorVisible(visible) {
      this.editorVisible = visible === true;
      if (!this.editorPanelElement) {
        return;
      }
      this.editorPanelElement.hidden = !this.editorVisible;
    }

    updateEditorPath(path) {
      this.editorPath = toTrimmedString(path, "");
      if (this.editorPathElement) {
        this.editorPathElement.textContent = this.editorPath ? `editing: ${this.editorPath}` : "editing: (unknown)";
      }
    }

    openSettings() {
      if (!this.settingsDetails) {
        return;
      }
      this.settingsDetails.open = true;
      if (this.settingsButton) {
        this.settingsButton.setAttribute("aria-expanded", "true");
      }
    }

    showInitializeHint(reason, status = null) {
      this.openSettings();
      this.writeStatus({
        label: "save unavailable",
        reason: reason || "owner is not initialized.",
        status: status || this.readDocumentState(),
        message: "設定を開いて「初期化」を実行後、もう一度「保存」を押してください。"
      });
    }

    showOnboardingGuide(status = null) {
      this.onboardingNoticeShown = false;
    }

    async renderStatus(label = "status") {
      const fallbackState = this.readDocumentState();

      const api = this.getApi();
      if (!api || typeof api.getStatus !== "function") {
        this.applyModeHint(fallbackState);
        this.writeStatus({
          label: label,
          status: fallbackState,
          message: "authorMode API is unavailable."
        });
        return null;
      }

      try {
        const status = await api.getStatus();
        this.applyModeHint(status);
        const payload = {
          label: label,
          status: status
        };
        this.onboardingNoticeShown = false;
        this.writeStatus(payload);
        return status;
      } catch (error) {
        this.writeError(error);
        return null;
      }
    }

    async onRefreshClick() {
      await this.renderStatus("refresh");
    }

    async onInitializeClick() {
      this.writeStatus({
        label: "initializeOwner",
        message: "AUTHOR MODE 認証簡素化により owner 初期化は不要です。"
      });
    }

    async onSaveClick() {
      const api = this.getApi();
      if (!api || typeof api.saveSitemap !== "function") {
        this.writeError("authorMode API is unavailable.");
        return;
      }
      if (typeof api.getStatus === "function") {
        try {
          const status = await api.getStatus();
          this.applyModeHint(status);
        } catch (error) {
          this.writeError(error);
          return;
        }
      }
      try {
        const result = await api.saveSitemap({
          fileName: this.getFileName()
        });
        this.writeSetupHint("", "muted");
        this.writeStatus({
          label: "saveSitemap",
          result: result
        });
        await this.renderStatus("after saveSitemap");
      } catch (error) {
        this.writeError(error);
      }
    }

    async onEditClick() {
      const api = this.getApi();
      if (!api || typeof api.openLocalEditor !== "function") {
        this.writeError("local editor API is unavailable.");
        return;
      }
      try {
        const result = await api.openLocalEditor();
        this.updateEditorPath(result.path || "");
        if (this.editorTextarea) {
          this.editorTextarea.value = String(result.content == null ? "" : result.content);
        }
        this.setEditorVisible(true);
        this.writeStatus({
          label: "openLocalEditor",
          result: {
            ok: true,
            path: result.path || ""
          }
        });
      } catch (error) {
        this.writeError(error);
      }
    }

    async onExportInlineClick() {
      const api = this.getApi();
      const exportFn = api && typeof api.exportOfflineWiki === "function"
        ? api.exportOfflineWiki
        : (api && typeof api.exportInlineWiki === "function" ? api.exportInlineWiki : null);
      if (!exportFn) {
        this.writeError("offline export API is unavailable.");
        return;
      }
      try {
        const result = await exportFn();
        this.writeSetupHint("", "muted");
        this.writeStatus({
          label: "exportOfflineWiki",
          result: result
        });
        await this.renderStatus("after exportOfflineWiki");
      } catch (error) {
        this.writeError(error);
      }
    }

    async onEditorSaveClick() {
      const api = this.getApi();
      if (!api || typeof api.saveLocalEditor !== "function") {
        this.writeError("local editor API is unavailable.");
        return;
      }
      try {
        const markdown = this.editorTextarea ? this.editorTextarea.value : "";
        await api.saveLocalEditor(markdown);
      } catch (error) {
        this.writeError(error);
      }
    }

    onEditorCloseClick() {
      this.setEditorVisible(false);
    }

    onSettingsClick() {
      if (!this.settingsDetails) {
        return;
      }
      this.settingsDetails.open = !this.settingsDetails.open;
      this.settingsButton.setAttribute("aria-expanded", this.settingsDetails.open ? "true" : "false");
    }

    async onSettingsApplyClick() {
      const api = this.getApi();
      if (!api || typeof api.setRuntimeSettings !== "function") {
        this.writeError("runtime settings API is unavailable.");
        return;
      }
      try {
        const result = await api.setRuntimeSettings(this.collectRuntimeSettingsForm());
        this.writeSetupHint("設定を保存しました（IndexedDB）。", "success");
        this.writeStatus({
          label: "setRuntimeSettings",
          result: result
        });
        await this.renderStatus("after setRuntimeSettings");
      } catch (error) {
        this.writeError(error);
      }
    }

    async onSettingsResetClick() {
      const api = this.getApi();
      if (!api || typeof api.resetRuntimeSettings !== "function") {
        this.writeError("runtime settings API is unavailable.");
        return;
      }
      try {
        const result = await api.resetRuntimeSettings();
        this.writeSetupHint("設定を初期値に戻しました。", "success");
        this.writeStatus({
          label: "resetRuntimeSettings",
          result: result
        });
        await this.renderStatus("after resetRuntimeSettings");
      } catch (error) {
        this.writeError(error);
      }
    }

    onGlobalStateChange(event) {
      const detail = event && isObject(event.detail) ? event.detail : null;
      const state = detail || this.readDocumentState();
      this.applyModeHint(state);
      this.showOnboardingGuide(state);
      if (!detail) {
        return;
      }
    }

    render() {
      this.shadowRoot.innerHTML = `
<style>
:host {
  display: block;
  /* margin: 4px 0 10px; */
}
.panel {
  /* 
  border: 1px solid #ddd;
  border-radius: 6px;
  margin: auto 3px;
  */
  padding: 5px 10px;
  background: #f6f6f6;
}
.line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.title {
  margin: 0;
  font-size: 13px;
  white-space: nowrap;
}
.meta {
  margin: 0;
  font-size: 12px;
  flex: 1 1 280px;
  min-width: 220px;
}
.actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: auto;
}
.settings-details {
  background: #f6f6f6;
  margin-top: 5px;
}
.settings-summary {
  list-style: none;
  font-size: 0;
  line-height: 0;
}
.settings-summary::-webkit-details-marker {
  display: none;
}
.settings-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.runtime-settings {
  margin-top: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  padding: 8px;
  display: grid;
  gap: 8px;
}
.runtime-settings-title {
  margin: 0;
  font-size: 11px;
  color: #444;
}
.runtime-settings-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.runtime-settings-group {
  display: grid;
  gap: 6px;
}
.runtime-settings-group-title {
  margin: 0;
  font-size: 11px;
  color: #555;
  font-weight: 600;
}
.runtime-settings-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #333;
}
.runtime-settings-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 11px;
}
.runtime-settings-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.setup-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
  color: #555;
}
.setup-hint[data-tone="warn"] {
  color: #8a5a00;
}
.setup-hint[data-tone="success"] {
  color: #0b7d3b;
}
button {
  border: 1px solid #bbb;
  background: #fff;
  border-radius: 4px;
  padding: 3px 7px;
  cursor: pointer;
  font-size: 10px;
}
button:hover {
  background: #f1f1f1;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.details {
  margin-top: 6px;
}
.details > summary {
  cursor: pointer;
  font-size: 12px;
  color: #444;
}
.editor-panel {
  margin-top: 8px;
  border: 1px solid #d8d8d8;
  border-radius: 4px;
  background: #fff;
  padding: 8px;
}
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.editor-path {
  margin: 0;
  font-size: 11px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.editor-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.editor-textarea {
  width: 100%;
  min-height: 300px;
  resize: vertical;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.45;
}
.status {
  margin: 6px 0 0;
  padding: 8px;
  background: #1e1e1e;
  color: #ddd;
  border-radius: 4px;
  min-height: 96px;
  overflow: auto;
  font-size: 12px;
}
</style>
<section class="panel">
  <div class="line">
    <h2 class="title">Author Mode</h2>
    <p class="meta" data-part="meta"></p>
    <div class="actions">
      <button type="button" data-action="edit">編集</button>
      <button type="button" data-action="export-inline">書き出し</button>
      <button type="button" data-action="save">SITEMAP保存</button>
      <button type="button" data-action="settings">設定</button>
    </div>
  </div>
  <section class="editor-panel" data-part="editor-panel" hidden>
    <div class="editor-header">
      <p class="editor-path" data-part="editor-path">editing: (unknown)</p>
      <div class="editor-actions">
        <button type="button" data-action="editor-save">編集内容を保存</button>
        <button type="button" data-action="editor-close">閉じる</button>
      </div>
    </div>
    <textarea class="editor-textarea" data-part="editor-textarea" spellcheck="false"></textarea>
  </section>
  <details class="settings-details" data-part="settings-details">
    <summary class="settings-summary">設定</summary>
    <section class="runtime-settings">
      <p class="runtime-settings-title">ランタイム設定（IndexedDB上書き）</p>
      <section class="runtime-settings-group">
        <p class="runtime-settings-group-title">General</p>
        <div class="runtime-settings-grid">
          <label class="runtime-settings-item">
            <input type="checkbox" data-field="auto-indexer-strict">
            auto_indexer.strict
          </label>
          <label class="runtime-settings-item">
            <input type="checkbox" data-field="local-editor-enabled">
            local_editor.enabled
          </label>
          <label class="runtime-settings-item">
            <input type="checkbox" data-field="local-editor-auto-reload">
            local_editor.auto_reload
          </label>
          <label class="runtime-settings-item">
            default_page
            <input class="runtime-settings-input" type="text" data-field="export-default-page" placeholder="index.md">
          </label>
          <label class="runtime-settings-item">
            viewer_id
            <input class="runtime-settings-input" type="text" data-field="export-viewer-id" placeholder="main">
          </label>
        </div>
      </section>
      <section class="runtime-settings-group">
        <p class="runtime-settings-group-title">Export</p>
        <div class="runtime-settings-grid">
          <label class="runtime-settings-item">
            <input type="checkbox" data-field="export-enabled">
            offline_export.enabled
          </label>
          <label class="runtime-settings-item">
            file_name
            <input class="runtime-settings-input" type="text" data-field="export-file-name" placeholder="offline-wiki.html">
          </label>
          <label class="runtime-settings-item">
            query_param
            <input class="runtime-settings-input" type="text" data-field="export-query-param" placeholder="page">
          </label>
        </div>
      </section>
      <div class="runtime-settings-actions">
        <button type="button" data-action="settings-apply">設定を保存</button>
        <button type="button" data-action="settings-reset">設定をリセット</button>
      </div>
    </section>
    <div class="settings-actions">
      <button type="button" data-action="refresh">ステータス更新</button>
      <button type="button" data-action="initialize">初期化</button>
      <p class="setup-hint" data-part="setup-hint" data-tone="muted" hidden></p>
    </div>
    
    <details class="details">
      <summary>詳細ステータス</summary>
      <pre class="status" data-part="status">loading...</pre>
    </details>
  </details>
</section>
      `;
    }
  }

  window.customElements.define(AUTO_INDEXER_AUTHOR_PANEL_TAG, AutoIndexerAuthorPanelElement);
};

const defineAutoIndexerPageListElement = () => {
  if (typeof window === "undefined" || typeof HTMLElement !== "function" || !window.customElements) {
    return;
  }
  if (window.customElements.get(AUTO_INDEXER_PAGE_LIST_TAG)) {
    return;
  }

  class AutoIndexerPageListElement extends HTMLElement {
    constructor() {
      super();
      this.onSitemapChanged = this.onSitemapChanged.bind(this);
      this.retryTimer = null;
      this.retryCount = 0;
    }

    connectedCallback() {
      this.render();
      this.bindElements();
      this.bindEvents();
      this.refresh();
    }

    disconnectedCallback() {
      window.removeEventListener(AUTO_INDEXER_SITEMAP_EVENT, this.onSitemapChanged);
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
    }

    getViewerId() {
      const value = toTrimmedString(this.getAttribute("viewer-id") || this.getAttribute("viewer"), "");
      return value || AUTO_INDEXER_DEFAULT_VIEWER_ID;
    }

    getEmptyLabel() {
      return toTrimmedString(this.getAttribute("empty-label"), "No pages in sitemap.");
    }

    getReloadFlag() {
      if (!this.hasAttribute("reload")) {
        return false;
      }
      return boolFrom(this.getAttribute("reload"), true);
    }

    getLiveFlag() {
      if (!this.hasAttribute("live")) {
        return true;
      }
      return boolFrom(this.getAttribute("live"), true);
    }

    getSortKeys() {
      const raw = toTrimmedString(this.getAttribute("sort-key"), "lastModified");
      const keys = raw.split(",").map((item) => item.trim()).filter(Boolean);
      return keys.length > 0 ? keys : ["lastModified"];
    }

    getSortOrder() {
      const raw = toTrimmedString(this.getAttribute("sort-order"), "desc").toLowerCase();
      return raw === "asc" ? "asc" : "desc";
    }

    getSortType() {
      const raw = toTrimmedString(this.getAttribute("sort-type"), "auto").toLowerCase();
      if (raw === "date" || raw === "number" || raw === "string") {
        return raw;
      }
      return "auto";
    }

    resolveFieldValue(record, path, pagePath) {
      if (path === "path" || path === "url") {
        return pagePath;
      }
      const parts = String(path).split(".").map((part) => part.trim()).filter(Boolean);
      let cursor = record;
      for (const part of parts) {
        if (!isObject(cursor) || !(part in cursor)) {
          return undefined;
        }
        cursor = cursor[part];
      }
      return cursor;
    }

    normalizeSortValue(value, key, sortType) {
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : "";
      }
      if (value == null) {
        return "";
      }
      if (sortType === "number") {
        const n = Number(value);
        return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
      }
      if (sortType === "date") {
        const time = Date.parse(String(value));
        return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
      }
      if (sortType === "string") {
        return String(value);
      }

      const loweredKey = String(key || "").toLowerCase();
      if (loweredKey.includes("date") || loweredKey.includes("modified") || loweredKey.endsWith("at")) {
        const time = Date.parse(String(value));
        if (Number.isFinite(time)) {
          return time;
        }
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      return String(value);
    }

    compareNormalizedValues(left, right) {
      if (typeof left === "number" && typeof right === "number") {
        if (left < right) {
          return -1;
        }
        if (left > right) {
          return 1;
        }
        return 0;
      }
      const l = String(left);
      const r = String(right);
      return l.localeCompare(r);
    }

    sortEntries(entries) {
      const sortKeys = this.getSortKeys();
      const sortOrder = this.getSortOrder();
      const sortType = this.getSortType();
      const direction = sortOrder === "asc" ? 1 : -1;
      entries.sort((a, b) => {
        for (const key of sortKeys) {
          const rawA = this.resolveFieldValue(a.record, key, a.path);
          const rawB = this.resolveFieldValue(b.record, key, b.path);
          const valueA = this.normalizeSortValue(rawA, key, sortType);
          const valueB = this.normalizeSortValue(rawB, key, sortType);
          const compared = this.compareNormalizedValues(valueA, valueB);
          if (compared !== 0) {
            return compared * direction;
          }
        }
        return a.path.localeCompare(b.path);
      });
      return entries;
    }

    bindElements() {
      this.listElement = this.querySelector('[data-part="list"]');
      this.emptyElement = this.querySelector('[data-part="empty"]');
    }

    bindEvents() {
      window.addEventListener(AUTO_INDEXER_SITEMAP_EVENT, this.onSitemapChanged);
    }

    scheduleRetry() {
      if (this.retryTimer || this.retryCount >= 20) {
        return;
      }
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.retryCount += 1;
        this.refresh();
      }, 250);
    }

    resolveApi() {
      const viewerId = this.getViewerId();
      if (!window.MDGarden || !window.MDGarden[viewerId]) {
        return null;
      }
      return window.MDGarden[viewerId].authorMode || window.MDGarden[viewerId].autoIndexer || null;
    }

    resolveHref(path) {
      const viewerId = this.getViewerId();
      const hostApi = window.MDGarden && window.MDGarden[viewerId] ? window.MDGarden[viewerId] : null;
      const viewer = hostApi && hostApi.element ? hostApi.element : null;
      if (viewer && typeof viewer.BuildViewerUrl === "function") {
        try {
          return viewer.BuildViewerUrl(path);
        } catch (error) {
          return path;
        }
      }
      return path;
    }

    setStatusAttributes(state, pages) {
      this.dataset.state = toTrimmedString(state, STARTUP_STATES.NORMAL) || STARTUP_STATES.NORMAL;
      const pageCount = Number.isFinite(Number(pages)) ? Number(pages) : 0;
      this.dataset.pages = String(pageCount);
    }

    clearList() {
      while (this.listElement.firstChild) {
        this.listElement.removeChild(this.listElement.firstChild);
      }
    }

    renderPages(pagesObject) {
      this.clearList();
      const pages = isObject(pagesObject) ? pagesObject : {};
      const entries = this.sortEntries(
        Object.keys(pages).map((path) => {
          return {
            path: path,
            record: isObject(pages[path]) ? pages[path] : {}
          };
        })
      );
      if (entries.length === 0) {
        this.emptyElement.textContent = this.getEmptyLabel();
        this.emptyElement.hidden = false;
        return;
      }
      this.emptyElement.hidden = true;
      const fragment = document.createDocumentFragment();
      entries.forEach((entry) => {
        const path = entry.path;
        const record = entry.record;
        const title = toTrimmedString(record.title, "") || path;
        const item = document.createElement("li");
        const anchor = document.createElement("a");
        anchor.href = this.resolveHref(path);
        anchor.textContent = title;
        item.appendChild(anchor);
        fragment.appendChild(item);
      });
      this.listElement.appendChild(fragment);
    }

    async refresh() {
      const api = this.resolveApi();
      if (!api || typeof api.getSitemap !== "function") {
        this.setStatusAttributes("unavailable", 0);
        delete this.dataset.error;
        this.clearList();
        this.emptyElement.hidden = false;
        this.emptyElement.textContent = this.getEmptyLabel();
        this.scheduleRetry();
        return;
      }
      this.retryCount = 0;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      try {
        const result = await api.getSitemap({
          reload: this.getReloadFlag(),
          live: this.getLiveFlag()
        });
        const pageCount = result && result.document && isObject(result.document.pages)
          ? Object.keys(result.document.pages).length
          : 0;
        const state = toTrimmedString(result && result.state, STARTUP_STATES.NORMAL) || STARTUP_STATES.NORMAL;
        this.setStatusAttributes(state, pageCount);
        delete this.dataset.error;
        this.renderPages(result && result.document ? result.document.pages : {});
      } catch (error) {
        this.setStatusAttributes("error", 0);
        this.dataset.error = String(error && error.message ? error.message : error || "unknown error");
        this.clearList();
        this.emptyElement.hidden = false;
        this.emptyElement.textContent = this.getEmptyLabel();
      }
    }

    onSitemapChanged(event) {
      if (event && isObject(event.detail) && event.detail.source === "get-sitemap") {
        return;
      }
      this.refresh();
    }

    render() {
      this.innerHTML = `
<p class="auto-indexer-page-list-empty" data-part="empty" hidden></p>
<ul class="auto-indexer-page-list" data-part="list"></ul>
      `;
      this.setStatusAttributes("loading", 0);
      delete this.dataset.error;
    }
  }

  window.customElements.define(AUTO_INDEXER_PAGE_LIST_TAG, AutoIndexerPageListElement);
};

const defineAutoIndexerBacklinkListElement = () => {
  if (typeof window === "undefined" || typeof HTMLElement !== "function" || !window.customElements) {
    return;
  }
  if (window.customElements.get(AUTO_INDEXER_BACKLINK_LIST_TAG)) {
    return;
  }

  class AutoIndexerBacklinkListElement extends HTMLElement {
    constructor() {
      super();
      this.onSitemapChanged = this.onSitemapChanged.bind(this);
      this.retryTimer = null;
      this.retryCount = 0;
    }

    connectedCallback() {
      this.render();
      this.bindElements();
      this.bindEvents();
      this.refresh();
    }

    disconnectedCallback() {
      window.removeEventListener(AUTO_INDEXER_SITEMAP_EVENT, this.onSitemapChanged);
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
    }

    getViewerId() {
      const value = toTrimmedString(this.getAttribute("viewer-id") || this.getAttribute("viewer"), "");
      return value || AUTO_INDEXER_DEFAULT_VIEWER_ID;
    }

    getEmptyLabel() {
      return toTrimmedString(this.getAttribute("empty-label"), "No backlinks.");
    }

    getMissingLabel() {
      return toTrimmedString(this.getAttribute("missing-label"), "Current page path is unavailable.");
    }

    getReloadFlag() {
      if (!this.hasAttribute("reload")) {
        return false;
      }
      return boolFrom(this.getAttribute("reload"), true);
    }

    getLiveFlag() {
      if (!this.hasAttribute("live")) {
        return true;
      }
      return boolFrom(this.getAttribute("live"), true);
    }

    getSortKeys() {
      const raw = toTrimmedString(this.getAttribute("sort-key"), "lastModified,path");
      const keys = raw.split(",").map((item) => item.trim()).filter(Boolean);
      return keys.length > 0 ? keys : ["lastModified", "path"];
    }

    getSortOrder() {
      const raw = toTrimmedString(this.getAttribute("sort-order"), "desc").toLowerCase();
      return raw === "asc" ? "asc" : "desc";
    }

    getSortType() {
      const raw = toTrimmedString(this.getAttribute("sort-type"), "auto").toLowerCase();
      if (raw === "date" || raw === "number" || raw === "string") {
        return raw;
      }
      return "auto";
    }

    getTargetPathCandidate() {
      const candidates = [
        this.getAttribute("path"),
        this.getAttribute("target"),
        this.getAttribute("current-path")
      ];
      for (const candidate of candidates) {
        const value = toTrimmedString(candidate, "");
        if (value) {
          return value;
        }
      }
      return "";
    }

    resolveFieldValue(record, path, pagePath) {
      if (path === "path" || path === "url") {
        return pagePath;
      }
      const parts = String(path).split(".").map((part) => part.trim()).filter(Boolean);
      let cursor = record;
      for (const part of parts) {
        if (!isObject(cursor) || !(part in cursor)) {
          return undefined;
        }
        cursor = cursor[part];
      }
      return cursor;
    }

    normalizeSortValue(value, key, sortType) {
      if (Array.isArray(value)) {
        return value.length > 0 ? String(value[0]) : "";
      }
      if (value == null) {
        return "";
      }
      if (sortType === "number") {
        const n = Number(value);
        return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
      }
      if (sortType === "date") {
        const time = Date.parse(String(value));
        return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
      }
      if (sortType === "string") {
        return String(value);
      }
      const loweredKey = String(key || "").toLowerCase();
      if (loweredKey.includes("date") || loweredKey.includes("modified") || loweredKey.endsWith("at")) {
        const time = Date.parse(String(value));
        if (Number.isFinite(time)) {
          return time;
        }
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      return String(value);
    }

    compareNormalizedValues(left, right) {
      if (typeof left === "number" && typeof right === "number") {
        if (left < right) {
          return -1;
        }
        if (left > right) {
          return 1;
        }
        return 0;
      }
      const l = String(left);
      const r = String(right);
      return l.localeCompare(r);
    }

    sortEntries(entries) {
      const sortKeys = this.getSortKeys();
      const sortOrder = this.getSortOrder();
      const sortType = this.getSortType();
      const direction = sortOrder === "asc" ? 1 : -1;
      entries.sort((a, b) => {
        for (const key of sortKeys) {
          const rawA = this.resolveFieldValue(a.record, key, a.path);
          const rawB = this.resolveFieldValue(b.record, key, b.path);
          const valueA = this.normalizeSortValue(rawA, key, sortType);
          const valueB = this.normalizeSortValue(rawB, key, sortType);
          const compared = this.compareNormalizedValues(valueA, valueB);
          if (compared !== 0) {
            return compared * direction;
          }
        }
        return a.path.localeCompare(b.path);
      });
      return entries;
    }

    bindElements() {
      this.listElement = this.querySelector('[data-part="list"]');
      this.emptyElement = this.querySelector('[data-part="empty"]');
    }

    bindEvents() {
      window.addEventListener(AUTO_INDEXER_SITEMAP_EVENT, this.onSitemapChanged);
    }

    scheduleRetry() {
      if (this.retryTimer || this.retryCount >= 20) {
        return;
      }
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.retryCount += 1;
        this.refresh();
      }, 250);
    }

    resolveApi() {
      const viewerId = this.getViewerId();
      if (!window.MDGarden || !window.MDGarden[viewerId]) {
        return null;
      }
      return window.MDGarden[viewerId].authorMode || window.MDGarden[viewerId].autoIndexer || null;
    }

    resolveViewer() {
      const viewerId = this.getViewerId();
      const hostApi = window.MDGarden && window.MDGarden[viewerId] ? window.MDGarden[viewerId] : null;
      return hostApi && hostApi.element ? hostApi.element : null;
    }

    resolveHref(path) {
      const viewer = this.resolveViewer();
      if (viewer && typeof viewer.BuildViewerUrl === "function") {
        try {
          return viewer.BuildViewerUrl(path);
        } catch (error) {
          return path;
        }
      }
      return path;
    }

    resolveTargetPath() {
      const viewer = this.resolveViewer();
      const manualPath = this.getTargetPathCandidate();
      if (manualPath) {
        return normalizePathCandidate(viewer, manualPath, "");
      }
      if (viewer && viewer.viewerState && viewer.viewerState.currentDocPath) {
        const fromState = normalizePathCandidate(viewer, viewer.viewerState.currentDocPath, "");
        if (fromState) {
          return fromState;
        }
      }
      if (viewer && viewer.getAttribute) {
        return normalizePathCandidate(viewer, viewer.getAttribute("src") || "", "");
      }
      return null;
    }

    setStatusAttributes(state, pages, targetPath) {
      this.dataset.state = toTrimmedString(state, STARTUP_STATES.NORMAL) || STARTUP_STATES.NORMAL;
      const pageCount = Number.isFinite(Number(pages)) ? Number(pages) : 0;
      this.dataset.pages = String(pageCount);
      const safePath = toTrimmedString(targetPath, "");
      if (safePath) {
        this.dataset.targetPath = safePath;
      } else {
        delete this.dataset.targetPath;
      }
    }

    clearList() {
      while (this.listElement.firstChild) {
        this.listElement.removeChild(this.listElement.firstChild);
      }
    }

    resolveBacklinkPaths(pagesObject, targetPath) {
      const pages = isObject(pagesObject) ? pagesObject : {};
      const result = new Set();
      if (!targetPath) {
        return [];
      }
      const targetRecord = isObject(pages[targetPath]) ? pages[targetPath] : null;
      if (targetRecord && Array.isArray(targetRecord.backlinks)) {
        targetRecord.backlinks.forEach((item) => {
          const path = toTrimmedString(String(item || ""), "");
          if (path && path !== targetPath && isObject(pages[path])) {
            result.add(path);
          }
        });
      }
      Object.keys(pages).forEach((path) => {
        if (path === targetPath) {
          return;
        }
        const record = isObject(pages[path]) ? pages[path] : {};
        const links = Array.isArray(record.links) ? record.links : [];
        if (links.indexOf(targetPath) >= 0) {
          result.add(path);
        }
      });
      return [...result];
    }

    renderBacklinks(pagesObject, targetPath) {
      this.clearList();
      if (!targetPath) {
        this.emptyElement.textContent = this.getMissingLabel();
        this.emptyElement.hidden = false;
        return 0;
      }
      const pages = isObject(pagesObject) ? pagesObject : {};
      const backlinkPaths = this.resolveBacklinkPaths(pages, targetPath);
      const entries = this.sortEntries(backlinkPaths.map((path) => {
        return {
          path: path,
          record: isObject(pages[path]) ? pages[path] : {}
        };
      }));
      if (entries.length === 0) {
        this.emptyElement.textContent = this.getEmptyLabel();
        this.emptyElement.hidden = false;
        return 0;
      }
      this.emptyElement.hidden = true;
      const fragment = document.createDocumentFragment();
      entries.forEach((entry) => {
        const path = entry.path;
        const record = entry.record;
        const title = toTrimmedString(record.title, "") || path;
        const item = document.createElement("li");
        const anchor = document.createElement("a");
        anchor.href = this.resolveHref(path);
        anchor.textContent = title;
        item.appendChild(anchor);
        fragment.appendChild(item);
      });
      this.listElement.appendChild(fragment);
      return entries.length;
    }

    async refresh() {
      const api = this.resolveApi();
      if (!api || typeof api.getSitemap !== "function") {
        this.setStatusAttributes("unavailable", 0, "");
        delete this.dataset.error;
        this.clearList();
        this.emptyElement.hidden = false;
        this.emptyElement.textContent = this.getEmptyLabel();
        this.scheduleRetry();
        return;
      }
      this.retryCount = 0;
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      try {
        const result = await api.getSitemap({
          reload: this.getReloadFlag(),
          live: this.getLiveFlag()
        });
        const state = toTrimmedString(result && result.state, STARTUP_STATES.NORMAL) || STARTUP_STATES.NORMAL;
        const targetPath = this.resolveTargetPath();
        const pageCount = this.renderBacklinks(result && result.document ? result.document.pages : {}, targetPath);
        this.setStatusAttributes(state, pageCount, targetPath || "");
        delete this.dataset.error;
      } catch (error) {
        this.setStatusAttributes("error", 0, "");
        this.dataset.error = String(error && error.message ? error.message : error || "unknown error");
        this.clearList();
        this.emptyElement.hidden = false;
        this.emptyElement.textContent = this.getEmptyLabel();
      }
    }

    onSitemapChanged(event) {
      if (event && isObject(event.detail) && event.detail.source === "get-sitemap") {
        return;
      }
      this.refresh();
    }

    render() {
      this.innerHTML = `
<p class="auto-indexer-backlink-list-empty" data-part="empty" hidden></p>
<ul class="auto-indexer-backlink-list" data-part="list"></ul>
      `;
      this.setStatusAttributes("loading", 0, "");
      delete this.dataset.error;
    }
  }

  window.customElements.define(AUTO_INDEXER_BACKLINK_LIST_TAG, AutoIndexerBacklinkListElement);
};

const base64FromBytes = (bytes) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const bytesFromBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const randomSaltBase64 = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64FromBytes(bytes);
};

const deriveOwnerHash = async (passphrase, saltBase64, iterations) => {
  if (!crypto || !crypto.subtle) {
    throw new Error("WebCrypto is unavailable.");
  }
  const text = new TextEncoder();
  const salt = bytesFromBase64(saltBase64);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    text.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt,
      iterations: iterations
    },
    keyMaterial,
    256
  );
  return base64FromBytes(new Uint8Array(bits));
};

const requestToPromise = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
};

const transactionToPromise = (transaction) => {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
  });
};

const withTransaction = async (db, storeNames, mode, handler) => {
  const tx = db.transaction(storeNames, mode);
  const stores = {};
  storeNames.forEach((name) => {
    stores[name] = tx.objectStore(name);
  });
  const result = await handler(stores, tx);
  await transactionToPromise(tx);
  return result;
};

const openDatabase = (dbName) => {
  if (!window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is unavailable."));
  }
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, AUTO_INDEXER_SCHEMA_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pages")) {
        db.createObjectStore("pages", { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
  });
};

const getStoreValue = async (db, storeName, key, fallback = null) => {
  return withTransaction(db, [storeName], "readonly", async (stores) => {
    const record = await requestToPromise(stores[storeName].get(key));
    if (!record) {
      return fallback;
    }
    return record.value === undefined ? fallback : record.value;
  });
};

const setStoreValues = async (db, storeName, entries) => {
  const items = Array.isArray(entries) ? entries : [entries];
  return withTransaction(db, [storeName], "readwrite", async (stores) => {
    for (const item of items) {
      if (!item || typeof item.key !== "string") {
        continue;
      }
      await requestToPromise(stores[storeName].put(item));
    }
  });
};

const isWritableFileHandle = (value) => {
  return !!value && typeof value === "object" && typeof value.createWritable === "function";
};

const normalizeStoredFileHandle = (value) => {
  return isWritableFileHandle(value) ? value : null;
};

const persistRuntimeFileHandle = async (runtime, handle) => {
  if (!runtime || !runtime.db) {
    return;
  }
  try {
    await setStoreValues(runtime.db, "config", { key: KEY_FILE_HANDLE, value: handle || null });
  } catch (error) {
    // Keep runtime file handle in memory even if persistence is unavailable.
  }
};

const clearRuntimeFileHandle = async (runtime) => {
  if (!runtime) {
    return;
  }
  runtime.fileHandle = null;
  await persistRuntimeFileHandle(runtime, null);
};

const getPageByUrl = async (db, url) => {
  return withTransaction(db, ["pages"], "readonly", async (stores) => {
    return requestToPromise(stores.pages.get(url));
  });
};

const countPages = async (db) => {
  return withTransaction(db, ["pages"], "readonly", async (stores) => {
    return requestToPromise(stores.pages.count());
  });
};

const getAllPages = async (db) => {
  return withTransaction(db, ["pages"], "readonly", async (stores) => {
    return requestToPromise(stores.pages.getAll());
  });
};

const deletePageByUrl = async (db, url) => {
  return withTransaction(db, ["pages"], "readwrite", async (stores) => {
    await requestToPromise(stores.pages.delete(url));
  });
};

const putPage = async (db, page) => {
  return withTransaction(db, ["pages"], "readwrite", async (stores) => {
    await requestToPromise(stores.pages.put(page));
  });
};

const normalizePageRecord = (url, rawPage) => {
  if (!isValidNormalizedPath(url) || !isObject(rawPage)) {
    return null;
  }
  const lastModified = normalizeRfc3339ToUtc(rawPage.lastModified);
  if (!lastModified) {
    return null;
  }
  const indexing = rawPage.indexing !== false;
  const rawLinks = Array.isArray(rawPage.links) ? rawPage.links : [];
  const links = [];
  for (const link of rawLinks) {
    const normalized = toTrimmedString(String(link || ""), "");
    if (!isValidNormalizedPath(normalized)) {
      continue;
    }
    if (links.indexOf(normalized) >= 0) {
      continue;
    }
    links.push(normalized);
    if (links.length >= LIMITS.MAX_LINKS_PER_PAGE) {
      break;
    }
  }
  return {
    url: url,
    title: sanitizeTitle(rawPage.title),
    lastModified: lastModified,
    indexing: indexing,
    links: sortStringArray(links),
    contentHash: normalizeContentHash(rawPage.contentHash),
    lastSeen: normalizeUtcIsoOrNow(rawPage.lastSeen),
    updatedAt: normalizeUtcIsoOrNow(rawPage.updatedAt)
  };
};

const parseSitemapDocument = (rawData) => {
  if (!isObject(rawData) || !isObject(rawData.pages)) {
    return {
      state: STARTUP_STATES.RECOVERY_REQUIRED,
      document: null,
      errors: ["Invalid sitemap schema."]
    };
  }
  const ownerHash = toTrimmedString(rawData.ownerHash, "");
  const salt = toTrimmedString(rawData.salt, "");

  const pages = {};
  const errors = [];
  Object.keys(rawData.pages).forEach((url) => {
    const page = normalizePageRecord(url, rawData.pages[url]);
    if (!page) {
      errors.push(`Skipped invalid page record: ${url}`);
      return;
    }
    pages[url] = page;
  });

  return {
    state: STARTUP_STATES.NORMAL,
    document: {
      version: toTrimmedString(rawData.version, AUTO_INDEXER_VERSION) || AUTO_INDEXER_VERSION,
      ownerHash: ownerHash,
      salt: salt,
      lastUpdated: normalizeRfc3339ToUtc(rawData.lastUpdated),
      pages: pages
    },
    errors: errors
  };
};

const loadSitemapDocument = async (path) => {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (response.status === 404) {
      return {
        state: STARTUP_STATES.INIT_REQUIRED,
        document: null,
        errors: []
      };
    }
    if (!response.ok) {
      return {
        state: STARTUP_STATES.ERROR,
        document: null,
        errors: [`Failed to load sitemap.json (${response.status}).`]
      };
    }
    const json = await response.json();
    return parseSitemapDocument(json);
  } catch (error) {
    return {
      state: STARTUP_STATES.ERROR,
      document: null,
      errors: [error && error.message ? error.message : "Failed to load sitemap.json."]
    };
  }
};

const applyDocumentState = (runtime) => {
  const root = getDocumentRoot();
  if (!root) {
    return;
  }
  runtime.currentMarkdownPath = resolveCurrentMarkdownPath(runtime);
  runtime.localEditorReady = isLocalEditorAvailable(runtime);
  runtime.inlineExportReady = isInlineWikiExportAvailable(runtime);
  runtime.canInitializeOwner = canInitializeOwnerInCurrentEnvironment(runtime);
  root.dataset.autoIndexerMode = runtime.mode;
  root.dataset.autoIndexerState = runtime.startupState;
  root.dataset.autoIndexerDirty = runtime.dirty ? "true" : "false";
  delete root.dataset.autoIndexerOwnerReady;
  delete root.dataset.autoIndexerCanInitialize;
  delete root.dataset.autoIndexerLocalEditorEnabled;
  delete root.dataset.autoIndexerLocalEditorReady;
  delete root.dataset.autoIndexerCurrentPath;
  root.dataset.localEditorEnabled = runtime.localEditorOption && runtime.localEditorOption.enabled ? "true" : "false";
  root.dataset.localEditorReady = runtime.localEditorReady ? "true" : "false";
  delete root.dataset.inlineExportEnabled;
  delete root.dataset.inlineExportReady;
  root.dataset.exportEnabled = runtime.inlineExportOption && runtime.inlineExportOption.enabled ? "true" : "false";
  root.dataset.exportReady = runtime.inlineExportReady ? "true" : "false";
  if (runtime.currentMarkdownPath) {
    root.dataset.currentPath = runtime.currentMarkdownPath;
  } else {
    delete root.dataset.currentPath;
  }
  if (runtime.mode === RUNTIME_MODES.AUTHOR) {
    root.dataset.author = "true";
  } else {
    delete root.dataset.author;
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent(AUTO_INDEXER_STATE_EVENT, {
      detail: buildRuntimeStateDetail(runtime)
    }));
  }
};

const setRuntimeError = async (runtime, message) => {
  runtime.lastError = message || "";
  if (!runtime.db) {
    applyDocumentState(runtime);
    return;
  }
  await setStoreValues(runtime.db, "meta", {
    key: KEY_LAST_ERROR,
    value: runtime.lastError
  });
  applyDocumentState(runtime);
};

const clearRuntimeError = async (runtime) => {
  runtime.lastError = "";
  if (!runtime.db) {
    applyDocumentState(runtime);
    return;
  }
  await setStoreValues(runtime.db, "meta", {
    key: KEY_LAST_ERROR,
    value: ""
  });
  applyDocumentState(runtime);
};

const setDirtyState = async (runtime, dirty) => {
  runtime.dirty = dirty === true;
  if (!runtime.db) {
    applyDocumentState(runtime);
    return;
  }
  await setStoreValues(runtime.db, "meta", {
    key: KEY_DIRTY,
    value: runtime.dirty
  });
  applyDocumentState(runtime);
};

const incrementRevision = async (runtime) => {
  const currentRevision = await getStoreValue(runtime.db, "config", KEY_REVISION, 0);
  const nextRevision = toPositiveInt(currentRevision, 0) + 1;
  runtime.lastKnownRevision = nextRevision;
  await setStoreValues(runtime.db, "config", [
    { key: KEY_SCHEMA_VERSION, value: AUTO_INDEXER_SCHEMA_VERSION },
    { key: KEY_REVISION, value: nextRevision }
  ]);
  return nextRevision;
};

const evaluateMode = (runtime) => {
  const currentUrl = safeParseUrl(window.location.href);
  runtime.canInitializeOwner = canInitializeOwnerInCurrentEnvironment(runtime, currentUrl);
  if (runtime.authorModeEnabled !== true) {
    runtime.mode = RUNTIME_MODES.READER;
    runtime.localEditorReady = false;
    runtime.ownerMatched = false;
    applyDocumentState(runtime);
    return runtime.mode;
  }
  if (!currentUrl) {
    runtime.mode = RUNTIME_MODES.READER;
    runtime.ownerMatched = false;
    applyDocumentState(runtime);
    return runtime.mode;
  }
  if (!isLocalEnvironment(currentUrl)) {
    runtime.mode = RUNTIME_MODES.READER;
    runtime.ownerMatched = false;
    applyDocumentState(runtime);
    return runtime.mode;
  }
  if (isProductionMatch(currentUrl, runtime.deployConfig)) {
    runtime.mode = RUNTIME_MODES.READER;
    runtime.ownerMatched = false;
    applyDocumentState(runtime);
    return runtime.mode;
  }
  runtime.mode = RUNTIME_MODES.AUTHOR;
  runtime.ownerMatched = true;
  applyDocumentState(runtime);
  return runtime.mode;
};

const syncRuntimeFromStorage = async (runtime) => {
  runtime.ownerHash = toTrimmedString(await getStoreValue(runtime.db, "config", KEY_OWNER_HASH, ""), "");
  runtime.salt = toTrimmedString(await getStoreValue(runtime.db, "config", KEY_SALT, ""), "");
  runtime.lastKnownRevision = toPositiveInt(await getStoreValue(runtime.db, "config", KEY_REVISION, 0), 0);
  runtime.dirty = boolFrom(await getStoreValue(runtime.db, "meta", KEY_DIRTY, false), false);
  runtime.lastError = toTrimmedString(await getStoreValue(runtime.db, "meta", KEY_LAST_ERROR, ""), "");
  runtime.runtimeOverrideOption = normalizeRuntimeOverrideOption(
    await getStoreValue(runtime.db, "config", KEY_RUNTIME_OVERRIDE, null)
  );
  applyRuntimeOverrideOption(runtime);
  if (!isWritableFileHandle(runtime.fileHandle)) {
    let storedFileHandle = null;
    try {
      storedFileHandle = normalizeStoredFileHandle(await getStoreValue(runtime.db, "config", KEY_FILE_HANDLE, null));
    } catch (error) {
      storedFileHandle = null;
    }
    runtime.fileHandle = storedFileHandle;
  }
};

const persistRuntimeOverrideOption = async (runtime) => {
  if (!runtime || !runtime.db) {
    return;
  }
  const normalized = normalizeRuntimeOverrideOption(runtime.runtimeOverrideOption);
  const storedValue = hasRuntimeOverrideValue(normalized) ? normalized : null;
  await setStoreValues(runtime.db, "config", {
    key: KEY_RUNTIME_OVERRIDE,
    value: storedValue
  });
};

const getRuntimeSettings = async (runtime) => {
  if (!runtime) {
    return buildRuntimeSettingsState(null);
  }
  if (runtime.db) {
    await syncRuntimeFromStorage(runtime);
    evaluateMode(runtime);
  }
  return buildRuntimeSettingsState(runtime);
};

const setRuntimeSettings = async (runtime, settings) => {
  if (!runtime) {
    throw new Error("Runtime is unavailable.");
  }
  runtime.runtimeOverrideOption = normalizeRuntimeOverrideOption(settings);
  applyRuntimeOverrideOption(runtime);
  await persistRuntimeOverrideOption(runtime);
  evaluateMode(runtime);
  return buildRuntimeSettingsState(runtime);
};

const resetRuntimeSettings = async (runtime) => {
  if (!runtime) {
    throw new Error("Runtime is unavailable.");
  }
  runtime.runtimeOverrideOption = normalizeRuntimeOverrideOption(null);
  applyRuntimeOverrideOption(runtime);
  await persistRuntimeOverrideOption(runtime);
  evaluateMode(runtime);
  return buildRuntimeSettingsState(runtime);
};

const importSitemapIntoCache = async (runtime, documentData) => {
  const pageCount = await countPages(runtime.db);
  if (pageCount > 0) {
    return;
  }
  const pages = documentData && isObject(documentData.pages) ? documentData.pages : {};
  const records = Object.keys(pages).map((url) => pages[url]).filter(Boolean);
  await withTransaction(runtime.db, ["pages", "config", "meta"], "readwrite", async (stores) => {
    for (const page of records) {
      await requestToPromise(stores.pages.put(page));
    }
    await requestToPromise(stores.config.put({ key: KEY_SCHEMA_VERSION, value: AUTO_INDEXER_SCHEMA_VERSION }));
    await requestToPromise(stores.config.put({ key: KEY_OWNER_HASH, value: documentData.ownerHash }));
    await requestToPromise(stores.config.put({ key: KEY_SALT, value: documentData.salt }));
    await requestToPromise(stores.config.put({ key: KEY_REVISION, value: 0 }));
    await requestToPromise(stores.meta.put({ key: KEY_DIRTY, value: false }));
    await requestToPromise(stores.meta.put({ key: KEY_LAST_ERROR, value: "" }));
  });
};

const extractNormalizedPath = (runtime, payload, context) => {
  const viewer = runtime.viewer;
  const contextPath = toTrimmedString(context.normalizedPath || context.currentDocPath, "");
  if (contextPath) {
    const normalized = normalizePathCandidate(viewer, contextPath, "");
    if (normalized) {
      return normalized;
    }
  }
  if (viewer && viewer.viewerState && viewer.viewerState.currentDocPath) {
    const normalizedFromViewer = normalizePathCandidate(viewer, viewer.viewerState.currentDocPath, "");
    if (normalizedFromViewer) {
      return normalizedFromViewer;
    }
  }
  const src = viewer ? viewer.getAttribute("src") : null;
  if (src) {
    return normalizePathCandidate(viewer, src, "");
  }
  return null;
};

const resolveCurrentMarkdownPath = (runtime) => {
  const viewer = runtime && runtime.viewer ? runtime.viewer : null;
  if (!viewer) {
    return "";
  }
  const fromState = viewer.viewerState && viewer.viewerState.currentDocPath
    ? normalizePathCandidate(viewer, viewer.viewerState.currentDocPath, "")
    : null;
  if (fromState) {
    return fromState;
  }
  const src = toTrimmedString(viewer.getAttribute ? viewer.getAttribute("src") : "", "");
  if (!src) {
    return "";
  }
  const normalizedFromSrc = normalizePathCandidate(viewer, src, "");
  return normalizedFromSrc || "";
};

const resolveMarkdownSourcePath = (runtime, normalizedPath) => {
  const safePath = toTrimmedString(normalizedPath, "");
  if (!safePath) {
    return "";
  }
  const viewer = runtime && runtime.viewer ? runtime.viewer : null;
  if (viewer && typeof viewer.ResolveIncludeFilePath === "function") {
    return toTrimmedString(viewer.ResolveIncludeFilePath(safePath), safePath) || safePath;
  }
  return safePath;
};

const normalizeMarkdownForHash = (markdown) => {
  const text = String(markdown == null ? "" : markdown).replace(/\r\n?/g, "\n");
  const withoutTrailingSpaces = text.replace(/[ \t]+$/gm, "");
  return withoutTrailingSpaces.replace(/\n+$/, "\n");
};

const sha256Hex = async (text) => {
  if (typeof crypto === "undefined" || !crypto || !crypto.subtle || typeof TextEncoder !== "function") {
    return "";
  }
  try {
    const encoder = new TextEncoder();
    const input = encoder.encode(String(text == null ? "" : text));
    const digest = await crypto.subtle.digest("SHA-256", input);
    const bytes = new Uint8Array(digest);
    return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    return "";
  }
};

const computeCurrentMarkdownHash = async (runtime, normalizedPath) => {
  const sourcePath = resolveMarkdownSourcePath(runtime, normalizedPath);
  if (!sourcePath) {
    return "";
  }
  try {
    const response = await fetch(sourcePath, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }
    const markdown = await response.text();
    return normalizeContentHash(await sha256Hex(normalizeMarkdownForHash(markdown)));
  } catch (error) {
    return "";
  }
};

const isLocalEditorAvailable = (runtime, currentUrl = null) => {
  if (!runtime || runtime.authorModeEnabled !== true) {
    return false;
  }
  if (!runtime.localEditorOption || runtime.localEditorOption.enabled !== true) {
    return false;
  }
  if (!runtime.viewer || !runtime.viewer.getAttribute || !runtime.viewer.getAttribute("src")) {
    return false;
  }
  if (runtime.mode !== RUNTIME_MODES.AUTHOR) {
    return false;
  }
  if (typeof window === "undefined" || typeof window.showSaveFilePicker !== "function") {
    return false;
  }
  const url = currentUrl || safeParseUrl(typeof window !== "undefined" ? window.location.href : "");
  if (!url || !isLocalEnvironment(url)) {
    return false;
  }
  return true;
};

const isInlineWikiExportAvailable = (runtime, currentUrl = null) => {
  if (!runtime || runtime.authorModeEnabled !== true) {
    return false;
  }
  if (!runtime.inlineExportOption || runtime.inlineExportOption.enabled !== true) {
    return false;
  }
  if (!runtime.option || runtime.option.enabled !== true || !runtime.db) {
    return false;
  }
  if (!runtime.viewer || !runtime.viewer.getAttribute || !runtime.viewer.getAttribute("src")) {
    return false;
  }
  if (runtime.mode !== RUNTIME_MODES.AUTHOR) {
    return false;
  }
  const url = currentUrl || safeParseUrl(typeof window !== "undefined" ? window.location.href : "");
  if (!url || !isLocalEnvironment(url)) {
    return false;
  }
  return true;
};

const extractLinks = (runtime, root, baseDocPath) => {
  if (!isElementNode(root)) {
    return [];
  }
  const viewer = runtime.viewer;
  const links = [];
  const anchors = root.querySelectorAll("a[href]");
  for (const anchor of anchors) {
    // In include mode MDGarden rewrites href to query URLs and keeps the normalized
    // markdown path in data-mdgarden-target. Prefer that stable value.
    const candidate = toTrimmedString(
      anchor.getAttribute("data-mdgarden-target") || anchor.getAttribute("href"),
      ""
    );
    if (!candidate) {
      continue;
    }
    const normalized = normalizePathCandidate(viewer, candidate, baseDocPath);
    if (!normalized) {
      continue;
    }
    if (links.indexOf(normalized) >= 0) {
      continue;
    }
    links.push(normalized);
    if (links.length >= LIMITS.MAX_LINKS_PER_PAGE) {
      break;
    }
  }
  return sortStringArray(links);
};

const upsertPageFromView = async (runtime, payload) => {
  const viewer = runtime.viewer;
  const root = resolvePayloadRoot(payload);
  const context = resolvePayloadContext(payload);
  const normalizedPath = extractNormalizedPath(runtime, payload, context);
  if (!normalizedPath) {
    await setRuntimeError(runtime, "Failed to resolve normalized markdown path.");
    await setDirtyState(runtime, true);
    return;
  }

  const frontmatter = parseFrontmatter(context) || {};
  const indexing = frontmatter.indexing !== false;
  const existing = await getPageByUrl(runtime.db, normalizedPath);

  if (indexing === false) {
    if (existing) {
      await deletePageByUrl(runtime.db, normalizedPath);
      await incrementRevision(runtime);
      await setDirtyState(runtime, true);
      await clearRuntimeError(runtime);
    }
    return;
  }

  const lastModified = normalizeRfc3339ToUtc(frontmatter.lastModified);
  if (!lastModified) {
    await setRuntimeError(runtime, `Invalid or missing lastModified: ${normalizedPath}`);
    await setDirtyState(runtime, true);
    return;
  }

  const titleCandidate = toTrimmedString(frontmatter.title || "", "") || extractRenderedTitle(root);
  const links = extractLinks(runtime, root, normalizedPath);
  const contentHash = await computeCurrentMarkdownHash(runtime, normalizedPath);
  const page = {
    url: normalizedPath,
    title: sanitizeTitle(titleCandidate),
    lastModified: lastModified,
    indexing: true,
    links: links,
    contentHash: contentHash,
    lastSeen: nowIso(),
    updatedAt: nowIso()
  };

  const pageCount = await countPages(runtime.db);
  if (!existing && pageCount >= LIMITS.MAX_PAGES) {
    await setRuntimeError(runtime, `Page limit exceeded (${LIMITS.MAX_PAGES}).`);
    await setDirtyState(runtime, true);
    return;
  }

  let shouldUpdate = false;
  if (!existing) {
    shouldUpdate = true;
  } else {
    const existingEpoch = getEpoch(existing.lastModified);
    const nextEpoch = getEpoch(page.lastModified);
    if (Number.isNaN(existingEpoch)) {
      shouldUpdate = true;
    } else if (nextEpoch > existingEpoch) {
      shouldUpdate = true;
    } else if (nextEpoch < existingEpoch && runtime.option.strict) {
      await setRuntimeError(runtime, `lastModified moved backwards: ${normalizedPath}`);
      await setDirtyState(runtime, true);
      return;
    }
  }

  if (!shouldUpdate) {
    const existingHash = normalizeContentHash(existing && existing.contentHash);
    const nextHash = normalizeContentHash(page.contentHash);
    if (!existingHash && nextHash) {
      await putPage(runtime.db, {
        ...existing,
        contentHash: nextHash,
        lastSeen: nowIso(),
        updatedAt: nowIso()
      });
      return;
    }
    if (existingHash && nextHash && existingHash !== nextHash) {
      const mismatchMessage = `content changed without lastModified update (notify-only): ${normalizedPath}`;
      if (runtime.lastError !== mismatchMessage || runtime.dirty !== true) {
        await setRuntimeError(runtime, mismatchMessage);
        await setDirtyState(runtime, true);
      }
    }
    return;
  }

  await putPage(runtime.db, page);
  await incrementRevision(runtime);
  await setDirtyState(runtime, true);
  await clearRuntimeError(runtime);
};

const buildSitemapDocument = async (runtime) => {
  const pages = await getAllPages(runtime.db);
  const errors = [];
  const included = new Map();

  pages.forEach((rawPage) => {
    if (!rawPage || rawPage.indexing === false) {
      return;
    }
    const url = toTrimmedString(rawPage.url, "");
    if (!isValidNormalizedPath(url)) {
      errors.push(`Invalid url dropped: ${url || "(empty)"}`);
      return;
    }
    const lastModified = normalizeRfc3339ToUtc(rawPage.lastModified);
    if (!lastModified) {
      errors.push(`Invalid lastModified dropped: ${url}`);
      return;
    }
    const normalizedLinks = [];
    const linkArray = Array.isArray(rawPage.links) ? rawPage.links : [];
    for (const link of linkArray) {
      const normalized = toTrimmedString(String(link || ""), "");
      if (!isValidNormalizedPath(normalized)) {
        continue;
      }
      if (normalizedLinks.indexOf(normalized) >= 0) {
        continue;
      }
      normalizedLinks.push(normalized);
      if (normalizedLinks.length >= LIMITS.MAX_LINKS_PER_PAGE) {
        break;
      }
    }
    included.set(url, {
      title: sanitizeTitle(rawPage.title),
      lastModified: lastModified,
      indexing: true,
      links: sortStringArray(normalizedLinks),
      backlinks: []
    });
  });

  const backlinksMap = new Map();
  included.forEach((page, url) => {
    backlinksMap.set(url, new Set());
  });
  included.forEach((page, url) => {
    page.links.forEach((target) => {
      if (!included.has(target) || target === url) {
        return;
      }
      const backlinks = backlinksMap.get(target);
      if (!backlinks) {
        return;
      }
      backlinks.add(url);
    });
  });

  const pageObject = {};
  sortStringArray([...included.keys()]).forEach((url) => {
    const page = included.get(url);
    page.backlinks = sortStringArray([...backlinksMap.get(url)]);
    pageObject[url] = page;
  });

  const ownerHash = toTrimmedString(runtime.ownerHash, "");
  const salt = toTrimmedString(runtime.salt, "");

  return {
    document: {
      version: AUTO_INDEXER_VERSION,
      ownerHash: ownerHash,
      salt: salt,
      lastUpdated: nowIso(),
      pages: pageObject
    },
    errors: errors
  };
};

const ensureFileHandleWritePermission = async (handle, allowRequest) => {
  if (!handle) {
    return false;
  }
  if (typeof handle.queryPermission !== "function") {
    return true;
  }
  try {
    const current = await handle.queryPermission({ mode: "readwrite" });
    if (current === "granted") {
      return true;
    }
    if (!allowRequest || typeof handle.requestPermission !== "function") {
      return false;
    }
    const requested = await handle.requestPermission({ mode: "readwrite" });
    return requested === "granted";
  } catch (error) {
    return false;
  }
};

const isFileHandlePermissionError = (error) => {
  if (!error) {
    return false;
  }
  const name = toTrimmedString(error.name, "");
  if (name === "NotAllowedError" || name === "SecurityError") {
    return true;
  }
  const message = toTrimmedString(error.message, "");
  return /permission|denied|not allowed/i.test(message);
};

const pickSaveFileHandle = async (fileName) => {
  return window.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: "JSON",
        accept: { "application/json": [".json"] }
      }
    ]
  });
};

const saveTextAsFile = async (runtime, text, fileName) => {
  if (window.showSaveFilePicker) {
    let handle = runtime && runtime.fileHandle ? runtime.fileHandle : null;
    if (!handle) {
      handle = await pickSaveFileHandle(fileName);
      if (runtime) {
        runtime.fileHandle = handle;
      }
      await persistRuntimeFileHandle(runtime, handle);
    }
    const granted = await ensureFileHandleWritePermission(handle, true);
    if (!granted) {
      handle = await pickSaveFileHandle(fileName);
      if (runtime) {
        runtime.fileHandle = handle;
      }
      await persistRuntimeFileHandle(runtime, handle);
      const grantedAfterRepick = await ensureFileHandleWritePermission(handle, true);
      if (!grantedAfterRepick) {
        throw new Error("Write permission was not granted.");
      }
    }
    try {
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
    } catch (error) {
      if (isFileHandlePermissionError(error)) {
        await clearRuntimeFileHandle(runtime);
      }
      throw error;
    }
    return "file-system-access";
  }

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return "download";
};

const pickMarkdownFileHandle = async (suggestedName) => {
  const safeName = toTrimmedString(suggestedName, "document.md") || "document.md";
  return window.showSaveFilePicker({
    suggestedName: safeName,
    types: [
      {
        description: "Markdown",
        accept: {
          "text/markdown": [".md", ".markdown"],
          "text/plain": [".txt"]
        }
      }
    ]
  });
};

const openLocalEditor = async (runtime) => {
  if (!runtime || runtime.authorModeEnabled !== true) {
    throw new Error("author_mode is disabled.");
  }
  evaluateMode(runtime);
  if (runtime.mode !== RUNTIME_MODES.AUTHOR) {
    throw new Error("Local editor is available only in AUTHOR_MODE.");
  }
  if (!isLocalEditorAvailable(runtime)) {
    throw new Error("Local editor requires local AUTHOR_MODE and File System Access API support.");
  }
  const normalizedPath = resolveCurrentMarkdownPath(runtime);
  if (!normalizedPath) {
    throw new Error("Failed to resolve current markdown path.");
  }
  const sourcePath = resolveMarkdownSourcePath(runtime, normalizedPath);
  if (!sourcePath) {
    throw new Error("Failed to resolve markdown source path.");
  }
  const response = await fetch(sourcePath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load markdown (${response.status}).`);
  }
  const content = await response.text();
  runtime.currentMarkdownPath = normalizedPath;
  applyDocumentState(runtime);
  return {
    ok: true,
    path: normalizedPath,
    sourcePath: sourcePath,
    content: content
  };
};

const saveLocalEditor = async (runtime, markdown, option = {}) => {
  if (!runtime || runtime.authorModeEnabled !== true) {
    throw new Error("author_mode is disabled.");
  }
  evaluateMode(runtime);
  if (runtime.mode !== RUNTIME_MODES.AUTHOR) {
    throw new Error("Local editor save is available only in AUTHOR_MODE.");
  }
  if (!isLocalEditorAvailable(runtime)) {
    throw new Error("Local editor requires local AUTHOR_MODE and File System Access API support.");
  }
  if (!window.showSaveFilePicker) {
    throw new Error("Local editor save requires File System Access API support.");
  }
  if (navigator.userActivation && navigator.userActivation.isActive !== true) {
    throw new Error("Local editor save requires explicit user activation.");
  }

  const normalizedPath = resolveCurrentMarkdownPath(runtime);
  if (!normalizedPath) {
    throw new Error("Failed to resolve current markdown path.");
  }
  const fileName = normalizedPath.split("/").filter(Boolean).pop() || "document.md";
  const handle = await pickMarkdownFileHandle(fileName);
  const granted = await ensureFileHandleWritePermission(handle, true);
  if (!granted) {
    throw new Error("Write permission was not granted.");
  }
  const text = String(markdown == null ? "" : markdown);
  try {
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  } catch (error) {
    throw error;
  }
  let shouldReload = runtime.localEditorOption && runtime.localEditorOption.autoReload === true;
  if (option && option.autoReload !== undefined) {
    shouldReload = boolFrom(option.autoReload, shouldReload);
  }
  if (option && option.reload !== undefined) {
    shouldReload = boolFrom(option.reload, shouldReload);
  }
  if (option && option.reloadAfterSave !== undefined) {
    shouldReload = boolFrom(option.reloadAfterSave, shouldReload);
  }
  if (shouldReload) {
    window.location.reload();
  }
  return {
    ok: true,
    method: "file-system-access",
    path: normalizedPath,
    reloaded: shouldReload
  };
};

const resolveInlineExportQueryParam = (runtime, option = {}) => {
  const inlineOption = runtime && runtime.inlineExportOption ? runtime.inlineExportOption : {};
  const raw = toTrimmedString(option.query_param || option.queryParam, "") || toTrimmedString(inlineOption.queryParam, "page");
  const viewer = runtime && runtime.viewer ? runtime.viewer : null;
  if (viewer && typeof viewer.NormalizeInlineSpaParam === "function") {
    return viewer.NormalizeInlineSpaParam(raw);
  }
  return normalizeInlineExportQueryParam(raw);
};

const resolveInlineExportViewerId = (runtime, option = {}) => {
  const inlineOption = runtime && runtime.inlineExportOption ? runtime.inlineExportOption : {};
  const explicit = toTrimmedString(option.viewer_id || option.viewerId, "") || toTrimmedString(inlineOption.viewerId, "");
  if (explicit) {
    return explicit;
  }
  const viewer = runtime && runtime.viewer ? runtime.viewer : null;
  return toTrimmedString(viewer && viewer.id ? viewer.id : "", "wiki") || "wiki";
};

const resolveInlineExportFileName = (runtime, option = {}) => {
  const inlineOption = runtime && runtime.inlineExportOption ? runtime.inlineExportOption : {};
  return toTrimmedString(option.file_name || option.fileName, "") || toTrimmedString(inlineOption.fileName, "offline-wiki.html") || "offline-wiki.html";
};

const resolveInlineExportDefaultPage = (runtime, option = {}, pagePaths = []) => {
  const pages = pagePaths.filter(Boolean);
  const set = new Set(pages);
  const inlineOption = runtime && runtime.inlineExportOption ? runtime.inlineExportOption : {};
  const explicit = toTrimmedString(option.default_page || option.defaultPage, "") || toTrimmedString(inlineOption.defaultPage, "");
  if (explicit && set.has(explicit)) {
    return explicit;
  }
  const currentPath = resolveCurrentMarkdownPath(runtime);
  if (currentPath && set.has(currentPath)) {
    return currentPath;
  }
  if (set.has("index.md")) {
    return "index.md";
  }
  if (set.has("home.md")) {
    return "home.md";
  }
  return pages.length > 0 ? pages[0] : "";
};

const normalizeOfflineExportPlugins = (rawPlugins) => {
  const source = toTrimmedString(rawPlugins, "");
  if (!source) {
    return "";
  }
  return source.split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item !== "author-mode" && item !== "auto-indexer")
    .join(",");
};

const resolveInlineExportPlugins = (viewer) => {
  if (!viewer || !viewer.getAttribute) {
    return "";
  }
  return normalizeOfflineExportPlugins(viewer.getAttribute("data-plugins"));
};

const copyViewerAttributesForOfflineExport = (viewer) => {
  const attrs = {};
  if (!viewer || !viewer.attributes) {
    return attrs;
  }
  for (const attr of viewer.attributes) {
    attrs[attr.name] = attr.value == null ? "" : String(attr.value);
  }
  return attrs;
};

const buildMdGardenTagHtml = (attrs) => {
  const isValidAttrName = (name) => /^[a-zA-Z_:][a-zA-Z0-9:._-]*$/.test(String(name || ""));
  const entries = Object.keys(attrs || {})
    .filter((name) => toTrimmedString(name, "") !== "")
    .filter((name) => isValidAttrName(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `    ${name}="${escapeHtmlAttribute(attrs[name])}"`);
  return `<md-garden
${entries.join("\n")}>
</md-garden>`;
};

const isValidHtmlAttributeName = (name) => {
  return /^[a-zA-Z_:][a-zA-Z0-9:._-]*$/.test(String(name || ""));
};

const applyViewerAttributesToElement = (element, attrs) => {
  if (!element || !element.attributes) {
    return;
  }
  while (element.attributes.length > 0) {
    element.removeAttribute(element.attributes[0].name);
  }
  Object.keys(attrs || {})
    .filter((name) => toTrimmedString(name, "") !== "")
    .filter((name) => isValidHtmlAttributeName(name))
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      element.setAttribute(name, String(attrs[name] == null ? "" : attrs[name]));
    });
};

const resolveViewerMarkdownSourcePath = (viewer, sourcePath) => {
  const raw = toTrimmedString(sourcePath, "");
  if (!raw) {
    return {
      normalizedPath: "",
      sourcePath: ""
    };
  }
  const normalizedPath = viewer && typeof viewer.ResolveMarkdownTarget === "function"
    ? toTrimmedString(viewer.ResolveMarkdownTarget(raw, ""), raw) || raw
    : raw;
  const resolvedSourcePath = viewer && typeof viewer.ResolveIncludeFilePath === "function"
    ? toTrimmedString(viewer.ResolveIncludeFilePath(normalizedPath), raw) || raw
    : raw;
  return {
    normalizedPath: normalizedPath,
    sourcePath: resolvedSourcePath
  };
};

const collectAdditionalViewerTemplates = (viewerId, option = {}) => {
  const includeUnscopedPages = option.includeUnscopedPages === true;
  const blocks = [];
  const seen = new Set();
  const targetTemplates = document.querySelectorAll(`template[data-target="${viewerId}"]`);
  targetTemplates.forEach((template) => {
    const html = toTrimmedString(template.outerHTML, "");
    if (!html || seen.has(html)) {
      return;
    }
    seen.add(html);
    blocks.push(html);
  });

  const scopedPages = document.querySelectorAll(`template[data-page][data-page-target="${viewerId}"]`);
  scopedPages.forEach((template) => {
    const html = toTrimmedString(template.outerHTML, "");
    if (!html || seen.has(html)) {
      return;
    }
    seen.add(html);
    blocks.push(html);
  });

  if (includeUnscopedPages && scopedPages.length === 0) {
    const unscopedPages = document.querySelectorAll("template[data-page]:not([data-page-target])");
    unscopedPages.forEach((template) => {
      const html = toTrimmedString(template.outerHTML, "");
      if (!html || seen.has(html)) {
        return;
      }
      seen.add(html);
      blocks.push(html);
    });
  }
  return blocks;
};

const collectInlineWikiExportPages = async (runtime, pagesObject, queryParam) => {
  const pages = isObject(pagesObject) ? pagesObject : {};
  const paths = sortStringArray(Object.keys(pages));
  const result = [];
  for (const path of paths) {
    const sourcePath = resolveMarkdownSourcePath(runtime, path);
    if (!sourcePath) {
      throw new Error(`Failed to resolve source path: ${path}`);
    }
    const response = await fetch(sourcePath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load markdown (${response.status}): ${path}`);
    }
    const markdown = await response.text();
    const converted = rewriteMarkdownLinksForInlineWiki(runtime, markdown, path, queryParam, pages);
    const record = isObject(pages[path]) ? pages[path] : {};
    const title = toTrimmedString(record.title, "") || path;
    result.push({
      path: path,
      title: title,
      markdown: converted
    });
  }
  return result;
};

const buildInlineWikiExportHtml = async (runtime, pages, pagesObject = null, option = {}) => {
  const viewer = runtime && runtime.viewer ? runtime.viewer : null;
  const viewerId = resolveInlineExportViewerId(runtime, option);
  const queryParam = resolveInlineExportQueryParam(runtime, option);
  const pagePaths = pages.map((page) => page.path);
  const defaultPage = resolveInlineExportDefaultPage(runtime, option, pagePaths);
  const primaryViewerPlugins = resolveInlineExportPlugins(viewer);
  const htmlEnabled = viewer && viewer.option ? viewer.option.html === true : true;
  const sanitizeEnabled = viewer && viewer.option ? viewer.option.sanitize !== false : false;
  const frontmatterEnabled = viewer && viewer.option ? viewer.option.frontmatter !== false : true;
  const executeScriptEnabled = viewer && viewer.option ? viewer.option.execute_script === true : false;
  const title = `${document.title || "MDGarden"} (Offline Wiki Export)`;
  const templates = pages.map((page) => {
    return `<template data-page="${escapeHtmlAttribute(page.path)}" data-page-target="${escapeHtmlAttribute(viewerId)}" data-title="${escapeHtmlAttribute(page.title)}">
${escapeTemplateText(page.markdown)}
</template>`;
  }).join("\n\n");

  const allViewers = Array.from(document.querySelectorAll("md-garden"));
  const layoutClone = document.body ? document.body.cloneNode(true) : null;
  const clonedViewers = layoutClone ? Array.from(layoutClone.querySelectorAll("md-garden")) : [];
  const extraTemplateBlocks = [];
  const usedViewerIds = new Set([viewerId]);
  const safePagesObject = isObject(pagesObject) ? pagesObject : {};

  let generatedViewerIndex = 1;
  for (let index = 0; index < allViewers.length; index += 1) {
    const candidate = allViewers[index];
    const cloneViewer = clonedViewers[index] || null;
    if (!candidate || !cloneViewer) {
      continue;
    }
    const isPrimaryViewer = candidate === viewer;
    const attrs = copyViewerAttributesForOfflineExport(candidate);
    delete attrs["data-status"];
    let candidateId = toTrimmedString(attrs.id || candidate.id, "");
    if (isPrimaryViewer) {
      candidateId = viewerId;
    }
    if (!candidateId || (usedViewerIds.has(candidateId) && candidateId !== viewerId)) {
      while (usedViewerIds.has(`viewer-${generatedViewerIndex}`)) {
        generatedViewerIndex += 1;
      }
      candidateId = `viewer-${generatedViewerIndex}`;
      generatedViewerIndex += 1;
    }
    attrs.id = candidateId;
    if ("data-plugins" in attrs) {
      const normalized = normalizeOfflineExportPlugins(attrs["data-plugins"]);
      if (normalized) {
        attrs["data-plugins"] = normalized;
      } else {
        delete attrs["data-plugins"];
      }
    }
    if (isPrimaryViewer) {
      delete attrs.src;
      attrs["data-inline-spa"] = "true";
      attrs["data-inline-spa-param"] = queryParam;
      attrs["data-inline-default-page"] = defaultPage;
      attrs["data-html"] = htmlEnabled ? "true" : "false";
      attrs["data-sanitize"] = sanitizeEnabled ? "true" : "false";
      attrs["data-frontmatter"] = frontmatterEnabled ? "true" : "false";
      attrs["data-execute-script"] = executeScriptEnabled ? "true" : "false";
      if (primaryViewerPlugins) {
        attrs["data-plugins"] = primaryViewerPlugins;
      } else {
        delete attrs["data-plugins"];
      }
    } else {
      const sourceAttr = toTrimmedString(attrs.src, "");
      if (sourceAttr.toLowerCase().endsWith(".md")) {
        try {
          const resolved = resolveViewerMarkdownSourcePath(candidate, sourceAttr);
          if (resolved.sourcePath) {
            const response = await fetch(resolved.sourcePath, { cache: "no-store" });
            if (response.ok) {
              const rawMarkdown = await response.text();
              const rewritten = rewriteMarkdownLinksForInlineWiki(
                runtime,
                rawMarkdown,
                resolved.normalizedPath || sourceAttr,
                queryParam,
                safePagesObject
              );
              extraTemplateBlocks.push(`<template data-target="${escapeHtmlAttribute(candidateId)}">
${escapeTemplateText(rewritten)}
</template>`);
              delete attrs.src;
              attrs["data-spa"] = "false";
              delete attrs["data-inline-spa"];
              delete attrs["data-inline-spa-param"];
              delete attrs["data-inline-default-page"];
            }
          }
        } catch (error) {
          // Fallback: keep src-based behavior when source fetch fails during export.
        }
      }
    }
    usedViewerIds.add(candidateId);
    applyViewerAttributesToElement(cloneViewer, attrs);
    const inlineSpaEnabled = boolFrom(attrs["data-inline-spa"], false);
    const needsUnscopedPages = !attrs.src && inlineSpaEnabled;
    const templates = collectAdditionalViewerTemplates(candidateId, {
      includeUnscopedPages: needsUnscopedPages
    });
    templates.forEach((tpl) => {
      extraTemplateBlocks.push(tpl);
    });
  }

  if (layoutClone) {
    const authorPanels = layoutClone.querySelectorAll(AUTO_INDEXER_AUTHOR_PANEL_TAG);
    authorPanels.forEach((panel) => panel.remove());
    const existingTemplates = layoutClone.querySelectorAll("template[data-target], template[data-page]");
    existingTemplates.forEach((template) => template.remove());
  }

  const templateSections = [
    `<template data-target="${escapeHtmlAttribute(viewerId)}">Loading...</template>`,
    templates
  ];
  if (extraTemplateBlocks.length > 0) {
    templateSections.push(extraTemplateBlocks.join("\n\n"));
  }
  const bodyHtml = layoutClone
    ? layoutClone.innerHTML.trim()
    : allViewers.map((item) => buildMdGardenTagHtml(copyViewerAttributesForOfflineExport(item))).join("\n\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlAttribute(title)}</title>
  <link rel="stylesheet" href="./assets/css/default.css">
  <script src="./assets/js/mdgarden.min.js"></script>
</head>
<body>
${bodyHtml}

${templateSections.join("\n\n")}
</body>
</html>
`;
};

const pickInlineWikiFileHandle = async (suggestedName) => {
  const safeName = toTrimmedString(suggestedName, "offline-wiki.html") || "offline-wiki.html";
  return window.showSaveFilePicker({
    suggestedName: safeName,
    types: [
      {
        description: "HTML",
        accept: {
          "text/html": [".html", ".htm"]
        }
      }
    ]
  });
};

const saveInlineWikiAsFile = async (htmlText, fileName) => {
  if (window.showSaveFilePicker) {
    const handle = await pickInlineWikiFileHandle(fileName);
    const granted = await ensureFileHandleWritePermission(handle, true);
    if (!granted) {
      throw new Error("Write permission was not granted.");
    }
    const writable = await handle.createWritable();
    await writable.write(String(htmlText == null ? "" : htmlText));
    await writable.close();
    return "file-system-access";
  }

  const blob = new Blob([String(htmlText == null ? "" : htmlText)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return "download";
};

const exportInlineWiki = async (runtime, option = {}) => {
  if (!runtime || runtime.authorModeEnabled !== true) {
    throw new Error("author_mode is disabled.");
  }
  evaluateMode(runtime);
  if (runtime.mode !== RUNTIME_MODES.AUTHOR) {
    throw new Error("Offline Wiki export is available only in AUTHOR_MODE.");
  }
  if (!isInlineWikiExportAvailable(runtime)) {
    throw new Error("Offline Wiki export requires include mode with local AUTHOR_MODE.");
  }
  if (navigator.userActivation && navigator.userActivation.isActive !== true) {
    throw new Error("Offline Wiki export requires explicit user activation.");
  }

  const sitemap = await getSitemap(runtime, { live: true, reload: false });
  if (!sitemap || !sitemap.document || !isObject(sitemap.document.pages)) {
    const reason = sitemap && Array.isArray(sitemap.errors) && sitemap.errors.length > 0
      ? sitemap.errors[0]
      : "Sitemap is unavailable.";
    throw new Error(`Offline Wiki export failed: ${reason}`);
  }
  const queryParam = resolveInlineExportQueryParam(runtime, option);
  const pages = await collectInlineWikiExportPages(runtime, sitemap.document.pages, queryParam);
  if (pages.length === 0) {
    throw new Error("No sitemap pages were available for export.");
  }

  const html = await buildInlineWikiExportHtml(runtime, pages, sitemap.document.pages, option);
  const fileName = resolveInlineExportFileName(runtime, option);
  const method = await saveInlineWikiAsFile(html, fileName);
  const defaultPage = resolveInlineExportDefaultPage(runtime, option, pages.map((page) => page.path));
  const viewerId = resolveInlineExportViewerId(runtime, option);
  return {
    ok: true,
    method: method,
    fileName: fileName,
    pageCount: pages.length,
    viewerId: viewerId,
    queryParam: queryParam,
    defaultPage: defaultPage
  };
};

const refreshSitemapOwner = async (runtime) => {
  const loaded = await loadSitemapDocument(runtime.option.sitemapPath);
  if (loaded.state === STARTUP_STATES.NORMAL && loaded.document) {
    runtime.sitemapDocument = loaded.document;
    runtime.sitemapOwnerHash = loaded.document.ownerHash;
    runtime.salt = loaded.document.salt;
    runtime.startupState = STARTUP_STATES.NORMAL;
    dispatchSitemapEvent(runtime, "refresh-owner");
    return;
  }
  if (loaded.state === STARTUP_STATES.INIT_REQUIRED && runtime.sitemapDocument) {
    runtime.sitemapOwnerHash = toTrimmedString(runtime.sitemapDocument.ownerHash, "");
    runtime.salt = toTrimmedString(runtime.sitemapDocument.salt, "");
    runtime.startupState = STARTUP_STATES.NORMAL;
    return;
  }
  runtime.startupState = loaded.state;
  if (loaded.errors && loaded.errors.length > 0) {
    await setRuntimeError(runtime, loaded.errors[0]);
  }
};

const saveSitemap = async (runtime, option = {}) => {
  if (!runtime.option.enabled) {
    throw new Error("auto_indexer is disabled.");
  }
  if (!runtime.db) {
    throw new Error("auto-indexer is not initialized.");
  }
  if (navigator.userActivation && navigator.userActivation.isActive !== true) {
    throw new Error("Save operation requires explicit user activation.");
  }

  const staleRevision = runtime.lastKnownRevision;
  const staleOwnerHash = runtime.ownerHash;
  const staleSalt = runtime.salt;

  await refreshSitemapOwner(runtime);
  await syncRuntimeFromStorage(runtime);
  if (!runtime.ownerHash && staleOwnerHash) {
    runtime.ownerHash = staleOwnerHash;
  }
  if (!runtime.salt && staleSalt) {
    runtime.salt = staleSalt;
  }
  evaluateMode(runtime);
  if (runtime.mode !== RUNTIME_MODES.AUTHOR) {
    throw new Error("Save operation is available only in AUTHOR_MODE.");
  }

  const currentRevision = toPositiveInt(await getStoreValue(runtime.db, "config", KEY_REVISION, 0), 0);
  const expectedRevision = Number.isFinite(option.expectedRevision)
    ? Number(option.expectedRevision)
    : staleRevision;
  if (expectedRevision !== currentRevision) {
    const conflictMessage = `Revision conflict detected. expected=${expectedRevision}, current=${currentRevision}`;
    await setRuntimeError(runtime, conflictMessage);
    throw new Error(conflictMessage);
  }

  const built = await buildSitemapDocument(runtime);
  const serialized = `${JSON.stringify(built.document, null, 2)}\n`;
  const fileName = toTrimmedString(option.fileName, DEFAULT_FILE_NAME) || DEFAULT_FILE_NAME;
  const method = await saveTextAsFile(runtime, serialized, fileName);

  runtime.sitemapDocument = built.document;
  runtime.sitemapOwnerHash = built.document.ownerHash;
  runtime.ownerHash = built.document.ownerHash;
  runtime.salt = built.document.salt;
  dispatchSitemapEvent(runtime, "save-sitemap");
  await setStoreValues(runtime.db, "config", [
    { key: KEY_OWNER_HASH, value: built.document.ownerHash },
    { key: KEY_SALT, value: built.document.salt },
    { key: KEY_LAST_SAVED_AT, value: built.document.lastUpdated }
  ]);
  await incrementRevision(runtime);
  await setDirtyState(runtime, false);
  await clearRuntimeError(runtime);
  evaluateMode(runtime);

  return {
    ok: true,
    method: method,
    revision: runtime.lastKnownRevision,
    errors: built.errors
  };
};

const initializeOwner = async (runtime, passphrase) => {
  if (!runtime.option.enabled) {
    throw new Error("auto_indexer is disabled.");
  }
  const phrase = toTrimmedString(passphrase, "");
  if (phrase.length < 8) {
    throw new Error("Passphrase must be at least 8 characters.");
  }
  const currentUrl = safeParseUrl(window.location.href);
  if (!currentUrl || !isLocalEnvironment(currentUrl)) {
    throw new Error("Owner initialization is available only in local environment.");
  }
  if (isProductionMatch(currentUrl, runtime.deployConfig)) {
    throw new Error("Owner initialization is disabled in production environment.");
  }

  const salt = randomSaltBase64();
  const ownerHash = await deriveOwnerHash(phrase, salt, runtime.option.pbkdf2Iterations);
  runtime.ownerHash = ownerHash;
  runtime.sitemapOwnerHash = ownerHash;
  runtime.salt = salt;
  runtime.sitemapDocument = {
    version: AUTO_INDEXER_VERSION,
    ownerHash: ownerHash,
    salt: salt,
    lastUpdated: nowIso(),
    pages: {}
  };

  await setStoreValues(runtime.db, "config", [
    { key: KEY_SCHEMA_VERSION, value: AUTO_INDEXER_SCHEMA_VERSION },
    { key: KEY_OWNER_HASH, value: ownerHash },
    { key: KEY_SALT, value: salt }
  ]);
  await incrementRevision(runtime);
  await setDirtyState(runtime, true);
  await clearRuntimeError(runtime);
  runtime.startupState = STARTUP_STATES.NORMAL;
  evaluateMode(runtime);
  dispatchSitemapEvent(runtime, "initialize-owner");

  return {
    ok: true,
    ownerHash: ownerHash
  };
};

const getSitemap = async (runtime, option = {}) => {
  const reload = boolFrom(option.reload, false);
  const live = boolFrom(option.live, true);
  if (live && runtime.db) {
    if (!runtime.ownerHash || !runtime.salt) {
      await syncRuntimeFromStorage(runtime);
    }
    evaluateMode(runtime);
    try {
      const built = await buildSitemapDocument(runtime);
      return {
        ok: true,
        state: runtime.startupState,
        source: "live-db",
        errors: built.errors || [],
        document: cloneSitemapDocument(built.document)
      };
    } catch (error) {
      return {
        ok: false,
        state: runtime.startupState,
        source: "live-db",
        errors: [error && error.message ? error.message : "Failed to build sitemap from IndexedDB."],
        document: null
      };
    }
  }

  if (!reload && runtime.sitemapDocument) {
    return {
      ok: true,
      state: runtime.startupState,
      source: "cache",
      errors: [],
      document: cloneSitemapDocument(runtime.sitemapDocument)
    };
  }

  const loaded = await loadSitemapDocument(runtime.option.sitemapPath);
  runtime.startupState = loaded.state;
  if (loaded.document) {
    runtime.sitemapDocument = loaded.document;
    runtime.sitemapOwnerHash = loaded.document.ownerHash;
    runtime.salt = loaded.document.salt;
    dispatchSitemapEvent(runtime, "get-sitemap");
  }
  if (loaded.errors && loaded.errors.length > 0) {
    runtime.lastError = loaded.errors[0];
  }
  if (runtime.db) {
    await syncRuntimeFromStorage(runtime);
  }
  evaluateMode(runtime);

  return {
    ok: !!loaded.document,
    state: runtime.startupState,
    source: "fetch",
    errors: loaded.errors || [],
    document: loaded.document ? cloneSitemapDocument(loaded.document) : null
  };
};

const getStatus = async (runtime) => {
  runtime.canInitializeOwner = canInitializeOwnerInCurrentEnvironment(runtime);
  runtime.currentMarkdownPath = resolveCurrentMarkdownPath(runtime);
  runtime.localEditorReady = isLocalEditorAvailable(runtime);
  runtime.inlineExportReady = isInlineWikiExportAvailable(runtime);
  const runtimeSettings = buildRuntimeSettingsState(runtime);
  if (!runtime.db) {
    return {
      enabled: runtime.option.enabled,
      authorModeEnabled: runtime.authorModeEnabled === true,
      mode: runtime.mode,
      startupState: runtime.startupState,
      dirty: runtime.dirty,
      ownerReady: true,
      canInitializeOwner: runtime.canInitializeOwner === true,
      revision: runtime.lastKnownRevision,
      ownerMatched: runtime.ownerMatched,
      lastError: runtime.lastError,
      localEditorEnabled: runtime.localEditorOption && runtime.localEditorOption.enabled === true,
      localEditorAutoReload: runtime.localEditorOption && runtime.localEditorOption.autoReload === true,
      localEditorReady: runtime.localEditorReady === true,
      inlineExportEnabled: runtime.inlineExportOption && runtime.inlineExportOption.enabled === true,
      inlineExportReady: runtime.inlineExportReady === true,
      currentMarkdownPath: runtime.currentMarkdownPath || "",
      runtimeSettings: runtimeSettings
    };
  }
  await syncRuntimeFromStorage(runtime);
  evaluateMode(runtime);
  runtime.currentMarkdownPath = resolveCurrentMarkdownPath(runtime);
  runtime.localEditorReady = isLocalEditorAvailable(runtime);
  runtime.inlineExportReady = isInlineWikiExportAvailable(runtime);
  const syncedRuntimeSettings = buildRuntimeSettingsState(runtime);
  return {
    enabled: runtime.option.enabled,
    authorModeEnabled: runtime.authorModeEnabled === true,
    mode: runtime.mode,
    startupState: runtime.startupState,
    dirty: runtime.dirty,
    ownerReady: true,
    canInitializeOwner: runtime.canInitializeOwner === true,
    revision: runtime.lastKnownRevision,
    ownerMatched: runtime.ownerMatched,
    lastError: runtime.lastError,
    localEditorEnabled: runtime.localEditorOption && runtime.localEditorOption.enabled === true,
    localEditorAutoReload: runtime.localEditorOption && runtime.localEditorOption.autoReload === true,
    localEditorReady: runtime.localEditorReady === true,
    inlineExportEnabled: runtime.inlineExportOption && runtime.inlineExportOption.enabled === true,
    inlineExportReady: runtime.inlineExportReady === true,
    currentMarkdownPath: runtime.currentMarkdownPath || "",
    runtimeSettings: syncedRuntimeSettings
  };
};

const bindPublicApi = (runtime) => {
  const viewer = runtime.viewer;
  if (!viewer || !viewer.id || !window.MDGarden || !window.MDGarden[viewer.id]) {
    return;
  }
  const hostApi = window.MDGarden[viewer.id];
  const api = {
    getStatus: () => getStatus(runtime),
    getRuntimeSettings: () => getRuntimeSettings(runtime),
    setRuntimeSettings: (settings) => setRuntimeSettings(runtime, settings),
    resetRuntimeSettings: () => resetRuntimeSettings(runtime),
    getSitemap: (option = {}) => getSitemap(runtime, option),
    saveSitemap: (option = {}) => saveSitemap(runtime, option),
    initializeOwner: (passphrase) => initializeOwner(runtime, passphrase),
    openLocalEditor: () => openLocalEditor(runtime),
    saveLocalEditor: (markdown, option = {}) => saveLocalEditor(runtime, markdown, option),
    exportOfflineWiki: (option = {}) => exportInlineWiki(runtime, option),
    // Backward-compatible alias
    exportInlineWiki: (option = {}) => exportInlineWiki(runtime, option)
  };
  hostApi.authorMode = api;
  // Backward-compatible alias
  hostApi.autoIndexer = api;
};

const bootstrap = async (runtime, viewer) => {
  runtime.viewer = viewer;
  const authorMode = resolveAuthorModeSettings(viewer.option || {});
  runtime.authorModeEnabled = authorMode.enabled === true;
  runtime.baseAutoIndexerOption = normalizeAutoIndexerOption(authorMode.autoIndexerOption, viewer.id || "main");
  runtime.baseLocalEditorOption = normalizeLocalEditorOption(authorMode.localEditorOption);
  runtime.baseInlineExportOption = normalizeInlineExportOption(authorMode.inlineExportOption);
  runtime.deployConfig = normalizeDeployEntries(authorMode.deploy);
  runtime.runtimeOverrideOption = normalizeRuntimeOverrideOption(runtime.runtimeOverrideOption);
  applyRuntimeOverrideOption(runtime);
  runtime.mode = RUNTIME_MODES.READER;
  runtime.startupState = STARTUP_STATES.NORMAL;
  runtime.initialized = true;

  if (!runtime.option.enabled) {
    bindPublicApi(runtime);
    applyDocumentState(runtime);
    return;
  }

  if (viewer.option && viewer.option.mode && viewer.option.mode !== "include" && runtime.option.mode === REQUIRED_INCLUDE_MODE) {
    runtime.mode = RUNTIME_MODES.READER;
    runtime.startupState = STARTUP_STATES.NORMAL;
    bindPublicApi(runtime);
    applyDocumentState(runtime);
    return;
  }

  try {
    runtime.db = await openDatabase(runtime.option.dbName);
  } catch (error) {
    runtime.startupState = STARTUP_STATES.ERROR;
    runtime.lastError = error && error.message ? error.message : "Failed to open IndexedDB.";
    bindPublicApi(runtime);
    applyDocumentState(runtime);
    return;
  }

  const loaded = await loadSitemapDocument(runtime.option.sitemapPath);
  runtime.startupState = loaded.state;
  if (loaded.document) {
    runtime.sitemapDocument = loaded.document;
    runtime.sitemapOwnerHash = loaded.document.ownerHash;
    runtime.salt = loaded.document.salt;
    await importSitemapIntoCache(runtime, loaded.document);
  }
  await syncRuntimeFromStorage(runtime);
  if (!runtime.ownerHash && runtime.sitemapOwnerHash) {
    runtime.ownerHash = runtime.sitemapOwnerHash;
    await setStoreValues(runtime.db, "config", { key: KEY_OWNER_HASH, value: runtime.ownerHash });
  }
  if (!runtime.sitemapOwnerHash && runtime.ownerHash && runtime.startupState === STARTUP_STATES.NORMAL) {
    runtime.sitemapOwnerHash = runtime.ownerHash;
  }
  if (loaded.errors && loaded.errors.length > 0) {
    runtime.lastError = loaded.errors[0];
    await setStoreValues(runtime.db, "meta", { key: KEY_LAST_ERROR, value: runtime.lastError });
  }
  evaluateMode(runtime);
  bindPublicApi(runtime);
  applyDocumentState(runtime);
  if (loaded.document) {
    dispatchSitemapEvent(runtime, "bootstrap");
  }
};

const renderPageListEmbeds = (runtime, payload) => {
  const viewer = runtime.viewer;
  if (!viewer) {
    return;
  }
  const root = resolvePayloadRoot(payload);
  const container = root || viewer;
  if (!isElementNode(container)) {
    return;
  }
  const targets = container.querySelectorAll(`.${AUTO_INDEXER_EMBED_PAGE_LIST_CLASS}`);
  targets.forEach((target) => {
    if (target.querySelector(AUTO_INDEXER_PAGE_LIST_TAG)) {
      return;
    }
    const host = document.createElement("div");
    host.className = AUTO_INDEXER_EMBED_PAGE_LIST_CLASS;
    const component = document.createElement(AUTO_INDEXER_PAGE_LIST_TAG);
    if (viewer.id) {
      component.setAttribute("viewer-id", viewer.id);
    }
    const passthroughAttributes = [
      "sort-key",
      "sort-order",
      "sort-type",
      "reload",
      "live",
      "empty-label"
    ];
    passthroughAttributes.forEach((name) => {
      if (target.hasAttribute(name)) {
        component.setAttribute(name, target.getAttribute(name) || "");
      }
    });
    host.appendChild(component);
    target.replaceWith(host);
  });
};

const renderBacklinkListEmbeds = (runtime, payload) => {
  const viewer = runtime.viewer;
  if (!viewer) {
    return;
  }
  const root = resolvePayloadRoot(payload);
  const container = root || viewer;
  if (!isElementNode(container)) {
    return;
  }
  const targets = container.querySelectorAll(`.${AUTO_INDEXER_EMBED_BACKLINK_LIST_CLASS}`);
  targets.forEach((target) => {
    if (target.querySelector(AUTO_INDEXER_BACKLINK_LIST_TAG)) {
      return;
    }
    const host = document.createElement("div");
    host.className = AUTO_INDEXER_EMBED_BACKLINK_LIST_CLASS;
    const component = document.createElement(AUTO_INDEXER_BACKLINK_LIST_TAG);
    if (viewer.id) {
      component.setAttribute("viewer-id", viewer.id);
    }
    const passthroughAttributes = [
      "sort-key",
      "sort-order",
      "sort-type",
      "reload",
      "live",
      "path",
      "target",
      "current-path",
      "empty-label",
      "missing-label"
    ];
    passthroughAttributes.forEach((name) => {
      if (target.hasAttribute(name)) {
        component.setAttribute(name, target.getAttribute(name) || "");
      }
    });
    host.appendChild(component);
    target.replaceWith(host);
  });
};

const createAuthorModePlugin = () => {
  defineAutoIndexerAuthorPanelElement();
  defineAutoIndexerPageListElement();
  defineAutoIndexerBacklinkListElement();
  const runtime = {
    viewer: null,
    baseAutoIndexerOption: normalizeAutoIndexerOption({}, "main"),
    baseLocalEditorOption: normalizeLocalEditorOption({}),
    baseInlineExportOption: normalizeInlineExportOption({}),
    option: normalizeAutoIndexerOption({}, "main"),
    localEditorOption: normalizeLocalEditorOption({}),
    inlineExportOption: normalizeInlineExportOption({}),
    runtimeOverrideOption: normalizeRuntimeOverrideOption(null),
    deployConfig: { valid: false, entries: [] },
    authorModeEnabled: true,
    initialized: false,
    db: null,
    mode: RUNTIME_MODES.READER,
    startupState: STARTUP_STATES.NORMAL,
    dirty: false,
    ownerHash: "",
    sitemapOwnerHash: "",
    ownerMatched: false,
    salt: "",
    canInitializeOwner: false,
    localEditorReady: false,
    inlineExportReady: false,
    currentMarkdownPath: "",
    fileHandle: null,
    lastKnownRevision: 0,
    lastError: "",
    sitemapDocument: null
  };

  const runBootstrap = () => {
    const viewer = runtime.viewer;
    if (!viewer) {
      return Promise.resolve();
    }
    const authorMode = resolveAuthorModeSettings(viewer.option || {});
    const nextOption = normalizeAutoIndexerOption(authorMode.autoIndexerOption, viewer.id || "main");
    const nextLocalEditorOption = normalizeLocalEditorOption(authorMode.localEditorOption);
    const nextInlineExportOption = normalizeInlineExportOption(authorMode.inlineExportOption);
    const nextDeploy = normalizeDeployEntries(authorMode.deploy);
    const nextAuthorModeEnabled = authorMode.enabled === true;
    if (runtime.initialized) {
      const baseSnapshot = snapshotRuntimeBaseOption(runtime);
      const sameOption =
        baseSnapshot.authorModeEnabled === nextAuthorModeEnabled &&
        baseSnapshot.option.enabled === nextOption.enabled &&
        baseSnapshot.option.strict === nextOption.strict &&
        baseSnapshot.option.mode === nextOption.mode &&
        baseSnapshot.option.sitemapPath === nextOption.sitemapPath &&
        baseSnapshot.option.dbName === nextOption.dbName &&
        baseSnapshot.option.pbkdf2Iterations === nextOption.pbkdf2Iterations &&
        baseSnapshot.localEditorOption.enabled === nextLocalEditorOption.enabled &&
        baseSnapshot.localEditorOption.autoReload === nextLocalEditorOption.autoReload &&
        baseSnapshot.localEditorOption.reloadAfterSave === nextLocalEditorOption.reloadAfterSave &&
        baseSnapshot.inlineExportOption.enabled === nextInlineExportOption.enabled &&
        baseSnapshot.inlineExportOption.fileName === nextInlineExportOption.fileName &&
        baseSnapshot.inlineExportOption.queryParam === nextInlineExportOption.queryParam &&
        baseSnapshot.inlineExportOption.defaultPage === nextInlineExportOption.defaultPage &&
        baseSnapshot.inlineExportOption.viewerId === nextInlineExportOption.viewerId &&
        baseSnapshot.deployEntriesJson === JSON.stringify(nextDeploy.entries || []);
      if (sameOption) {
        return Promise.resolve();
      }
      if (runtime.db) {
        runtime.db.close();
      }
      runtime.db = null;
      runtime.fileHandle = null;
      runtime.initialized = false;
    }
    return bootstrap(runtime, viewer);
  };

  const handleContentEvent = async (payload) => {
    await runBootstrap();
    runtime.currentMarkdownPath = resolveCurrentMarkdownPath(runtime);
    runtime.localEditorReady = isLocalEditorAvailable(runtime);
    applyDocumentState(runtime);
    renderPageListEmbeds(runtime, payload);
    renderBacklinkListEmbeds(runtime, payload);
    dispatchSitemapEvent(runtime, "content-event");
    if (!runtime.option.enabled || runtime.mode !== RUNTIME_MODES.AUTHOR || !runtime.db) {
      return;
    }
    const context = resolvePayloadContext(payload);
    if (runtime.option.mode === REQUIRED_INCLUDE_MODE && String(context.mode || "") !== "include") {
      return;
    }
    await upsertPageFromView(runtime, payload);
  };

  return {
    name: "author-mode",
    onInit: ({ ctx }) => {
      runtime.viewer = ctx.getViewer();
    },
    onEvent: ({ event, payload, ctx }) => {
      runtime.viewer = ctx.getViewer();
      if (!REQUIRED_CONTENT_EVENTS.has(event)) {
        return;
      }
      handleContentEvent(payload).catch((error) => {
        console.error(error);
      });
    }
  };
};

export { createAuthorModePlugin };
