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
      : option.local_editor
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
      this.onEditClick = this.onEditClick.bind(this);
      this.onEditorSaveClick = this.onEditorSaveClick.bind(this);
      this.onEditorCloseClick = this.onEditorCloseClick.bind(this);
      this.onSettingsClick = this.onSettingsClick.bind(this);
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
      this.editButton = this.shadowRoot.querySelector('[data-action="edit"]');
      this.settingsButton = this.shadowRoot.querySelector('[data-action="settings"]');
      this.settingsDetails = this.shadowRoot.querySelector('[data-part="settings-details"]');
      this.setupHintElement = this.shadowRoot.querySelector('[data-part="setup-hint"]');
      this.editorPanelElement = this.shadowRoot.querySelector('[data-part="editor-panel"]');
      this.editorPathElement = this.shadowRoot.querySelector('[data-part="editor-path"]');
      this.editorTextarea = this.shadowRoot.querySelector('[data-part="editor-textarea"]');
      this.editorSaveButton = this.shadowRoot.querySelector('[data-action="editor-save"]');
      this.editorCloseButton = this.shadowRoot.querySelector('[data-action="editor-close"]');
    }

    bindEvents() {
      this.refreshButton.addEventListener("click", this.onRefreshClick);
      this.initializeButton.addEventListener("click", this.onInitializeClick);
      this.saveButton.addEventListener("click", this.onSaveClick);
      this.editButton.addEventListener("click", this.onEditClick);
      this.editorSaveButton.addEventListener("click", this.onEditorSaveClick);
      this.editorCloseButton.addEventListener("click", this.onEditorCloseClick);
      this.settingsButton.addEventListener("click", this.onSettingsClick);
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
      state.currentMarkdownPath = toTrimmedString(root.dataset.currentPath, "");
      return state;
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
      const currentMarkdownPath = toTrimmedString(safeState.currentMarkdownPath, "");
      const keepVisibleForEditor = isAuthor && localEditorEnabled;
      const hiddenByAutoHide = this.isAutoHideEnabled() && !dirty && startupState === STARTUP_STATES.NORMAL && !keepVisibleForEditor;
      const visible = (isAuthor || this.isReaderVisible() || onboardingActive) && !hiddenByAutoHide;
      this.panelElement.style.display = visible ? "block" : "none";
      this.panelElement.dataset.mode = isAuthor ? RUNTIME_MODES.AUTHOR : RUNTIME_MODES.READER;
      this.saveButton.disabled = !(isAuthor && dirty);
      this.editButton.hidden = !(isAuthor && localEditorEnabled);
      this.editButton.disabled = !(isAuthor && localEditorEnabled && localEditorReady);
      this.editButton.title = localEditorReady ? "" : "編集はローカル AUTHOR_MODE かつ File System Access API 対応ブラウザで利用できます。";
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
      if (shortError) {
        parts.push(`error: ${shortError}`);
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
  flex-wrap: wrap;
  align-items: center;
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
      <button type="button" data-action="save">sitemap保存</button>
      <button type="button" data-action="settings">ステータス</button>
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
  const page = {
    url: normalizedPath,
    title: sanitizeTitle(titleCandidate),
    lastModified: lastModified,
    indexing: true,
    links: links,
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
      currentMarkdownPath: runtime.currentMarkdownPath || ""
    };
  }
  await syncRuntimeFromStorage(runtime);
  evaluateMode(runtime);
  runtime.currentMarkdownPath = resolveCurrentMarkdownPath(runtime);
  runtime.localEditorReady = isLocalEditorAvailable(runtime);
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
    currentMarkdownPath: runtime.currentMarkdownPath || ""
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
    getSitemap: (option = {}) => getSitemap(runtime, option),
    saveSitemap: (option = {}) => saveSitemap(runtime, option),
    initializeOwner: (passphrase) => initializeOwner(runtime, passphrase),
    openLocalEditor: () => openLocalEditor(runtime),
    saveLocalEditor: (markdown, option = {}) => saveLocalEditor(runtime, markdown, option)
  };
  hostApi.authorMode = api;
  // Backward-compatible alias
  hostApi.autoIndexer = api;
};

const bootstrap = async (runtime, viewer) => {
  runtime.viewer = viewer;
  const authorMode = resolveAuthorModeSettings(viewer.option || {});
  runtime.authorModeEnabled = authorMode.enabled === true;
  runtime.option = normalizeAutoIndexerOption(authorMode.autoIndexerOption, viewer.id || "main");
  runtime.localEditorOption = normalizeLocalEditorOption(authorMode.localEditorOption);
  runtime.deployConfig = normalizeDeployEntries(authorMode.deploy);
  if (runtime.authorModeEnabled !== true) {
    runtime.option.enabled = false;
    runtime.localEditorOption.enabled = false;
  }
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
    option: normalizeAutoIndexerOption({}, "main"),
    localEditorOption: normalizeLocalEditorOption({}),
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
    const nextDeploy = normalizeDeployEntries(authorMode.deploy);
    const nextAuthorModeEnabled = authorMode.enabled === true;
    if (runtime.initialized) {
      const sameOption =
        runtime.authorModeEnabled === nextAuthorModeEnabled &&
        runtime.option.enabled === nextOption.enabled &&
        runtime.option.strict === nextOption.strict &&
        runtime.option.mode === nextOption.mode &&
        runtime.option.sitemapPath === nextOption.sitemapPath &&
        runtime.option.dbName === nextOption.dbName &&
        runtime.option.pbkdf2Iterations === nextOption.pbkdf2Iterations &&
        runtime.localEditorOption.enabled === nextLocalEditorOption.enabled &&
        runtime.localEditorOption.autoReload === nextLocalEditorOption.autoReload &&
        runtime.localEditorOption.reloadAfterSave === nextLocalEditorOption.reloadAfterSave &&
        JSON.stringify(runtime.deployConfig.entries || []) === JSON.stringify(nextDeploy.entries || []);
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
