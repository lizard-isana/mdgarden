---
title: "MDGarden - Jorro"
lastModified: "2026-03-06T12:00:00+09:00"
indexing: true
---

# Jorro
Jorro は、MDGarden と同時に使うことを意図して設計されたローカルホスト専用のミニマム Web サーバです。 
`127.0.0.1` のみで待ち受ける設計で、実行ファイルを置いたディレクトリをドキュメントルートとして配信します。

## ダウンロード
- https://github.com/lizard-isana/jorro/releases/


## 機能の紹介（要約）

- 配信先は `127.0.0.1` 限定（外部公開しない前提）
- 実行ファイルを置いたディレクトリを配信ルートとして扱う
- 起動時にブラウザを開いてすぐ確認できる
- `jorro-config.json` でポートや許可拡張子などを制御できる
- `GET` / `HEAD` のみ許可、隠しパス非公開、ディレクトリ一覧無効など最小限の防御を持つ
- ホットリロードにより、エディタでの編集が即反映される。
- 実行ファイルサイズは10MB以下、メモリ使用量は数十MB程度。

## MDGarden と組み合わせる理由

MDGarden は静的ファイルをブラウザで読む構成なので、ローカル検証には静的サーバが必要です。  
Jorroは極めて軽量でポータビリティが高く、localhost限定のため不要な漏洩リスクを最小限に保てます。

- `localhost` 条件が必要な Author Mode がそのまま使える
- 余計なミドルウェアなしで `index.html` / `.md` / `.json` を配信できる
- 開発中の確認環境を配布環境と近い形で保てる
- ホットリロードできるため、エディタなどでの編集作業と相性が良い

## 最短セットアップ

1. MDGarden の `docs/` など配信したいフォルダにjorroの実行ファイルを置く
2. 同じ場所で Jorro を起動する
3. 開いたブラウザで MDGarden を確認する

## 推奨設定（MDGarden 併用時）

`jorro-config.json` 例:

```json
{
  "port": 8080,
  "indexFile": "index.html",
  "allowExtensions": [".html", ".css", ".js", ".md", ".json"],
  "hotReload": true,
  "devConsoleErrors": false
}
```

ポイント:

- `allowExtensions` に `.md` / `.json` を含める（MDGarden に必要）
- `indexFile` に `index.html` を指定する
- `hotReload` に `true` を指定するとファイル更新時にブラウザがリロードされます
- `devConsoleErrors` に `true` を指定すると、サーバ側のエラーがブラウザのコンソールに流れます


## 注意点

- Jorro は公開サーバ用途ではありません[^1]
- 実行ファイルや設定をそのまま公開ディレクトリへ置かないでください[^2]
- Author Mode の有効条件（localhost かつ deploy 配下外）を維持する
- `hotReload`と`devConsoleErrors`は有効化すると、表示時にページ内にJavaScriptが挿入されます
[^1]:localhostでしか待ち受けず、静的ファイルしか配信しないため、同一ネットワークやサーバの外から利用することはできません。
[^2]:ただし、誤って公開サーバ上に置いて起動しても外部から利用することはできず改竄や漏洩などのリスクはほとんどありません。

詳細仕様は Jorro README を参照してください:

- https://github.com/lizard-isana/jorro/blob/main/README.md

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
