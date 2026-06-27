---
name: affiliate-insert
description: VOD・アフィリエイトリンクのテンプレート関数を追加・修正し、全スラッグページを再生成する。「VODリンクを追加して」「アフィリリンクを更新して」「[ASP名]の案件を組み込んで」「Amazonリンクを修正して」と言われたときに使用。必ずStep2で計画を提示しユーザー確認を取ってから実装する。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# アフィリエイトリンク管理スキル

## 前提：実際のサイト構造

このスキルは以下の構造を前提とする。旧来の誤った構造（movies/data/[slug].json 等）は存在しない。

| 要素 | 実際の構造 |
|------|-----------|
| データ | `movies.json` 単一ファイル（フィールド: n, t, d, s, y, yt, english_title, slug） |
| 公開管理 | `publish_list.json` との照合 |
| VOD/アフィリリンク | `scripts/generate_slug_pages.js` のテンプレート関数内で全ページ共通生成 |
| スラッグページ | 約800本。Amazon アフィリタグ（ouchidecinama-22）付き。このスキルで管理 |
| 旧テンプレートページ | 約65本（movies/{n}/ 形式、slugなし）。Amazon タグなし。このスキルのスコープ外 |
| 手書き詳細レビュー | 6本（SKIP_N: 303/101/2176/2719/1239/1100）。Amazon タグなし。個別編集 |

### ページ種別と管理方法

```
【Type A：スラッグページ（約800本）】← このスキルのメイン対象
movies/baby-driver-2017/index.html 等
→ generate_slug_pages.js で管理。テンプレート修正 → 再生成で全ページ一括反映

【Type B：旧テンプレートページ（約65本）】← このスキルのスコープ外
movies/6/, movies/58/, movies/2595/ 等（movies.json に slug フィールドなし）
→ 現行スクリプトでは再生成不可。Amazon アフィリタグなし。別途対応が必要

【Type C：手書き詳細レビュー（6本：SKIP_N）】← 個別対応
movies/303/, movies/101/, movies/2176/, movies/2719/, movies/1239/, movies/1100/
→ generate_slug_pages.js が永久スキップ。個別 HTML 編集のみ
```

## 発動条件

### 起動する指示の例
- 「アフィリエイトリンクを〜」「VODリンクを〜」「アフィリを〜」
- 「[サービス名]を追加/変更/更新して」（U-NEXT、Hulu、Disney+、ABEMA、WOWOW 等）
- 「[ASP名]の案件を組み込んで」（afb、A8.net、楽天 等）
- 「Amazonリンクを修正して」「検索URLをアフィリリンクに差し替えて」

### 誤爆しない条件（起動しないケース）
- VOD サービスの使い方について質問された場合
- アフィリエイトの仕組みの一般的な説明を求められた場合

---

## 処理フロー

### Step 1【現状調査】

`scripts/generate_slug_pages.js` の先頭部を Read で確認する。

確認するポイント：
- 現在の `AFFILIATE_ID`（= `ouchidecinama-22`）
- `amazonPrimeUrl()`, `amazonBlurayUrl()`, `amazonSoundtrackUrl()` の実装
- `vodAffiliateUrl()` テーブルの現在のエントリ
- 変更対象が Type A（スラッグページ）か Type C（SKIP_N 手書き）か、または両方かを判定
- Type B（旧テンプレートページ）が対象の場合は「このスキルのスコープ外」とユーザーに通知

### Step 2【変更計画の提示 → ユーザー確認で停止】

以下を日本語で明示し、「この計画で進めますか？」と確認を求めて**停止する**。

- 変更対象ファイルと該当行付近
- 追加・修正するリンク形式（変更前 → 変更後 の diff 形式で表示）
- 影響するスラッグページ数（再生成される本数）
- Type C 手書き 6 本への影響の有無（影響がある場合は個別編集が必要である旨を明示）
- Type B 旧テンプレートページが対象範囲に含まれる場合は、スコープ外であることを明示

**ユーザーの承認なしに Step 3 以降へ進んではならない。**

### Step 3【実装】（承認後のみ）

Type A（スラッグページ）対象の場合：
- `scripts/generate_slug_pages.js` の該当関数を Edit で修正する

Type C（SKIP_N 手書き）が対象の場合：
- 各 HTML ファイルの VOD セクションを grep で特定してから個別編集する

### Step 4【再生成】

```
node scripts/generate_slug_pages.js
```

完了ログ（「新規生成 〇本 / スキップ（既存）〇本」）を確認する。

> 注意：このコマンドは既存の全スラッグページを上書きするため、Step 2 の承認なしに実行してはならない。

### Step 5【差分確認】

再生成されたページを数本サンプルで確認する。

```bash
# リンクが正しく埋め込まれているか確認（スラッグページ 1 本でサンプル）
grep -m 5 "unext\|amazon\|netflix\|hulu\|disney\|abema" movies/baby-driver-2017/index.html

# アフィリタグと rel 属性が正しいか確認
grep -m 5 "ouchidecinama-22\|nofollow sponsored" movies/baby-driver-2017/index.html
```

### Step 6【push 前報告】

以下をまとめてユーザーに報告する。**git push はしない（ユーザーの指示を待つ）。**

