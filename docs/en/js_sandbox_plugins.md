---
title: "MDGarden - JS Sandbox Plugins"
lastModified: "2026-03-07T23:10:00+09:00"
indexing: true
---

# JS Sandbox Plugins

This page documents the specifications for `js-run` and `js-demo`.  
Target implementation:

- `src/assets/js/plugins/js-run-plugin.js`
- `src/assets/js/plugins/js-demo-plugin.js`

## Differentiating Usage

- `js-run`: Intended for calculations and log outputs. Easily forcibly stopped via Worker execution.
- `js-demo`: Intended for drawing demos like d3/three/p5. Can use DOM/Canvas.

## Activation

```html
<md-garden
  id="main"
  src="index.md"
  data-plugins="toc,highlight,js-run,js-demo">
</md-garden>
```

## Extending via `config.json`

You can override library settings with `plugins.js-run` / `plugins.js-demo`.

```json
{
  "plugins": {
    "js-run": {
      "allowList": ["mathjs", "decimal", "astronomy"],
      "trustedOrigins": ["https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      "libraries": {
        "astronomy": {
          "global": "Astronomy",
          "urls": [
            "https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js"
          ]
        }
      }
    }
  }
}
```

Specifications:

- `allowList`: Allowlist of names that can be used with `// libs:`.
- `trustedOrigins`: Origins allowed in `libraries.urls`.
- `libraries`: Custom library definitions (`global` + `urls`).
- URLs are only valid if they are `https` and their origin is included in `trustedOrigins`.
- Use browser-targeted builds for sandbox execution (e.g., `astronomy.browser.min.js`).
- Node-targeted builds (e.g., `astronomy.min.js`) are not recommended because they may fail to load.

## `js-run`

### Syntax

````md
```js-run
// libs: mathjs, decimal
console.log("hello from sandbox");
const sum = api.math.sum([1, 2, 3]);
const precise = new api.Decimal("0.1").plus("0.2").toString();
return { sum, precise };
```
````

`js:run` can also be used as a compatible alias.

### UI

- Initial view: `Code` tab.
- Clicking `Run` starts execution and switches to the `Result` tab.
- `status`: `idle` / `running` / `done` / `error` / `timeout`.

### libs directive

You can also specify `// libs: ...` in `js-run`.  
Current allowlist:

- `mathjs`
- `decimal`

If `astronomy` from the configuration example is added:

```js
// libs: astronomy
const Astronomy = api.libs.astronomy;
```

### Limitations

- timeout: `1500ms`
- Output maximum: `64KiB`
- Line limit: `200`
- iframe height: `300px`

### Security Key Points

- Outer iframe: `sandbox="allow-scripts"` (without `allow-same-origin`)
- Internal execution: Worker + stopped with `terminate()`
- `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `importScripts` are disabled.

## `js-demo`

### Syntax

````md
```js-demo
// libs: d3, mathjs
const radius = api.math.round(api.math.pi * 15, 0);
const svg = api.d3.select(api.mount).append("svg")
  .attr("width", api.width)
  .attr("height", api.height);
svg.append("circle").attr("cx", 80).attr("cy", 80).attr("r", radius).attr("fill", "#60a5fa");
return { radius };
```
````

`js:demo` can also be used as a compatible alias.

### libs directive

Specify `// libs: ...` within the code.  
Only the specified names will be loaded from the allowlist.

Supported libraries:

- `d3`
- `three`
- `p5`
- `mathjs`
- `decimal`

Example:

```js
// libs: d3, three
```

Unknown names are ignored, and URLs not in the allowlist are not loaded.

### Runtime API

The `api` object is passed to the `js-demo` code.

- `api.mount`: Target element for drawing.
- `api.width` / `api.height`: Size of the drawing area.
- `api.libs`: Dictionary of loaded libraries.
- `api.d3` / `api.THREE` / `api.p5`: Shortcuts for each library.
- `api.math` / `api.Decimal`: Shortcuts for mathjs / decimal.
- `api.log(...)`: Log output.
- `api.clear()`: Initializes `mount`.

### UI

- Initial view: `Code` tab.
- Clicking `Run` switches to the `Result` tab.
- `Result` displays the preview iframe and log output.
- `status`: `idle` / `loading` / `running` / `done` / `error` / `timeout`.

### Limitations

- timeout: `10000ms`
- Output maximum: `64KiB`
- Line limit: `200`
- iframe height: `380px`

### Security Key Points

- Outer iframe: `sandbox="allow-scripts"`
- Preview iframe: `sandbox="allow-scripts"`
- Runtime CSP locks `script-src` exclusively to the CDN allowlist (jsdelivr/cdnjs).
- `connect-src 'none'`
- `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `window.open` are disabled before user code execution.

## Points to Note

- Since `js-demo` executes within DOM/Canvas, stop control is not as forceful as `js-run`.
- Heavy drawing or infinite loops will strain browser performance.
- Fetching external assets (textures or additional data) is prohibited by default.

## Troubleshooting

- `Result` is `undefined`
  - Write a `return` statement to return a value.
- `timeout`
  - Shorten the processing, or reduce the drawing size/number of iterations.
- Libraries cannot be used
  - Check the `// libs:` specification at the beginning.
  - Libraries outside the allowlist are not loaded.

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
