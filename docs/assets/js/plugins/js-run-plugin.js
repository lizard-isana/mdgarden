import { resolveSandboxLibraryConfig, parseRequestedLibraries } from './js-sandbox-library-config.js';

const JS_RUN_TIMEOUT_MS = 1500;
const JS_RUN_MAX_OUTPUT_BYTES = 64 * 1024;
const JS_RUN_MAX_OUTPUT_LINES = 200;
const JS_RUN_IFRAME_HEIGHT = 300;
const JS_RUN_IFRAME_MIN_HEIGHT = 220;
const JS_RUN_RENDERED_FLAG = 'true';
const JS_RUN_LANG_ALIASES = new Set(['js-run', 'js:run']);
const JS_RUN_DEFAULT_LIBRARY_REGISTRY = Object.freeze({
  mathjs: Object.freeze({
    global: 'math',
    urls: Object.freeze([
      'https://cdnjs.cloudflare.com/ajax/libs/mathjs/14.8.1/math.min.js',
      'https://cdn.jsdelivr.net/npm/mathjs@15.1.1/lib/browser/math.js'
    ])
  }),
  decimal: Object.freeze({
    global: 'Decimal',
    urls: Object.freeze([
      'https://cdnjs.cloudflare.com/ajax/libs/decimal.js/10.6.0/decimal.min.js',
      'https://cdn.jsdelivr.net/npm/decimal.js@10.6.0/decimal.js'
    ])
  })
});

const JS_RUN_WORKER_PREFIX = `
const NETWORK_DISABLED_ERROR = 'Network APIs are disabled in this sandbox.';

const safeSerialize = (value) => {
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    try {
      return String(value);
    } catch (_error) {
      return '[unserializable value]';
    }
  }
};

const formatError = (error) => {
  if (!error) {
    return 'Unknown error';
  }
  if (error.stack) {
    return String(error.stack);
  }
  if (error.message) {
    return String(error.message);
  }
  return String(error);
};

const emit = (kind, message) => {
  self.postMessage({
    kind: kind,
    message: safeSerialize(message)
  });
};

const consoleProxy = {
  log: (...args) => emit('log', args),
  info: (...args) => emit('info', args),
  warn: (...args) => emit('warn', args),
  error: (...args) => emit('error', args)
};
self.console = consoleProxy;

const disableNetworkApis = () => {
  const disabledSync = () => {
    throw new Error(NETWORK_DISABLED_ERROR);
  };
  const disabledAsync = () => Promise.reject(new Error(NETWORK_DISABLED_ERROR));

  self.fetch = disabledAsync;
  self.XMLHttpRequest = function () {
    disabledSync();
  };
  self.WebSocket = function () {
    disabledSync();
  };
  self.EventSource = function () {
    disabledSync();
  };
  self.importScripts = function () {
    disabledSync();
  };
  if (self.navigator && typeof self.navigator.sendBeacon === 'function') {
    self.navigator.sendBeacon = function () {
      return false;
    };
  }
};

const loadRequestedLibraries = async () => {
  const loaded = {};
  const requested = Array.isArray(__requestedLibraries) ? __requestedLibraries : [];
  const registry = __libraryRegistry && typeof __libraryRegistry === 'object' ? __libraryRegistry : {};

  for (const name of requested) {
    const entry = registry[name];
    if (!entry || !Array.isArray(entry.urls)) {
      throw new Error('Unsupported library: ' + name);
    }
    let lastError = null;
    for (const url of entry.urls) {
      try {
        importScripts(url);
        const exported = entry.global && self[entry.global] !== undefined ? self[entry.global] : null;
        if (exported == null) {
          throw new Error('Global not found for library: ' + name);
        }
        loaded[name] = exported;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) {
      throw lastError;
    }
  }

  return loaded;
};

const buildApi = (loadedLibraries) => {
  return {
    libs: loadedLibraries,
    math: loadedLibraries.mathjs || (typeof self.math !== 'undefined' ? self.math : null),
    Decimal: loadedLibraries.decimal || (typeof self.Decimal !== 'undefined' ? self.Decimal : null),
    log: (...args) => emit('log', args)
  };
};

const __runUserCode = async (api) => {
  "use strict";
`;

