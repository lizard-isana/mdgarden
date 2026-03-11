---
title: "MDGarden - Getting Started"
lastModified: "2026-03-07T04:00:00+09:00"
indexing: true
---

# Getting Started
This page explains the shortest path to launch MDGarden in a minimal configuration and display a single page.

## Prerequisites

- Modern browser (Latest versions of Chrome / Edge / Firefox / Safari recommended)
- A local environment capable of serving static files
- A working directory where `index.html` and `index.md` can be placed

Although there are setups that work with `file://`, we recommend verifying via a local server initially.

## Minimal Configuration

First, prepare only the following 3 files:

- `index.html`
- `index.md`
- `assets/js/mdgarden.min.js` (Includes necessary CSS/JS)

Minimal example of `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="./assets/css/default.css">
  <script src="./assets/js/mdgarden.min.js"></script>
</head>
<body>
  <md-garden id="main" src="index.md"></md-garden>
</body>
</html>
```

## Your First Markdown

If you begin `index.md` with Front Matter, it will be easier to migrate when using Author Mode later.

```md
---
title: "Home"
lastModified: "2026-03-06T12:00:00+09:00"
indexing: true
---

# Hello MDGarden

This is your first page.
```

## config.json (Optional, but recommended)

Initially, the following is sufficient:

```json
{
  "spa": true,
  "frontmatter": true,
  "link_target": "main"
}
```

Specify `data-config="config.json"` in `index.html` as needed.

## Local Verification

1. Start your local server
2. Open `http://localhost:xxxx/`
3. Verify that `Hello MDGarden` is displayed

## How to Start a Local Server

### 1. Using Editor Plugins

If you want to verify as quickly as possible, your editor's local server extension is convenient. You can comfortably edit Markdown while viewing the results in the browser (or inside the editor, depending on the plugin).
- VS Code: Live Server / Live Preview, etc.
- After launching, open `http://127.0.0.1:xxxx` to check.

Note: Due to security restrictions, MDGarden will only run in Reader mode on private IP addresses (like 192.168.x.x).

### 2. Using Built-in Programming Language Servers

If you have a language runtime in your development environment, you can serve files using its bundled command.

Python:

```bash
python -m http.server 8080
```

Node.js (Using `serve`):

```bash
npx serve . -l 8080
```

Ruby:

```bash
ruby -run -e httpd . -p 8080
```

### 3. Using Jorro (Recommended)

Jorro is a minimum local web server specifically designed for simultaneous use with MDGarden.

- It listens exclusively on `127.0.0.1`
- It serves the directory where the executable is placed as the root
- Real-time editing reflections via Hot Reload

For details, refer to [Jorro](jorro.md).

## Initial Troubleshooting

- **`Not Found`**:
  Check `src` path and the actual file name.
- **`Failed to load markdown`**:
  Ensure you are viewing via a local server (http://) not `file://`.
- **Link navigation broken**:
  Verify that `link_target` matches the viewer's `id`.
- **Pages won't open in include mode**:
  Check the restrictions of `allowed_dirs` / `allowed_files`.

## Next Steps

- Form a single distribution file: [Single File Wiki/inline mode](inline_mode.md)
- Operate multiple divided pages: [Multi File Wiki/include mode](include_mode.md)
- Expand features: [Plug-ins](plugins.md)
- Improve authoring operations: [Author Mode](author_mode.md)

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
