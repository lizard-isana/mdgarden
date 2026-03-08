const SEARCH_COMPONENT_TAG = "mdg-search";
const SEARCH_STATE_EVENT = "mdgarden:search-state";
const SEARCH_DEFAULT_VIEWER_ID = "main";
const SEARCH_DEFAULT_PLACEHOLDER = "Search pages...";
const SEARCH_DEFAULT_MAX_RESULTS = 24;
const SEARCH_DEFAULT_SITEMAP_PATH = "sitemap.json";
const SEARCH_DEFAULT_INDEX_PATH = "search-index.json";

const toTrimmed = (value, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim();
};

const parsePositiveInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return Math.floor(n);
};

const normalizeQuery = (value) => {
  return String(value == null ? "" : value).trim().toLowerCase().replace(/\s+/g, " ");
};

const htmlDecode = (value) => {
  if (typeof document === "undefined" || !document || typeof document.createElement !== "function") {
    return String(value == null ? "" : value);
  }
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value == null ? "" : value);
  return textarea.value;
};

const stripFrontmatter = (markdown) => {
  const source = String(markdown == null ? "" : markdown);
  if (!source.startsWith("---")) {
    return source;
  }
  const matched = source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (!matched) {
    return source;
  }
  return source.slice(matched[0].length);
};

const markdownToSearchableText = (markdown) => {
  return stripFrontmatter(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>#-]+/g, " ")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const buildSearchEntries = (viewer) => {
  if (!viewer || typeof viewer.ReadInlinePageConfig !== "function" || typeof viewer.GetInlinePageMap !== "function") {
    return [];
  }
  const config = viewer.ReadInlinePageConfig();
  const pageMap = viewer.GetInlinePageMap(config.pageAttr);
  if (!pageMap || pageMap.size === 0) {
    return [];
  }
  const entries = [];
  pageMap.forEach((template, page) => {
    const pagePath = toTrimmed(String(page || ""), "");
    if (!pagePath) {
      return;
    }
    const title = template && template.dataset
      ? toTrimmed(template.dataset.title || "", "")
      : "";
    const resolvedTitle = title || pagePath;
    const rawMarkdown = template && typeof template.innerHTML === "string" ? template.innerHTML : "";
    const decodedMarkdown = htmlDecode(rawMarkdown);
    const text = markdownToSearchableText(decodedMarkdown);
    entries.push({
      page: pagePath,
      pageLower: pagePath.toLowerCase(),
      title: resolvedTitle,
      titleLower: resolvedTitle.toLowerCase(),
      text: text,
      searchable: `${pagePath} ${resolvedTitle} ${text}`.toLowerCase()
    });
  });
  entries.sort((a, b) => a.page.localeCompare(b.page));
  return entries;
};

const isIncludeMode = (viewer) => {
  if (!viewer) {
    return false;
  }
  if (typeof viewer.getAttribute === "function" && toTrimmed(viewer.getAttribute("src"), "") !== "") {
    return true;
  }
  return !!(viewer.option && viewer.option.mode === "include");
};

const resolveSearchPluginOption = (viewer) => {
  if (!viewer || !viewer.option || typeof viewer.option !== "object") {
    return {};
  }
  const plugins = viewer.option.plugins && typeof viewer.option.plugins === "object" ? viewer.option.plugins : {};
  return plugins.search && typeof plugins.search === "object"
    ? plugins.search
    : {};
};

const resolveSitemapPath = (viewer) => {
  if (!viewer || !viewer.option || typeof viewer.option !== "object") {
    return SEARCH_DEFAULT_SITEMAP_PATH;
  }
  const pluginOption = resolveSearchPluginOption(viewer);
  const explicit = toTrimmed(pluginOption.sitemap_path || pluginOption.sitemapPath || "", "");
  if (explicit) {
    return explicit;
  }
  const authorMode = viewer.option.author_mode && typeof viewer.option.author_mode === "object"
    ? viewer.option.author_mode
    : {};
  const autoIndexer = authorMode.auto_indexer && typeof authorMode.auto_indexer === "object"
    ? authorMode.auto_indexer
    : {};
  const fromAuthorMode = toTrimmed(autoIndexer.sitemap_path || autoIndexer.sitemapPath || "", "");
  return fromAuthorMode || SEARCH_DEFAULT_SITEMAP_PATH;
};

const resolveSearchIndexPath = (viewer) => {
  const pluginOption = resolveSearchPluginOption(viewer);
  const explicit = toTrimmed(pluginOption.index_path || pluginOption.indexPath || "", "");
  return explicit || SEARCH_DEFAULT_INDEX_PATH;
};

const normalizeSearchIndexEntries = (rawDocument) => {
  const documentData = rawDocument && typeof rawDocument === "object" ? rawDocument : {};
  const rawPages = Array.isArray(documentData.pages) ? documentData.pages : null;
  if (!rawPages) {
    return {
      entries: [],
      hasPages: false,
      signature: ""
    };
  }
  const entries = [];
  rawPages.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const page = toTrimmed(String(item.p || item.page || ""), "");
    if (!page) {
      return;
    }
    const title = toTrimmed(String(item.t || item.title || ""), "") || page;
    const text = toTrimmed(String(item.s || item.text || item.searchable || ""), "");
    entries.push({
      page: page,
      pageLower: page.toLowerCase(),
      title: title,
      titleLower: title.toLowerCase(),
      text: text,
      searchable: `${page} ${title} ${text}`.toLowerCase()
    });
  });
  entries.sort((a, b) => a.page.localeCompare(b.page));
  const source = documentData.source && typeof documentData.source === "object" ? documentData.source : {};
  const sourcePath = toTrimmed(source.sitemapPath || source.sitemap_path || "", "");
  const sourceSignature = toTrimmed(source.signature || "", "");
  const generatedAt = toTrimmed(documentData.generatedAt || "", "");
  const signature = [
    "index",
    sourcePath,
    sourceSignature,
    generatedAt,
    String(entries.length)
  ].join("|");
  return {
    entries: entries,
    hasPages: true,
    signature: signature
  };
};