- 変更したファイルと修正内容の要約
- 再生成された本数
- Type C 手書きページの対応状況（対応済み / 対応不要 / 未対応で要確認）
- Type B 旧テンプレートページへの言及（今回対象外だった場合でも明示）
- 次のアクション（`git push` の指示を待つ旨）

---

## 扱うファイル

| ファイル | 操作 |
|---------|------|
| `scripts/generate_slug_pages.js` | アフィリ関数の追加・修正（メイン） |
| `movies/303/index.html` 等（Type C 6 本） | 対象の場合のみ個別編集 |

---

## 絶対にやってはいけないこと

- `movies/data/[slug].json` を作成しようとしない（その構造は存在しない）
- `movies.json` に `vod_services` / `affiliates` / `published` / `review_generated` フィールドを追加しない
- ユーザー承認なしに `node scripts/generate_slug_pages.js` を実行しない（全スラッグページが上書きされる）
- `rel="nofollow sponsored"` を省略しない（景表法・Google ガイドライン上必須）
- Type B 旧テンプレートページ（約65本）を「このスキルで修正可能」と誤って案内しない
- スラッグページのテンプレートを変更した際、Type C 手書き 6 本へ反映されないことを黙ってスキップしない

---

## ASP 別リンク形式

### Amazon（現在稼働中・検索 URL タイプ）

```javascript
const AFFILIATE_ID = 'ouchidecinama-22';

function amazonPrimeUrl(title) {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(title)}&i=instant-video&tag=${AFFILIATE_ID}`;
}
function amazonBlurayUrl(title) {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(title + ' Blu-ray')}&tag=${AFFILIATE_ID}`;
}
function amazonSoundtrackUrl(title) {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(title + ' サウンドトラック')}&tag=${AFFILIATE_ID}`;
}

// 将来の拡張ポイント（このスキルのスコープ外）：
// ASIN ダイレクトリンク対応。movies.json に asin フィールドを追加し、
// フィールドの有無で検索 URL / ASIN URL を分岐する設計。
// 対応が必要になった時点で別タスクとして実装すること。
```

### VOD サービス（vodAffiliateUrl テーブル）

提携後にテーブルの該当行を更新するだけで全スラッグページに反映される。
未提携サービスは `searchFallbackUrl`（検索 URL）に自動フォールバック。

```javascript
// VOD アフィリエイト URL ルックアップテーブル
// 提携状況: 提携済み ✓ / 申請中 ⏳ / なし ✗
const VOD_AFFILIATE = {
  // U-NEXT: afb 経由・申請中 ⏳ → 承認後に URL を入れる
  // 'unext': 'https://h.accesstrade.net/sp/cc?rk=...',

  // Hulu: afb 経由・申請中 ⏳ → 承認後に URL を入れる
  // 'hulu': 'https://h.accesstrade.net/sp/cc?rk=...',

  // Disney+: afb 経由・申請中 ⏳ → 承認後に URL を入れる
  // 'disney': 'https://h.accesstrade.net/sp/cc?rk=...',

  // ABEMA プレミアム: A8.net 経由・提携済み ✓ → URL を入れる
  // 'abema': 'https://px.a8.net/svt/ejp?a8mat=...',

  // WOWOW: A8.net 経由・提携済み ✓ → URL を入れる
  // 'wowow': 'https://px.a8.net/svt/ejp?a8mat=...',

  // 楽天（楽天 TV 等）: 楽天アフィリエイト・提携済み ✓ → URL を入れる
  // 'rakuten': 'https://hb.afl.rakuten.co.jp/hgc/...',

  // Netflix: アフィリエイトプログラムなし ✗ → 検索 URL のまま
};

function vodAffiliateUrl(serviceKey, searchFallbackUrl) {
  return VOD_AFFILIATE[serviceKey] || searchFallbackUrl;
}
```

### リンク属性の必須ルール

すべてのアフィリエイトリンクに以下を付与すること：

```html
rel="noopener nofollow sponsored"
```

`nofollow sponsored` を省略した場合は Google のリンクスパムポリシー違反になる。

---

## テンプレート管理外ページの扱い

### Type C：手書き詳細レビュー（SKIP_N 6本）

| n | URL パス |
|---|---------|
| 303 | movies/303/ |
| 101 | movies/101/ |
| 2176 | movies/2176/ |
| 2719 | movies/2719/ |
| 1239 | movies/1239/ |
| 1100 | movies/1100/ |

スラッグページのテンプレートを変更した際は必ず：
1. 「Type C 手書き 6 本には自動反映されていません」とユーザーに通知する
2. 「手書きページも同様に更新しますか？」と確認を取る
3. 対応する場合は各 HTML ファイルの VOD セクションを grep で特定してから個別編集する

### Type B：旧テンプレートページ（約65本・このスキルのスコープ外）

`movies/6/`, `movies/58/`, `movies/2595/` ～ `movies/2716/` 等。
`movies.json` に `slug` フィールドがなく、現行スクリプトでの再生成不可。
Amazon アフィリタグ（ouchidecinama-22）が付いていない。
これらへのアフィリタグ付与は別途専用スクリプトが必要であり、このスキルでは扱わない。
ユーザーから「旧ページにもタグを付けたい」と言われた場合は、別タスクとして切り出すよう提案する。
