---
title: "MDGarden - Security"
lastModified: "2026-03-06T00:40:00+09:00"
indexing: true
---

# Security
MDGarden は「静的ファイルをブラウザで読む」構成のため、サーバ侵害の面積は小さくできますが、ブラウザ内で実行されるコンテンツとスクリプトの安全設計が重要です。  
このページは、実装者が最初に押さえるべきリスクと、設定での抑止ポイントをまとめた初稿です。

## 脅威モデル

まず「誰が Markdown を編集できるか」を基準に運用レベルを分けます。

- 信頼済み編集者のみ: 低リスク運用。`html` を許可しやすい
- 不特定多数が編集可能: 高リスク運用。`sanitize=true` を基本にする
- 外部提供 Markdown を取り込む: 最高リスク。`execute_script` は原則無効

攻撃者視点では、主な狙いは次の3つです。

- 任意スクリプト実行（XSS）
- 意図しないファイル参照（パス悪用）
- Local Editor の保存操作を悪用したローカル改変誘導

## 信頼境界

MDGarden の境界は大きく3層です。

- ブラウザ内: レンダリングと plugin 実行が行われる層
- ローカルファイル: `file://`、File System Access API、ダウンロード出力先
- 公開サーバ: 静的ファイル配信のみ（通常は書き込み不可）

重要なのは、`data-author` や UI 表示は「権限管理」ではなく「表示状態」である点です。  
セキュリティ境界はブラウザ権限・配信設定・コンテンツ運用ルールで作る必要があります。

## Markdown/HTML レンダリング時のリスク

Markdown 内に HTML を許可すると、表現力と引き換えに XSS 面積が広がります。  
特に危険なのは次の入力です。

- `script` タグやイベント属性（`onclick` など）
- `javascript:` スキームを含むリンク
- 外部 script/style の読み込み

`sanitize=false` で運用する場合は、編集者を強く制限し、レビュー前提にしてください。

## 設定の安全性トレードオフ

- `sanitize=true`: 安全寄り。まずはこれを標準にする
- `html=false`: HTML埋め込みを抑止。さらに安全
- `execute_script=false`: 最優先で維持したい安全設定

推奨の初期方針:

1. 本番は `sanitize=true` と `execute_script=false`
2. 例外的に script が必要なページだけ別運用に分離
3. 変更時は diff レビューで `<script>` とイベント属性を重点確認

## include mode のパス制御

include mode はリンク解決設定が安全性に直結します。

- `allowed_dirs` / `allowed_files`: 参照可能範囲を最小化
- `strict_root=true`: ルート外の曖昧参照を減らす
- `allow_parent=false` を基本に検討
- `query_path_mode` は URL 設計に合わせ、想定外パスを拒否

「表示できること」より「表示できないこと」を先に決める設計が有効です。

## Author Mode と Local Editor の注意点

Author Mode は localhost 制約で公開環境の誤操作を減らせますが、完全な防御ではありません。  
同一ページで動く他スクリプトが保存フローを悪用する可能性は残ります。

Local Editor では次を徹底してください。

- 保存は常にユーザー操作起点（クリック）で実行
- 保存先を毎回確認する運用
- 不要な外部 script を同ページに載せない

「サーバを書き換えられない」ことと「ローカル改変誘導がない」ことは別問題です。

## Offline Export のリスク

Offline Wiki 出力は配布性が高い反面、次の点に注意が必要です。

- 外部アセット参照が残る場合、オフラインで完全再現できない
- 配布後のファイル改変検知が難しい
- `file://` 実行時はブラウザ差異が大きい

配布物には最低限、生成日時・生成元コミット・既知制約を明記することを推奨します。

## Plugin とサプライチェーン

plugin は機能拡張の中心ですが、同時に実行権限を広げます。

- 由来不明 plugin の導入を避ける
- 依存バージョンを固定し、更新時に差分検証
- plugin 読み込み順を固定し、挙動の再現性を確保

特に `execute_script` と併用する場合は、trusted source だけに限定してください。

## IndexedDB データの扱い

IndexedDB は改ざん耐性を保証する保管庫ではありません。  
`runtimeOverride` や sitemap キャッシュは「利便性のためのローカル状態」として扱います。

運用上の要点:

- 破損時に初期化できる手順を用意
- 永続データの正本は Git / バックアップ側に置く
- ブラウザストレージ消去時の復旧方法をドキュメント化

## 本番運用の推奨対策

- CSP（Content Security Policy）導入
- 外部スクリプトに SRI 適用
- 編集権限を最小人数に限定
- 公開前レビューで Front Matter / script / link を重点確認
- 配布物（Offline Wiki）にバージョン情報を埋め込む

## セキュリティチェックリスト（公開前）

- `sanitize` と `execute_script` の意図を確認したか
- 想定外の `src` / 外部リンク / 外部 script がないか
- `allowed_dirs` / `allowed_files` が過剰に広くないか
- Author Mode が公開 URL 配下で有効化されていないか
- Offline Export の動作と制約を検証したか
- 生成物とソースを対応づける情報（コミットIDなど）を残したか

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
