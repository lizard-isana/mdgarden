import { resolveSandboxLibraryConfig, parseRequestedLibraries } from './js-sandbox-library-config.js';

const JS_DEMO_TIMEOUT_MS = 10000;
const JS_DEMO_MAX_OUTPUT_BYTES = 64 * 1024;
const JS_DEMO_MAX_OUTPUT_LINES = 200;
const JS_DEMO_IFRAME_HEIGHT = 640;
const JS_DEMO_IFRAME_MIN_HEIGHT = 360;
const JS_DEMO_RENDERED_FLAG = 'true';
const JS_DEMO_LANG_ALIASES = new Set(['js-demo', 'js:demo']);
const JS_DEMO_ALLOWED_MESSAGE_CHANNEL = 'mdgarden-js-demo';

const JS_DEMO_DEFAULT_LIBRARY_REGISTRY = Object.freeze({
  d3: Object.freeze({
    global: 'd3',
    urls: Object.freeze([
      'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js'
    ])
  }),
  three: Object.freeze({
    global: 'THREE',
    urls: Object.freeze([
      'https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r181/three.min.js'
    ])
  }),
  p5: Object.freeze({
    global: 'p5',
    urls: Object.freeze([
      'https://cdn.jsdelivr.net/npm/p5@1.11.11/lib/p5.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.11/p5.min.js'
    ])
  }),
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

const resolvePayloadRoot = (payload) => {
  if (payload && payload.target && payload.target.nodeType === 1) {
    return payload.target;
  }
  if (payload && payload.nodeType === 1) {
    return payload;
  }
  return null;
};

const isJsDemoCodeBlock = (codeBlock) => {
  if (!codeBlock || !codeBlock.classList) {
    return false;
  }
  for (const className of codeBlock.classList) {
    if (!className.startsWith('language-')) {
      continue;
    }
    const language = className.slice('language-'.length);
    if (JS_DEMO_LANG_ALIASES.has(language)) {
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

const escapeScriptCloseTag = (source) => {
  return String(source || '').replace(/<\/script/gi, '<\\/script');
};

const buildRuntimeCsp = (trustedOrigins) => {
  const originPart = Array.isArray(trustedOrigins) && trustedOrigins.length > 0
    ? ` ${trustedOrigins.join(' ')}`
    : '';
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "connect-src 'none'",
    "img-src data: blob:",
    "style-src 'unsafe-inline'",
    `script-src 'unsafe-inline'${originPart}`,
    `script-src-elem 'unsafe-inline'${originPart}`
  ].join('; ');
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
    "child-src blob: data:",
    "frame-src 'self' blob: data:"
  ].join('; ');
};

const createRuntimeDocument = (code, requestedLibraries, libraryRegistry, trustedOrigins) => {
  const safeCode = escapeScriptCloseTag(code);
  const runtimeCsp = buildRuntimeCsp(trustedOrigins);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${runtimeCsp}">
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #ffffff;
      }
      #mount {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <div id="mount"></div>
    <script>
      (function () {
        const channel = ${JSON.stringify(JS_DEMO_ALLOWED_MESSAGE_CHANNEL)};
        const registry = ${JSON.stringify(libraryRegistry)};
        const requested = ${JSON.stringify(requestedLibraries)};

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
          parent.postMessage({
            channel: channel,
            kind: kind,
            message: safeSerialize(message)
          }, '*');
        };

        const loadScript = (url) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => resolve('loaded');
            script.onerror = () => {
              script.remove();
              reject(new Error('Failed to load script: ' + url));
            };
            document.head.appendChild(script);
          });
        };

        const loadLibrary = async (name) => {
          const entry = registry[name];
          if (!entry) {
            throw new Error('Unsupported library: ' + name);
          }
          let lastError = null;
          for (const url of entry.urls) {
            try {
              await loadScript(url);
              return window[entry.global];
            } catch (error) {
              lastError = error;
            }
          }
          throw lastError || new Error('Failed to load library: ' + name);
        };

        const disableNetworkApis = () => {
          const disabledMessage = 'Network APIs are disabled in js-demo runtime.';
          const disabledSync = () => {
            throw new Error(disabledMessage);
          };
          const disabledAsync = () => Promise.reject(new Error(disabledMessage));
          window.fetch = disabledAsync;
          window.XMLHttpRequest = function () {
            disabledSync();
          };
          window.WebSocket = function () {
            disabledSync();
          };
          window.EventSource = function () {
            disabledSync();
          };
          window.open = function () {
            disabledSync();
          };
          if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
            window.navigator.sendBeacon = function () {
              return false;
            };
          }
        };

        const defaultConsole = window.console;
        const consoleProxy = {
          log: (...args) => emit('log', args),
          info: (...args) => emit('info', args),
          warn: (...args) => emit('warn', args),
          error: (...args) => emit('error', args)
        };
        window.console = consoleProxy;

        window.addEventListener('error', (event) => {
          emit('runtime_error', event && event.message ? event.message : 'Unhandled error');
        });
        window.addEventListener('unhandledrejection', (event) => {
          const reason = event && event.reason ? event.reason : 'Unhandled promise rejection';
          emit('runtime_error', formatError(reason));
        });

        const run = async () => {
          const libs = {};
          if (requested.length > 0) {
            emit('status', 'loading');
          }
          for (const name of requested) {
            libs[name] = await loadLibrary(name);
          }

          disableNetworkApis();
          emit('status', 'running');

          const mount = document.getElementById('mount');
          const api = {
            mount: mount,
            width: mount.clientWidth || window.innerWidth,
            height: mount.clientHeight || window.innerHeight,
            libs: libs,
            d3: libs.d3 || null,
            THREE: libs.three || null,
            p5: libs.p5 || null,
            math: libs.mathjs || null,
            Decimal: libs.decimal || null,
            log: (...args) => emit('log', args),
            clear: () => {
              mount.innerHTML = '';
            }
          };

          const __runUserCode = async (api) => {
            "use strict";
${safeCode}
          };

          const result = await __runUserCode(api);
          emit('result', result);
          emit('status', 'done');
          window.console = defaultConsole;
        };

        run().catch((error) => {
          emit('runtime_error', formatError(error));
          emit('status', 'error');
        });
      })();
    </script>
  </body>
