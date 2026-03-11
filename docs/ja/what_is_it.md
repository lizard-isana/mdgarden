---
title: "MDGarden - What is it?"
lastModified: "2026-03-12T00:30:00+09:00"
indexing: true
---

# What is it?
MDGardenはブラウザ上で完全に動作する、ゼロバックエンドのマークダウンWikiエンジンおよびドキュメントビューアーです。

標準的なMarkdownファイルを、クライアントサイドだけでリッチでインタラクティブなSPA（Single Page Application）に変換します。データベースやサーバーサイドの処理は一切不要で、GitHub Pagesなどの静的ファイルホスティングのみで動作します。公開ナレッジベースとしても、ローカルでのパーソナルWikiとしても、ポータブルで高性能なドキュメンテーション体験を提供します。

## 主要機能 (Features)

### 1. Zero-Backend & Portable (ゼロバックエンド＆ポータブル)
DBやサーバサイドスクリプトを一切持たない純粋な静的ファイル構成です。動的システム特有の脆弱性（SQLインジェクション等）が構造的に存在せず、GitHub Pages や S3 などのシンプルな静的ホスティング環境で、最高レベルのセキュリティと可用性を維持します。また、オフライン環境用の単一HTMLファイルとしてプロジェクト全体を書き出すことも可能です。

### 2. Single Page Application (SPA)
Markdown 内に記述されたファイル間の相対リンクを解釈し、ブラウザのページ全体をリロードすることなく、高速でシームレスなページ遷移を実現します。フォルダ構造がそのまま Wiki の構造として機能するため、複雑なルーティング設定を必要としません。

### 3. Web Component Integration (Webコンポーネント統合)
MDGardenは `<md-garden>` というカスタム要素（Webコンポーネント）として実装されています。これにより、任意のHTMLファイルに少量のタグを記述するだけで、簡単にMarkdownビュアーを組み込むことができます。

### 4. Rich Markdown Ecosystem (リッチなマークダウンエコシステム)
標準的な Markdown 記法をベースとしながら、プラグインシステムにより表現力を自在に拡張できます。
- **ハイライト**: `highlight.js` による美しいコードハイライト。
- **数式・図表**: `MathJax` によるLaTeX数式表示や、`Mermaid.js`、`C3.js` 等によるグラフ・チャートの埋め込み。
- **拡張構文**: タスクリスト、脚注、カスタム属性（idやclassの付与）などをサポートしています。

### 5. Interactive JavaScript Execution (インタラクティブなJS実行)
コードサンドボックスプラグイン（`js-run`, `js-demo`）を利用することで、Markdown内から直接、安全にJavaScriptを実行できます。D3.js、Three.js、p5.js、Math.jsといったデータビジュアライゼーションや計算用のライブラリも標準でサポートしており、実行可能なリッチなサンプルドキュメントを作成できます。

### 6. Local Editing & Authoring Tools (ローカル編集・制作者向け機能)
ローカル環境（localhost）では、File System Access APIを使ってブラウザ上からMarkdownを直接編集・保存できる簡単なオーサリングツールとして機能します。コードの変更を即座に反映するオートリロードや、サイトマップ（sitemap.json）の自動生成、プロジェクト全体のオフラインエクスポート機能などを備え、`DOMPurify`による安全なレンダリングを採用しています。


## 動作モードとセキュリティ
セキュリティとデータの整合性を守るため、MDGardenは実行される環境に応じて動作モードを自動的に切り替えます。
サーバ上では動的な保存プロセスは一切走らないため、悪意のある第三者がファイルを改ざんするリスクは極めて小さくなります。

|環境 (Context)|モード|保存/更新|備考|
|---|---|---|---|
|localhost (127.0.0.1)|Author|有効|パーソナルナレッジベースとしての利用、および執筆環境|
|Public URL (Deploy)|Reader|無効|マルチファイル Wiki（公開ドキュメント）|
|file:// (Serverless)|Reader|手動|シングルファイル Wiki（オフライン配布）|


## 主要コンセプト
MDGarden の運用スタイルは大きく次の2つに分かれます。

- `inline mode`: 1つのHTML内にすべてのMarkdownコンテンツを内包する配布向けの手法。
- `include mode`: 複数の Markdown ファイルをフォルダで分割管理する標準的な Wiki 運用手法。

どちらも同じ `<md-garden>` コンポーネントを軸に動作するため、コンテンツの規模や共有方法に応じてシームレスに手法を選択・移行できます。


## 想定ユーザーとユースケース
- 個人ナレッジベースを静的ファイルとしてシンプルに管理したい開発者
- 小規模チームで手軽にドキュメントサイトやWikiを構築・公開したい運用者
- 実行可能なサンプルコードを含む技術マニュアルをオフラインで配布したい制作者

「Markdownのままデータを手元で保守したいが、ブラウザ上の見た目や回遊性はリッチに整えたい」というケースに最適です。


## 次に読むページ
- はじめて使う場合: [Getting Started](getting_started.md)
- 単一ファイル配布をしたい場合: [Single File Wiki/inline mode](inline_mode.md)
- 複数ページ運用をしたい場合: [Multi File Wiki/include mode](include_mode.md)
- 運用時の安全性を確認したい場合: [Security](security.md)

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
