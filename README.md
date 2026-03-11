# MDGarden

A complete, zero-backend Markdown Wiki engine and document viewer that runs entirely in the browser.

MDGarden transforms standard Markdown files into a rich, interactive Single Page Application (SPA) purely on the client side, requiring only static file hosting (e.g., GitHub Pages). Whether deployed as a public knowledge base or run locally as a personal Wiki, MDGarden delivers a high-performance, portable documentation experience.

## Features

1. **Zero-Backend & Portable:** 
   Runs entirely in the browser using static files. No database or server-side scripts required. Can be bundled into a single offline HTML file.
   
2. **Single Page Application (SPA):** 
   Seamless and instant navigation between markdown files without full page reloads.

3. **Web Component Integration:** 
   Built around the `<md-garden>` custom element, easily embeddable into any HTML file.

4. **Rich Markdown Ecosystem:** 
   - Supports standard Markdown and Frontmatter.
   - Code highlighting via `highlight.js`.
   - Diagrams and charts via `Mermaid.js` and `C3.js`.
   - Math typesetting via `MathJax`.
   - Extensions for task lists, footnotes, and custom attributes.

5. **Interactive JavaScript Execution:** 
   Securely execute JS directly from Markdown using `js-run` and `js-demo` plugins, with built-in support for libraries like `D3.js`, `Three.js`, `p5.js`, and `Math.js`.

6. **Local Editing & Authoring Tools:** 
   Includes a local development mode with auto-reload, sitemap generation tools, and secure rendering via `DOMPurify`.

## Source
https://github.com/lizard-isana/mdgarden

## Documents
https://lizard-isana.github.io/mdgarden/