</html>`;
};

const createPreviewPlaceholderDocument = () => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #ffffff;
        color: #64748b;
        font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
      .placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div class="placeholder">Click Run to start demo.</div>
  </body>
</html>`;
};

const createSandboxDocument = (code, requestedLibraries, libraryRegistry, trustedOrigins) => {
  const encodedCode = utf8ToBase64(code);
  const runtimeDocument = createRuntimeDocument(code, requestedLibraries, libraryRegistry, trustedOrigins);
  const encodedRuntimeDocument = utf8ToBase64(runtimeDocument);
  const encodedPreviewPlaceholder = utf8ToBase64(createPreviewPlaceholderDocument());
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
      .result-wrap {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%;
      }
      .preview {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        width: min(100%, 480px);
        aspect-ratio: 1 / 1;
        height: auto;
        align-self: center;
        background: #ffffff;
      }
      .output {
        margin: 0;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #f8fafc;
        padding: 8px;
        flex: 1 1 auto;
        min-height: 80px;
        overflow: auto;
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
      <div id="panel-result" class="panel">
        <div class="result-wrap">
          <iframe id="preview" class="preview" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
          <pre id="output" class="output"></pre>
        </div>
      </div>
    </div>
    <script>
      (function () {
        const encodedCode = ${JSON.stringify(encodedCode)};
        const encodedRuntimeDocument = ${JSON.stringify(encodedRuntimeDocument)};
        const encodedPreviewPlaceholder = ${JSON.stringify(encodedPreviewPlaceholder)};
        const channel = ${JSON.stringify(JS_DEMO_ALLOWED_MESSAGE_CHANNEL)};
        const timeoutMs = ${JS_DEMO_TIMEOUT_MS};
        const maxOutputBytes = ${JS_DEMO_MAX_OUTPUT_BYTES};
        const maxOutputLines = ${JS_DEMO_MAX_OUTPUT_LINES};

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
        const output = document.getElementById('output');
        const preview = document.getElementById('preview');
        const encoder = new TextEncoder();

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

        const setStatus = (value) => {
          statusNode.textContent = value;
        };

        const setRunning = (running) => {
          runButton.disabled = running;
        };

        const appendLine = (prefix, message) => {
          if (outputClosed) {
            return;
          }
          const nextLine = prefix + String(message == null ? '' : message);
          const nextBytes = encoder.encode(nextLine + '\\n').length;
          if (outputLines >= maxOutputLines || outputBytes + nextBytes > maxOutputBytes) {
            outputClosed = true;
            output.textContent += (output.textContent ? '\\n' : '') + '[system] output limit reached';
            return;
          }
          outputLines += 1;
          outputBytes += nextBytes;
          output.textContent += (output.textContent ? '\\n' : '') + nextLine;
        };

        const resetOutput = () => {
          output.textContent = '';
          outputBytes = 0;
          outputLines = 0;
          outputClosed = false;
        };

        const clearTimer = () => {
          if (!activeTimer) {
            return;
          }
          clearTimeout(activeTimer);
          activeTimer = null;
        };

        const stopExecution = (status) => {
          clearTimer();
          setRunning(false);
          if (status) {
            setStatus(status);
          }
        };

        const handleMessage = (event) => {
          if (event.source !== preview.contentWindow) {
            return;
          }
          const data = event.data || {};
          if (data.channel !== channel) {
            return;
          }
          if (data.kind === 'log' || data.kind === 'info') {
            appendLine('[log] ', data.message);
            return;
          }
          if (data.kind === 'warn') {
            appendLine('[warn] ', data.message);
            return;
          }
          if (data.kind === 'error') {
            appendLine('[error] ', data.message);
            return;
          }
          if (data.kind === 'runtime_error') {
            appendLine('[runtime] ', data.message);
            stopExecution('error');
            return;
          }
          if (data.kind === 'result') {
            appendLine('[result] ', data.message);
            return;
          }
          if (data.kind === 'status') {
            const status = String(data.message || '');
            if (status) {
              setStatus(status);
            }
            if (status === 'done' || status === 'error') {
              stopExecution(status);
            }
          }
        };

        const runExecution = () => {
          resetOutput();
          setTab('result');
          setStatus('running');
          setRunning(true);
          preview.srcdoc = decodeBase64Utf8(encodedRuntimeDocument);
          clearTimer();
          activeTimer = setTimeout(() => {
            preview.srcdoc = decodeBase64Utf8(encodedPreviewPlaceholder);
            appendLine('[system] ', 'execution timed out');
            stopExecution('timeout');
          }, timeoutMs);
        };

        panelCode.textContent = decodeBase64Utf8(encodedCode);
        preview.srcdoc = decodeBase64Utf8(encodedPreviewPlaceholder);

        window.addEventListener('message', handleMessage);
        window.addEventListener('beforeunload', () => {
          stopExecution();
          preview.srcdoc = decodeBase64Utf8(encodedPreviewPlaceholder);
          window.removeEventListener('message', handleMessage);
        });

        tabCode.addEventListener('click', () => {
          setTab('code');
        });
        tabResult.addEventListener('click', () => {
          setTab('result');
        });
        runButton.addEventListener('click', () => {
          runExecution();
        });

        setTab('code');
        resetOutput();
        setStatus('idle');
      })();
    </script>
  </body>
</html>`;
};

const renderJsDemoBlocks = (root, libraryRegistry, trustedOrigins) => {
  const codeBlocks = root.querySelectorAll('code[class*="language-"]');
  codeBlocks.forEach((codeBlock) => {
    if (!isJsDemoCodeBlock(codeBlock)) {
      return;
    }
    if (codeBlock.dataset.mdgardenJsDemoRendered === JS_DEMO_RENDERED_FLAG) {
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
    container.style.height = `${JS_DEMO_IFRAME_HEIGHT}px`;
    container.style.minHeight = `${JS_DEMO_IFRAME_MIN_HEIGHT}px`;
    container.style.resize = 'vertical';
    container.style.overflow = 'auto';
    container.style.margin = '0 0 1em 0';
    container.style.display = 'block';

    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('title', 'MDGarden js-demo sandbox');
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
    codeBlock.dataset.mdgardenJsDemoRendered = JS_DEMO_RENDERED_FLAG;
  });
};

const createJsDemoPlugin = () => {
  return {
    name: 'js-demo',
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
        pluginName: 'js-demo',
        defaultRegistry: JS_DEMO_DEFAULT_LIBRARY_REGISTRY
      });
      renderJsDemoBlocks(root, resolved.registry, resolved.trustedOrigins);
    }
  };
};

export { createJsDemoPlugin };
