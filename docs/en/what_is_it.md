---
title: "MDGarden - What is it?"
lastModified: "2026-03-12T00:30:00+09:00"
indexing: true
---

# What is it?
MDGarden is a zero-backend markdown Wiki engine and document viewer that operates entirely in the browser.

It transforms standard Markdown files into a rich and interactive SPA (Single Page Application) entirely on the client side. No database or server-side processing is required, allowing it to run solely on static file hosting such as GitHub Pages. It provides a portable, high-performance documentation experience, whether used as a public knowledge base or as a local personal Wiki.

## Key Features

### 1. Zero-Backend & Portable
A purely static file structure without any database or server-side scripts. Vulnerabilities typical of dynamic systems (like SQL injection) are structurally non-existent, maintaining the highest level of security and availability on simple static hosting environments such as GitHub Pages or S3. Additionally, you can export the entire project as a single HTML file for offline environments.

### 2. Single Page Application (SPA)
It interprets relative links between files written in Markdown, achieving high-speed, seamless page transitions without ever reloading the entire browser page. Folder structures naturally function as the Wiki's structure, removing the necessity for convoluted routing configurations.

### 3. Web Component Integration
MDGarden is implemented as a custom element (Web Component) named `<md-garden>`. Thanks to this, embedding a Markdown viewer necessitates merely writing a few minimal tags within any HTML file safely and simply.

### 4. Rich Markdown Ecosystem
While grounded in standard Markdown notation, expressiveness can be expanded limitlessly via a plugin system.
- **Highlights**: Beautiful code highlighting powered by `highlight.js`.
- **Formulas/Charts**: Employs LaTeX formula display via `MathJax`, and chart/graph embedding using libraries like `Mermaid.js` and `C3.js`.
- **Extended syntax**: Supports task lists, footnotes, custom attributes (ID and class assignments), and more.

### 5. Interactive JavaScript Execution
By utilizing code sandbox plugins (`js-run`, `js-demo`), you can execute JavaScript directly and securely from within Markdown. It natively supports data visualization and mathematical computing libraries such as D3.js, Three.js, p5.js, and Math.js, facilitating the creation of executable and rich sample documentation.

### 6. Local Editing & Authoring Tools
In a local environment (localhost), it functions as an effortless authoring tool enabling direct editing and saving of Markdown out of the browser by employing the File System Access API. Furnished with auto-reloading instantly reflecting code changes, automatic generation of sitemaps (`sitemap.json`), and offline export functionalities for the entire project, while utilizing safe rendering secured via `DOMPurify`.

## Operation Modes and Security
To protect security and data integrity, MDGarden seamlessly toggles operation modes responding automatically matching dynamically to the executed environment.
Because no dynamic saving protocols execute upon deployed servers, the vulnerability footprint permitting tampering originating from malicious third parties is kept critically small.

| Environment (Context) | Mode | Save/Update | Note |
|---|---|---|---|
| localhost (127.0.0.1) | Author | Enabled | Working framework and personal knowledge base execution |
| Public URL (Deploy) | Reader | Disabled | Multi File Wiki (Public documents) |
| file:// (Serverless) | Reader | Manual | Single File Wiki (Offline distribution) |

## Core Concepts
MDGarden primarily falls into two operational styles.

- `inline mode`: A straightforward deployment approach embedding every piece of Markdown context encapsulated entirely in one HTML environment.
- `include mode`: The standardized Wiki operational paradigm dividing and controlling numerous Markdown files cleanly split utilizing folder layers.

Because both rely exclusively upon identical `<md-garden>` components dynamically processing operations underneath, you can seamlessly branch out mapping operational methods intuitively matching scaling content volume or operational workflows accordingly.

## Intended Users and Use Cases
- Developers pursuing effortless administration governing their personal knowledge base as straightforward static variables.
- Operators longing to rapidly deploy mapping documentation websites scaling smoothly targeting deployment spanning minimal team architectures.
- Authors looking toward encapsulating technology manuals comprehensively packing robust run-ready executing structural codes distributing arrays entirely seamlessly disconnected and offline.

It is ideally calibrated fitting circumstances aiming toward: "Administrating records securely on-hand natively operating merely as Markdown text formats simultaneously craving an outwardly elegant and deeply connective viewer appearance natively within browsers."

## Next Pages to Read
- If you are a first-time user: [Getting Started](getting_started.md)
- If you intend to distribute as a single file: [Single File Wiki/inline mode](inline_mode.md)
- If you intend to manage multiple pages: [Multi File Wiki/include mode](include_mode.md)
- To verify operational security settings: [Security](security.md)

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
