# MDGarden

A complete, zero-backend Markdown Wiki engine and document viewer that runs entirely in the browser.

MDGarden transforms standard Markdown files into a rich, interactive Single Page Application (SPA) purely on the client side, requiring only static file hosting (e.g., GitHub Pages). Whether deployed as a public knowledge base or run locally as a personal Wiki, MDGarden delivers a high-performance, portable documentation experience.

MDGardenはブラウザ上で完全に動作する、ゼロバックエンドのマークダウンWikiエンジンおよびドキュメントビューアーです。

標準的なMarkdownファイルを、クライアントサイドだけでリッチでインタラクティブなSPA（Single Page Application）に変換します。データベースやサーバーサイドの処理は一切不要で、GitHub Pagesなどの静的ファイルホスティングのみで動作します。公開ナレッジベースとしても、ローカルでのパーソナルWikiとしても、ポータブルで高性能なドキュメンテーション体験を提供します。

## Features / 主な機能

1. **Zero-Backend & Portable (ゼロバックエンド＆ポータブル):** 
   Runs entirely in the browser using static files. No database or server-side scripts required. Can be bundled into a single offline HTML file.
   （データベースやサーバー処理は不要。静的ファイルのみで動作し、オフライン環境用の単一HTMLファイルとして出力も可能。）
   
2. **Single Page Application (SPA):** 
   Seamless and instant navigation between markdown files without full page reloads.
   （ページ全体をリロードすることなく、マークダウンファイル間をシームレスに遷移。）

3. **Web Component Integration (Webコンポーネント統合):** 
   Built around the `<md-garden>` custom element, easily embeddable into any HTML file.
   （`<md-garden>`カスタム要素として実装されており、任意のHTMLファイルに簡単に組み込み可能。）

4. **Rich Markdown Ecosystem (リッチなマークダウンエコシステム):** 
   - Supports standard Markdown and Frontmatter.
   - Code highlighting via `highlight.js`.
   - Diagrams and charts via `Mermaid.js` and `C3.js`.
   - Math typesetting via `MathJax`.
   - Extensions for task lists, footnotes, and custom attributes.

5. **Interactive JavaScript Execution (インタラクティブなJS実行):** 
   Securely execute JS directly from Markdown using `js-run` and `js-demo` plugins, with built-in support for libraries like `D3.js`, `Three.js`, `p5.js`, and `Math.js`.
   （Markdown内から直接安全にJavaScriptを実行可能。D3.js等のライブラリを標準サポート。）

6. **Local Editing & Authoring Tools (ローカル編集・制作者向け機能):** 
   Includes a local development mode with auto-reload, sitemap generation tools, and secure rendering via `DOMPurify`.
   （オートリロード付きのローカル編集モード、サイトマップ生成ツール、`DOMPurify`による安全なレンダリングを採用。）

## Source
https://github.com/lizard-isana/mdgarden

## Documents
https://lizard-isana.github.io/mdgarden/