const JS_RUN_WORKER_SUFFIX = `
};

const run = async () => {
  emit('status', 'loading');
  const loadedLibraries = await loadRequestedLibraries();
  disableNetworkApis();
  emit('status', 'running');
  const result = await __runUserCode(buildApi(loadedLibraries));
  self.postMessage({ kind: 'done', message: safeSerialize(result) });
  self.postMessage({ kind: 'status', message: 'done' });
};

Promise.resolve()
  .then(run)
  .catch((error) => {
    self.postMessage({ kind: 'runtime_error', message: formatError(error) });
    self.postMessage({ kind: 'status', message: 'error' });
  });
`;

const resolvePayloadRoot = (payload) => {
  if (payload && payload.target && payload.target.nodeType === 1) {
    return payload.target;
  }
  if (payload && payload.nodeType === 1) {
    return payload;
  }
  return null;
};

const isJsRunCodeBlock = (codeBlock) => {
  if (!codeBlock || !codeBlock.classList) {
    return false;
  }
  for (const className of codeBlock.classList) {
    if (!className.startsWith('language-')) {
      continue;
    }
    const language = className.slice('language-'.length);
    if (JS_RUN_LANG_ALIASES.has(language)) {
      return true;
    }
  }
  return false;
};

const utf8ToBase64 = (text) => {
  const bytes = new TextEncoder().encode(String(text || ''));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const buildSandboxCsp = (trustedOrigins) => {
  const originPart = Array.isArray(trustedOrigins) && trustedOrigins.length > 0
    ? ` ${trustedOrigins.join(' ')}`
    : '';
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "connect-src 'none'",
    "img-src data:",
    "style-src 'unsafe-inline'",
    `script-src 'unsafe-inline'${originPart}`,
    `script-src-elem 'unsafe-inline'${originPart}`,
    "worker-src blob:",
    "child-src blob:"
  ].join('; ');
};