const buildIncludeSitemapSignature = (pagesObject) => {
  const pages = pagesObject && typeof pagesObject === "object" ? pagesObject : {};
  const records = Object.keys(pages).sort().map((path) => {
    const page = pages[path] && typeof pages[path] === "object" ? pages[path] : {};
    return [
      path,
      toTrimmed(page.title || "", ""),
      toTrimmed(page.lastModified || "", "")
    ].join("|");
  });
  return records.join("\n");
};

const resolveIncludeSourcePath = (viewer, pagePath) => {
  const raw = toTrimmed(String(pagePath || ""), "");
  if (!raw) {
    return "";
  }
  if (!viewer || typeof viewer.ResolveMarkdownTarget !== "function") {
    return raw;
  }
  const normalized = toTrimmed(viewer.ResolveMarkdownTarget(raw, ""), "") || raw;
  if (typeof viewer.ResolveIncludeFilePath === "function") {
    return toTrimmed(viewer.ResolveIncludeFilePath(normalized), "") || normalized;
  }
  return normalized;
};

const fetchIncludeEntries = async (viewer, pagesObject) => {
  const pages = pagesObject && typeof pagesObject === "object" ? pagesObject : {};
  const paths = Object.keys(pages).sort();
  const entries = [];
  for (const path of paths) {
    const sourcePath = resolveIncludeSourcePath(viewer, path);
    if (!sourcePath) {
      continue;
    }
    try {
      const response = await fetch(sourcePath, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      const markdown = await response.text();
      const page = pages[path] && typeof pages[path] === "object" ? pages[path] : {};
      const title = toTrimmed(page.title || "", "") || path;
      const text = markdownToSearchableText(markdown);
      entries.push({
        page: path,
        pageLower: path.toLowerCase(),
        title: title,
        titleLower: title.toLowerCase(),
        text: text,
        searchable: `${path} ${title} ${text}`.toLowerCase()
      });
    } catch (_error) {
      // Ignore per-page fetch failures to keep partial search availability.
    }
  }
  entries.sort((a, b) => a.page.localeCompare(b.page));
  return entries;
};

const extractSnippet = (entry, needle) => {
  const text = entry && entry.text ? entry.text : (entry && entry.page ? entry.page : "");
  const normalizedNeedle = normalizeQuery(needle);
  if (!normalizedNeedle) {
    return text.slice(0, 120);
  }
  const lower = text.toLowerCase();
  const index = lower.indexOf(normalizedNeedle);
  const start = index >= 0 ? Math.max(0, index - 36) : 0;
  const end = Math.min(text.length, start + 120);
  const chunk = text.slice(start, end).trim();
  if (!chunk) {
    return entry.page;
  }
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${chunk}${suffix}`;
};

const searchEntries = (entries, query, limit = SEARCH_DEFAULT_MAX_RESULTS) => {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return [];
  }
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }
  const result = [];
  entries.forEach((entry) => {
    for (const token of tokens) {
      if (!entry.searchable.includes(token)) {
        return;
      }
    }
    let score = 0;
    if (entry.pageLower === normalized) {
      score += 120;
    }
    if (entry.titleLower === normalized) {
      score += 100;
    }
    if (entry.titleLower.startsWith(normalized)) {
      score += 70;
    }
    if (entry.pageLower.startsWith(normalized)) {
      score += 60;
    }
    if (entry.titleLower.includes(normalized)) {
      score += 40;
    }
    if (entry.pageLower.includes(normalized)) {
      score += 30;
    }
    const firstPos = entry.searchable.indexOf(tokens[0]);
    if (firstPos >= 0) {
      score += Math.max(0, 25 - Math.floor(firstPos / 24));
    }
    score += Math.min(20, tokens.length * 4);
    result.push({
      page: entry.page,
      title: entry.title,
      snippet: extractSnippet(entry, tokens[0]),
      score: score
    });
  });
  result.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.page.localeCompare(b.page);
  });
  return result.slice(0, parsePositiveInt(limit, SEARCH_DEFAULT_MAX_RESULTS));
};

const dispatchSearchState = (detail) => {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent !== "function") {
    return;
  }
  window.dispatchEvent(new CustomEvent(SEARCH_STATE_EVENT, {
    detail: detail
  }));
};

const defineSearchElement = () => {
  if (typeof window === "undefined" || typeof HTMLElement !== "function" || !window.customElements) {
    return;
  }
  if (window.customElements.get(SEARCH_COMPONENT_TAG)) {
    return;
  }

  class SearchElement extends HTMLElement {
    constructor() {
      super();
      this.onInput = this.onInput.bind(this);
      this.onClear = this.onClear.bind(this);
      this.onGlobalStateChange = this.onGlobalStateChange.bind(this);
    }

    connectedCallback() {
      this.classList.add("mdg-search-host");
      this.render();
      this.bindElements();
      this.bindEvents();
      this.refresh();
    }

    disconnectedCallback() {
      if (this.inputElement) {
        this.inputElement.removeEventListener("input", this.onInput);
      }
      if (this.clearButton) {
        this.clearButton.removeEventListener("click", this.onClear);
      }
      window.removeEventListener(SEARCH_STATE_EVENT, this.onGlobalStateChange);
    }

    static get observedAttributes() {
      return ["viewer-id", "viewer", "placeholder", "max-results"];
    }

    attributeChangedCallback() {
      if (!this.isConnected) {
        return;
      }
      this.render();
      this.bindElements();
      this.bindEvents();
      this.refresh();
    }

    getViewerId() {
      const explicit = toTrimmed(this.getAttribute("viewer-id") || this.getAttribute("viewer"), "");
      return explicit || SEARCH_DEFAULT_VIEWER_ID;
    }

    getMaxResults() {
      return parsePositiveInt(this.getAttribute("max-results"), SEARCH_DEFAULT_MAX_RESULTS);
    }

    getPlaceholder() {
      return toTrimmed(this.getAttribute("placeholder"), SEARCH_DEFAULT_PLACEHOLDER) || SEARCH_DEFAULT_PLACEHOLDER;
    }

    getApi() {
      const viewerId = this.getViewerId();
      if (!window.MDGarden || !window.MDGarden[viewerId]) {
        return null;
      }
      return window.MDGarden[viewerId].search || null;
    }

    bindElements() {
      this.inputElement = this.querySelector('[data-part="input"]');
      this.clearButton = this.querySelector('[data-action="clear"]');
      this.statusElement = this.querySelector('[data-part="status"]');
      this.resultsElement = this.querySelector('[data-part="results"]');
      this.emptyElement = this.querySelector('[data-part="empty"]');
      this.listElement = this.querySelector('[data-part="list"]');
    }

    bindEvents() {
      if (this.inputElement) {
        this.inputElement.removeEventListener("input", this.onInput);
        this.inputElement.addEventListener("input", this.onInput);
      }
      if (this.clearButton) {
        this.clearButton.removeEventListener("click", this.onClear);
        this.clearButton.addEventListener("click", this.onClear);
      }
      window.removeEventListener(SEARCH_STATE_EVENT, this.onGlobalStateChange);
      window.addEventListener(SEARCH_STATE_EVENT, this.onGlobalStateChange);
    }

    setReadyCount(value) {
      const count = parsePositiveInt(value, 0);
      const readyValue = String(count);
      this.setAttribute("data-ready", readyValue);
      if (this.statusElement) {
        this.statusElement.setAttribute("data-ready", readyValue);
      }
    }

    clearReadyCount() {
      this.removeAttribute("data-ready");
      if (this.statusElement) {
        this.statusElement.removeAttribute("data-ready");
      }
    }

    refresh() {
      if (!this.resultsElement || !this.listElement || !this.emptyElement) {
        return;
      }
      const api = this.getApi();
      if (!api || typeof api.getEntryCount !== "function") {
        this.clearReadyCount();
        if (this.statusElement) {
          this.statusElement.textContent = "unavailable";
        }
        this.resultsElement.hidden = true;
        this.listElement.textContent = "";
        this.emptyElement.hidden = true;
        return;
      }
      if (typeof api.isLoading === "function" && api.isLoading()) {
        this.clearReadyCount();
        if (this.statusElement) {
          this.statusElement.textContent = "indexing...";
        }
      } else {
        const count = api.getEntryCount();
        this.setReadyCount(count);
        if (this.statusElement) {
          this.statusElement.textContent = "";
        }
      }
      this.runSearch();
    }

    getStatusLabel(api) {
      if (!api || typeof api.getEntryCount !== "function") {
        this.clearReadyCount();
        return "unavailable";
      }
      if (typeof api.isLoading === "function" && api.isLoading()) {
        this.clearReadyCount();
        return "indexing...";
      }
      if (typeof api.getLastError === "function") {
        const error = toTrimmed(api.getLastError(), "");
        if (error) {
          this.clearReadyCount();
          return "error";
        }
      }
      const count = api.getEntryCount();
      this.setReadyCount(count);
      return "";
    }

    onGlobalStateChange(event) {
      const detail = event && event.detail ? event.detail : {};
      const viewerId = toTrimmed(String(detail.viewerId || ""), "");
      if (viewerId && viewerId !== this.getViewerId()) {
        return;
      }
      this.refresh();
    }

    onInput() {
      this.runSearch();
    }

    onClear() {
      if (!this.inputElement) {
        return;
      }
      this.inputElement.value = "";
      this.runSearch();
      this.inputElement.focus();
    }

    clearSearchResults() {
      if (!this.inputElement) {
        return;
      }
      this.inputElement.value = "";
      this.runSearch();
    }

    openPage(page) {
      const api = this.getApi();
      if (!api || typeof api.openPage !== "function") {
        return;
      }
      api.openPage(page, { history: "push" });
    }

    runSearch() {
      if (!this.inputElement || !this.resultsElement || !this.listElement || !this.emptyElement) {
        return;
      }
      const api = this.getApi();
      if (!api || typeof api.search !== "function" || typeof api.getEntryCount !== "function") {
        this.clearReadyCount();
        if (this.statusElement) {
          this.statusElement.textContent = "unavailable";
        }
        this.resultsElement.hidden = true;
        this.listElement.textContent = "";
        this.emptyElement.hidden = true;
        return;
      }
      const query = normalizeQuery(this.inputElement.value);
      if (!query) {
        if (this.statusElement) {
          this.statusElement.textContent = this.getStatusLabel(api);
        } else {
          this.getStatusLabel(api);
        }
        this.resultsElement.hidden = true;
        this.listElement.textContent = "";
        this.emptyElement.hidden = true;
        return;
      }
      const matches = api.search(query, { limit: this.getMaxResults() });
      const total = api.getEntryCount();
      this.setReadyCount(total);
      if (this.statusElement) {
        this.statusElement.textContent = `${matches.length}/${total}`;
      }
      this.resultsElement.hidden = false;
      this.listElement.textContent = "";
      this.emptyElement.hidden = matches.length > 0;
      matches.forEach((item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "result-item";
        button.addEventListener("click", () => {
          this.clearSearchResults();
          this.openPage(item.page);
        });

        const title = document.createElement("span");
        title.className = "result-title";
        title.textContent = item.title;

        const meta = document.createElement("span");
        meta.className = "result-meta";
        meta.textContent = `${item.page} - ${item.snippet}`;

        button.appendChild(title);
        button.appendChild(meta);
        li.appendChild(button);
        this.listElement.appendChild(li);
      });
    }

    render() {
      const placeholder = this.getPlaceholder();
      this.innerHTML = `
<style>
.mdg-search-host {
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
}
.mdg-search-host .panel {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 8px;
  /*
  border: 1px solid #d1d5db;
  border-radius: 8px;
  */
  background: #ffffff;
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.mdg-search-host .bar {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.mdg-search-host .input {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: 0;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 7px 9px;
  font-size: 13px;
  color: #0f172a;
  background: #ffffff;
}
.mdg-search-host .clear {
  appearance: none;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
  color: #334155;
  padding: 7px 10px;
  font-size: 12px;
  cursor: pointer;
}
.mdg-search-host .status {
  /* display: none; */
  flex: 0 0 auto;
  min-width: 76px;
  text-align: right;
  color: #64748b;
  font-size: 12px;
}
.mdg-search-host .results {
  margin-top: 8px;
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
}
.mdg-search-host .list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow: auto;
}
.mdg-search-host .result-item {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  padding: 7px 8px;
  cursor: pointer;
  color: #0f172a;
}
.mdg-search-host .result-item:hover {
  background: #f8fafc;
  border-color: #93c5fd;
}
.mdg-search-host .result-title {
  font-size: 13px;
  font-weight: 600;
}
.mdg-search-host .result-meta {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mdg-search-host .empty {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}
</style>
<div class="panel">
  <div class="bar">
    <input class="input" data-part="input" type="search" placeholder="${placeholder}" spellcheck="false" autocomplete="off">
    <button class="clear" data-action="clear" type="button">Clear</button>
    <span class="status" data-part="status" aria-hidden="true"></span>
  </div>
  <div class="results" data-part="results" hidden>
    <ul class="list" data-part="list"></ul>
    <p class="empty" data-part="empty" hidden>No matches</p>
  </div>
</div>
      `;
    }
  }

  window.customElements.define(SEARCH_COMPONENT_TAG, SearchElement);
};

const createSearchPlugin = () => {
  defineSearchElement();
  const runtime = {
    viewer: null,
    entries: [],
    loading: false,
    mode: "embedded",
    indexSignature: "",
    lastError: "",
    refreshToken: 0
  };

  const scrollViewportToTop = () => {
    try {
      window.scroll({
        top: 0,
        left: 0,
        behavior: "instant"
      });
      return;
    } catch (_error) {
      // Fallback for browsers that do not support the options object.
    }
    window.scrollTo(0, 0);
  };

  const dispatchState = () => {
    const viewerId = runtime.viewer && runtime.viewer.id ? runtime.viewer.id : "";
    dispatchSearchState({
      viewerId: viewerId,
      entryCount: runtime.entries.length,
      loading: runtime.loading,
      mode: runtime.mode,
      error: runtime.lastError
    });
  };

  const refreshIndex = async (option = {}) => {
    const force = option.force === true;
    const viewer = runtime.viewer;
    if (!viewer) {
      runtime.entries = [];
      runtime.loading = false;
      runtime.mode = "embedded";
      runtime.indexSignature = "";
      runtime.lastError = "";
      dispatchState();
      return runtime.entries;
    }

    const nextToken = runtime.refreshToken + 1;
    runtime.refreshToken = nextToken;
    runtime.loading = true;
    runtime.lastError = "";
    runtime.mode = isIncludeMode(viewer) ? "include" : "embedded";
    dispatchState();

    try {
      if (runtime.mode === "include") {
        let loadedFromSearchIndex = false;
        const searchIndexPath = resolveSearchIndexPath(viewer);
        if (searchIndexPath) {
          try {
            const indexResponse = await fetch(searchIndexPath, { cache: "no-store" });
            if (indexResponse.ok) {
              const indexDocument = await indexResponse.json();
              const parsed = normalizeSearchIndexEntries(indexDocument);
              if (parsed.hasPages) {
                if (!force && runtime.indexSignature === parsed.signature && runtime.entries.length > 0) {
                  runtime.lastError = "";
                } else {
                  runtime.entries = parsed.entries;
                  runtime.indexSignature = parsed.signature;
                  runtime.lastError = "";
                }
                loadedFromSearchIndex = true;
              }
            }
          } catch (_error) {
            // Fallback to sitemap-based indexing.
          }
        }
        if (!loadedFromSearchIndex) {
          const sitemapPath = resolveSitemapPath(viewer);
          const response = await fetch(sitemapPath, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`Failed to load sitemap: ${sitemapPath} (${response.status})`);
          }
          const sitemap = await response.json();
          const pages = sitemap && typeof sitemap === "object" && sitemap.pages && typeof sitemap.pages === "object"
            ? sitemap.pages
            : {};
          const signature = buildIncludeSitemapSignature(pages);
          if (!force && runtime.indexSignature === signature && runtime.entries.length > 0) {
            runtime.lastError = "";
          } else {
            runtime.entries = await fetchIncludeEntries(viewer, pages);
            runtime.indexSignature = signature;
            runtime.lastError = "";
          }
        }
      } else {
        runtime.entries = buildSearchEntries(viewer);
        runtime.indexSignature = "";
        runtime.lastError = "";
      }
    } catch (error) {
      runtime.lastError = error && error.message ? error.message : "Failed to build search index.";
    } finally {
      if (runtime.refreshToken !== nextToken) {
        return runtime.entries;
      }
      runtime.loading = false;
      dispatchState();
    }
    return runtime.entries;
  };

  const getEntries = () => {
    return Array.isArray(runtime.entries) ? runtime.entries : [];
  };

  const getEntryCount = () => {
    return getEntries().length;
  };

  const search = (query, option = {}) => {
    const limit = parsePositiveInt(option.limit, SEARCH_DEFAULT_MAX_RESULTS);
    return searchEntries(getEntries(), query, limit);
  };

  const openPage = (page, option = {}) => {
    const viewer = runtime.viewer;
    if (!viewer) {
      return null;
    }

    const target = toTrimmed(String(page || ""), "");
    if (!target) {
      return null;
    }

    scrollViewportToTop();

    if (runtime.mode === "include" || (viewer.getAttribute && viewer.getAttribute("src"))) {
      if (typeof viewer.load !== "function") {
        return null;
      }
      let normalized = target;
      if (typeof viewer.ResolveMarkdownTarget === "function") {
        const fromRoot = toTrimmed(viewer.ResolveMarkdownTarget(target, ""), "");
        if (fromRoot) {
          normalized = fromRoot;
        } else {
          const current = viewer.viewerState && viewer.viewerState.currentDocPath
            ? String(viewer.viewerState.currentDocPath || "")
            : "";
          normalized = toTrimmed(viewer.ResolveMarkdownTarget(target, current), "") || "";
        }
      }
      if (!normalized) {
        return null;
      }
      viewer.dataset.status = "reloading";
      viewer.load(normalized, { normalized: true });
      if (option.updateUrl !== false && typeof viewer.BuildViewerUrl === "function") {
        const url = viewer.BuildViewerUrl(normalized);
        if (option.history === "replace") {
          window.history.replaceState(null, "", url);
        } else {
          window.history.pushState(null, "", url);
        }
      }
      return normalized;
    }

    if (typeof viewer.setPage !== "function") {
      return null;
    }
    return viewer.setPage(target, {
      reload: true,
      updateUrl: option.updateUrl !== false,
      history: option.history === "replace" ? "replace" : "push"
    });
  };

  const installApi = () => {
    const viewer = runtime.viewer;
    if (!viewer || !viewer.id || !window.MDGarden || !window.MDGarden[viewer.id]) {
      return;
    }
    const api = window.MDGarden[viewer.id];
    api.search = {
      refreshIndex: refreshIndex,
      getEntries: () => [...getEntries()],
      getEntryCount: getEntryCount,
      isLoading: () => runtime.loading === true,
      getMode: () => runtime.mode,
      getLastError: () => runtime.lastError,
      search: search,
      openPage: openPage
    };
  };

  return {
    name: "search",
    onInit: ({ ctx }) => {
      runtime.viewer = ctx.getViewer();
      installApi();
      refreshIndex().catch((error) => {
        console.error(error);
      });
    },
    onEvent: ({ event, ctx }) => {
      runtime.viewer = ctx.getViewer();
      if (event !== "content_loaded" && event !== "content_reloaded") {
        return;
      }
      installApi();
      refreshIndex().catch((error) => {
        console.error(error);
      });
    }
  };
};

export { createSearchPlugin };
