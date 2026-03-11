---
title: "MDGarden - Plugin Dev Guide"
lastModified: "2026-03-06T16:35:00+09:00"
indexing: true
---

# Plugin Dev Guide
This page acts as a guide for developers looking to implement an MDGarden plugin.  
For usage of built-in plugins, please refer to [Plug-ins](plugins.md).

## Purpose / Scope

- Target Audience: Developers wishing to extend MDGarden's behavior.
- Scope: Plugin runtime, event coordination, implementation patterns, and operational notes.
- Out of Scope: Instructions on how to use built-in plugins (explained in `plugins.md`).

## Plugin Architecture

- Plugins are registered per viewer (`<md-garden id="...">`).
- The execution bedrock is `window.MDGarden.pluginRuntime`.
- Registration API:
  - `window.MDGarden.registerPlugin(viewId, plugin)`
- `ctx` provided by the plugin runtime:
  - `ctx.viewId`
  - `ctx.getViewer()`
  - `ctx.loadScripts(urls)`
  - `ctx.loadStyles(urls)`

## Plugin Contract (API)

A plugin is an object formatted as follows:

```js
{
  name: "plugin-name",
  onInit: ({ ctx }) => {},
  onEvent: ({ event, payload, ctx }) => {},
  onDispose: ({ ctx }) => {},
  transformCode: ({ code, lang, ctx }) => {}
}
```

- `name`: Treated as `"anonymous_plugin"` if omitted.
- `onInit`: Executed once when the viewer initializes.
- `onEvent`: Called for every plugin event.
- `onDispose`: Called when the viewer is destroyed.
- `transformCode`: Hook for transforming code blocks.
  - Returning `undefined` means "no transformation."
  - Returning a string replaces the value with the returned string.

## Lifecycle

1. Register the plugin via `registerPlugin(viewId, plugin)`.
2. `onInit` is called during viewer initialization.
3. `onEvent` is invoked during the various phases of Markdown loading and rendering.
4. `onDispose` is called when the viewer is destroyed.

Supplement:

- If `registerPlugin` is executed after viewer initialization, `onInit` runs immediately.
- Plugin exceptions are caught by the runtime side and output to `console.error`.

## Event Reference

Standard events that can be referenced by `window.MDGarden.PLUGIN_EVENTS`:

- `markdown_loaded`
  - Triggered immediately after Markdown loads, before HTML conversion.
- `content_rendered`
  - Triggered after HTML has been applied to the section.
- `content_loaded`
  - Fired during the initial render.
- `content_reloaded`
  - Fired during re-renders, such as SPA transitions.
- `code_highlight`
  - Event name utilized in hooks/`transformCode` methods instead of `onEvent`.

In practice, a structure that handles both `content_loaded` and `content_reloaded` with the same processing yields the most stability.

## Payload / Context Spec

The arguments for `onEvent` are `{ event, payload, ctx }`.

Typical payload format:

```js
// markdown_loaded / content_rendered
{
  viewer: /* MarkdownViewer */,
  target: /* md-garden element */,
  status: "content_loaded" | "content_reloaded", // for content_rendered
  context: {
    viewerId: "main",
    currentDocPath: "index.md",
    normalizedPath: "index.md",
    frontmatter: { title: "...", lastModified: "..." },
    mode: "include" | "inline",
    status: "..."
  }
}
```

```js
// content_loaded / content_reloaded
{
  target: /* md-garden element */,
  status: "content_loaded" | "content_reloaded",
  context: {
    viewerId: "main",
    currentDocPath: "index.md",
    normalizedPath: "index.md",
    frontmatter: { ... },
    mode: "include" | "inline",
    status: "..."
  }
}
```

Practical points regarding `ctx`:

- Use `ctx.getViewer()` to fetch the target viewer.
- `ctx.loadScripts` and `ctx.loadStyles` can also accept arrays of URLs.

## Minimal Plugin Example

```js
const createHelloPlugin = () => {
  return {
    name: "hello",
    onInit: ({ ctx }) => {
      const viewer = ctx.getViewer();
      console.log("init:", viewer && viewer.id);
    },
    onEvent: ({ event, payload }) => {
      if (event !== window.MDGarden.PLUGIN_EVENTS.CONTENT_RENDERED) {
        return;
      }
      const root = payload && payload.target ? payload.target : null;
      if (!root) {
        return;
      }
      root.querySelectorAll("h1").forEach((h1) => {
        h1.dataset.hello = "true";
      });
    }
  };
};

window.MDGarden.registerPlugin("main", createHelloPlugin());
```

## Advanced Patterns

- Lazy loading:
  - Call `ctx.loadScripts` / `ctx.loadStyles` when needed within `onEvent`.
  - Maintain a "loaded" flag to prevent multiple requests.
- Reentrancy Safety:
  - Use `dataset` flags (e.g., `data-mdgarden-*-rendered`) to avoid double processing.
- Scoping constraint:
  - Perform document queries solely beneath `payload.target` to avoid traversing the entire `document`.
- SPA support:
  - Account for both `content_loaded` and `content_reloaded` in processing.

## Performance Guidelines

- Do not indiscriminately execute heavy processing for every `content_rendered` event.
- Minimize DOM queries by focusing off `payload.target`.
- Prevent layout thrashing.
- Clean up event listeners and timers within `onDispose`.

## Security Guidelines

- Since plugins can execute arbitrary code within the browser, verify the trustworthiness of the source before distribution.
- Lock to a fixed version whenever loading from external CDNs.
- Be particularly rigorous in reviewing when leveraging `data-execute-script="true"`.
- Establish clear strategies for sanitization when injecting user input or external data into the DOM.

## Debugging / Troubleshooting

- Events not firing:
  - Verify correspondence between `viewId` and `registerPlugin` target ID.
  - Check whether the name assigned in `data-plugins` matches the registry name.
- Target of processing unattainable:
  - Ensure the trigger event contains a `payload.target`.
  - Provide fallback to `ctx.getViewer()` if necessary.
- Elements drawing twice:
  - Utilize `dataset` flags to maintain idempotency.
- UI breaking exclusively upon SPA transit:
  - Check if logic covers the `content_reloaded` event.

## Compatibility / Versioning

- Plugin APIs are exposed through `window.MDGarden`.
- Validate implementation-derived behaviors against `src/assets/js/plugins/plugin-runtime.js` and `src/assets/js/mdgarden.js`.
- Backward compatibility names:
  - `auto-indexer` is an alias for `author-mode`.

## Checklist for New Plugin

- Assigned `name`.
- Handled both `content_loaded` and `content_reloaded`.
- Drafted a branching sequence for when `payload.target` is absent.
- Guaranteed idempotency (prevention of double execution).
- Suppressed multiple requests for external assets.
- Integrated teardown procedures within `onDispose`.
- Added usage examples to documentation.

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