const createSandboxDocument = (code, requestedLibraries, libraryRegistry, trustedOrigins) => {
  const encodedCode = utf8ToBase64(code);
  const libLabel = requestedLibraries.length > 0 ? requestedLibraries.join(', ') : 'none';
  const sandboxCsp = buildSandboxCsp(trustedOrigins);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${sandboxCsp}">
    <style>
      :root {
        color-scheme: light;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #f8fafc;
        color: #0f172a;
      }
      .shell {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
        gap: 8px;
      }
      .tabs {
        display: flex;
        gap: 6px;
      }
      .tab {
        appearance: none;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #334155;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .tab.is-active {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1e3a8a;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .run-button {
        appearance: none;
        border: 1px solid #1d4ed8;
        background: #2563eb;
        color: #f8fafc;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .run-button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .status {
        min-width: 52px;
        text-align: right;
        font-size: 12px;
        color: #64748b;
      }
      .panel {
        margin: 0;
        padding: 10px;
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 12px;
        line-height: 1.45;
        background: #ffffff;
        color: #0f172a;
        display: none;
      }
      .panel.is-active {
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="toolbar">
        <div class="tabs">
          <button type="button" id="tab-code" class="tab is-active">Code</button>
          <button type="button" id="tab-result" class="tab">Result</button>
        </div>
        <div class="actions">
          <span class="status">libs: ${libLabel}</span>
          <button type="button" id="run" class="run-button">Run</button>
          <span id="status" class="status">idle</span>
        </div>
      </div>
      <pre id="panel-code" class="panel is-active"></pre>
      <pre id="panel-result" class="panel"></pre>
    </div>
    <script>
      (function () {
        const encodedCode = ${JSON.stringify(encodedCode)};
        const workerPrefix = ${JSON.stringify(JS_RUN_WORKER_PREFIX)};
        const workerSuffix = ${JSON.stringify(JS_RUN_WORKER_SUFFIX)};
        const requestedLibraries = ${JSON.stringify(requestedLibraries)};
        const libraryRegistry = ${JSON.stringify(libraryRegistry)};
        const maxOutputBytes = ${JS_RUN_MAX_OUTPUT_BYTES};
        const maxOutputLines = ${JS_RUN_MAX_OUTPUT_LINES};
        const timeoutMs = ${JS_RUN_TIMEOUT_MS};

        const decodeBase64Utf8 = (encoded) => {
          const binary = atob(encoded);
          const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
          return new TextDecoder().decode(bytes);
        };

        const tabCode = document.getElementById('tab-code');
        const tabResult = document.getElementById('tab-result');
        const panelCode = document.getElementById('panel-code');
        const panelResult = document.getElementById('panel-result');
        const runButton = document.getElementById('run');
        const statusNode = document.getElementById('status');
        const encoder = new TextEncoder();
        let activeWorker = null;
        let activeTimer = null;
        let outputBytes = 0;
        let outputLines = 0;
        let outputClosed = false;

        const setTab = (name) => {
          const codeActive = name === 'code';
          tabCode.classList.toggle('is-active', codeActive);
          tabResult.classList.toggle('is-active', !codeActive);
          panelCode.classList.toggle('is-active', codeActive);
          panelResult.classList.toggle('is-active', !codeActive);
        };

        const appendLine = (prefix, message) => {
          if (outputClosed) {
            return;
          }
          const nextLine = prefix + String(message == null ? '' : message);
          const nextBytes = encoder.encode(nextLine + '\\n').length;
          if (outputLines >= maxOutputLines || outputBytes + nextBytes > maxOutputBytes) {
            outputClosed = true;
            panelResult.textContent += (panelResult.textContent ? '\\n' : '') + '[system] output limit reached';
            return;
          }
          outputLines += 1;
          outputBytes += nextBytes;
          panelResult.textContent += (panelResult.textContent ? '\\n' : '') + nextLine;
        };

        const setStatus = (value) => {
          statusNode.textContent = value;
        };

        const setRunning = (running) => {
          runButton.disabled = running;
        };

        const stopExecution = (state) => {
          if (activeWorker) {
            activeWorker.terminate();
            activeWorker = null;
          }
          if (activeTimer) {
            clearTimeout(activeTimer);
            activeTimer = null;
          }
          setRunning(false);
          if (state) {
            setStatus(state);
          }
        };

        const resetResult = () => {
          panelResult.textContent = '';
          outputBytes = 0;
          outputLines = 0;
          outputClosed = false;
        };

        const code = decodeBase64Utf8(encodedCode);
        panelCode.textContent = code;

        const runExecution = () => {
          stopExecution();
          resetResult();
          setTab('result');
          setStatus('running');
          setRunning(true);
          if (requestedLibraries.length > 0) {
            appendLine('[system] ', 'libs: ' + requestedLibraries.join(', '));
          }

          const workerConfig =
            'const __requestedLibraries = ' + JSON.stringify(requestedLibraries) + ';\\n' +
            'const __libraryRegistry = ' + JSON.stringify(libraryRegistry) + ';';
          const workerSource = workerConfig + '\\n' + workerPrefix + '\\n' + code + '\\n' + workerSuffix;
          let workerUrl = null;
          let worker = null;
          try {
            const blob = new Blob([workerSource], { type: 'text/javascript' });
            workerUrl = URL.createObjectURL(blob);
            worker = new Worker(workerUrl, { name: 'mdgarden-js-runner' });
          } catch (error) {
            if (workerUrl) {
              URL.revokeObjectURL(workerUrl);
            }
            appendLine('[system] ', error && error.message ? error.message : 'failed to start worker');
            stopExecution('error');
            return;
          }
          URL.revokeObjectURL(workerUrl);
          activeWorker = worker;

          worker.onmessage = (event) => {
            if (worker !== activeWorker) {
              return;
            }
            const data = event.data || {};
            const kind = data.kind;
            const message = data.message;
            if (kind === 'log' || kind === 'info') {
              appendLine('[log] ', message);
              return;
            }
            if (kind === 'warn') {
              appendLine('[warn] ', message);
              return;
            }
            if (kind === 'error') {
              appendLine('[error] ', message);
              return;
            }
            if (kind === 'runtime_error') {
              appendLine('[runtime] ', message);
              stopExecution('error');
              return;
            }
            if (kind === 'status') {
              const status = String(message || '');
              if (status) {
                setStatus(status);
              }
              if (status === 'done' || status === 'error') {
                stopExecution(status);
              }
              return;
            }
            if (kind === 'done') {
              appendLine('[result] ', message);
              stopExecution('done');
            }
          };

          worker.onerror = (event) => {
            if (worker !== activeWorker) {
              return;
            }
            appendLine('[worker] ', event && event.message ? event.message : 'worker error');
            stopExecution('error');
          };

          activeTimer = setTimeout(() => {
            if (worker !== activeWorker) {
              return;
            }
            appendLine('[system] ', 'execution timed out');
            stopExecution('timeout');
          }, timeoutMs);
        };

        tabCode.addEventListener('click', () => {
          setTab('code');
        });
        tabResult.addEventListener('click', () => {
          setTab('result');
        });
        runButton.addEventListener('click', () => {
          runExecution();
        });

        window.addEventListener('beforeunload', () => {
          stopExecution();
        });

        setTab('code');
        resetResult();
        setRunning(false);
        setStatus('idle');
      })();
    </script>
  </body>
</html>`;
};

const renderJsRunBlocks = (root, libraryRegistry, trustedOrigins) => {
  const codeBlocks = root.querySelectorAll('code[class*="language-"]');
  codeBlocks.forEach((codeBlock) => {
    if (!isJsRunCodeBlock(codeBlock)) {
      return;
    }
    if (codeBlock.dataset.mdgardenJsRunRendered === JS_RUN_RENDERED_FLAG) {
      return;
    }
    const preNode = codeBlock.parentNode;
    if (!preNode || !preNode.parentNode) {
      return;
    }
    const code = codeBlock.textContent || '';
    const requestedLibraries = parseRequestedLibraries(code, libraryRegistry);
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = `${JS_RUN_IFRAME_HEIGHT}px`;
    container.style.minHeight = `${JS_RUN_IFRAME_MIN_HEIGHT}px`;
    container.style.resize = 'vertical';
    container.style.overflow = 'auto';
    container.style.margin = '0 0 1em 0';
    container.style.display = 'block';

    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('title', 'MDGarden js-run sandbox');
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
    frame.style.margin = '0';
    frame.style.background = 'transparent';
    frame.style.display = 'block';
    frame.srcdoc = createSandboxDocument(code, requestedLibraries, libraryRegistry, trustedOrigins);
    container.appendChild(frame);

    preNode.parentNode.insertBefore(container, preNode);
    preNode.style.display = 'none';
    codeBlock.dataset.mdgardenJsRunRendered = JS_RUN_RENDERED_FLAG;
  });
};

const createJsRunPlugin = () => {
  return {
    name: 'js-run',
    onEvent: ({ event, payload, ctx }) => {
      if (event !== 'content_loaded' && event !== 'content_reloaded') {
        return;
      }
      const root = resolvePayloadRoot(payload);
      if (!root) {
        return;
      }
      const viewer = ctx && typeof ctx.getViewer === 'function' ? ctx.getViewer() : null;
      const resolved = resolveSandboxLibraryConfig({
        viewer: viewer,
        pluginName: 'js-run',
        defaultRegistry: JS_RUN_DEFAULT_LIBRARY_REGISTRY
      });
      renderJsRunBlocks(root, resolved.registry, resolved.trustedOrigins);
    }
  };
};

export { createJsRunPlugin };
