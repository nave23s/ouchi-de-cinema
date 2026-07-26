---
name: affiliate-audit
description: 全公開スラッグページのアフィリエイトリンク網羅監査。Amazon/VOD6種の有無・タグ不備を検出しレポートに出力する。完全読み取り専用。サイトファイル・movies.json への書き込み禁止。affiliate-report.md と affiliate-matrix.csv のみ出力可。「監査して」「アフィリ確認」「リンクチェック」と言われたら使う。
allowed-tools:
  - Bash
  - Read
  - Write
---

# affiliate-audit スキル

## 役割

全公開スラッグページ（Type A + Type C slug版）を対象に、6種のアフィリエイトリンクの有無とタグ不備を検出する。
**完全読み取り専用。movies.json・HTMLファイルへの書き込みは絶対禁止。**
出力ファイルは `affiliate-report.md` と `affiliate-matrix.csv` のみ。

---

## 提携済みリンク定義（2026-07時点）

| サービス | 識別パターン | tracking pixel 有無 |
|---------|------------|-------------------|
| Amazon | `ouchidecinama-22` | なし（タグ埋め込み方式） |
| Hulu (afb) | `t.afi-b.com/visit.php?a=G8792C` | `t.afi-b.com/lead/G8792C` |
| クランクイン!ビデオ (afb) | `t.afi-b.com/visit.php?a=Q16300l` | `t.afi-b.com/lead/Q16300l` |
| WOWOWオンデマンド (A8) | `a8mat=4B62OF+9ERNZM` | A8 0.gif（チェック対象外） |
| TSUTAYA DISCAS (A8) | `a8mat=4B62OF+9DKSS2` | A8 0.gif（チェック対象外） |
| ABEMAプレミアム (A8) | `a8mat=4B62OF+9FD3LE` | A8 0.gif（チェック対象外） |

---

## 処理フロー

### Step 1【スクリプト作成・実行】

`scripts/audit-affiliates.js` を Write で作成し、Node.js で実行する。

```
node scripts/audit-affiliates.js
```

### Step 2【レポート確認】

`affiliate-report.md` を Read して内容をユーザーに報告する。

### Step 3【報告】

- 配備率（6種×全ページ）
- 要対応件数
- 次のアクション提案（対応不要 / 要修正）

---

## audit-affiliates.js の内容（参照実装）

```javascript
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const movies     = JSON.parse(fs.readFileSync(path.join(ROOT, 'movies.json'),       'utf8'));
const pubList    = JSON.parse(fs.readFileSync(path.join(ROOT, 'publish_list.json'), 'utf8'));
const plSet      = new Set(pubList.map(e => `${e.n}_${e.t}`));

// slug付き かつ publish_list収録 のページ全件（SKIP_N含む）
const targets = movies.filter(m => m.slug && plSet.has(`${m.n}_${m.t}`));
process.stderr.write(`対象: ${targets.length} ページ\n`);

const results = [];

for (const movie of targets) {
  const htmlPath = path.join(ROOT, 'movies', movie.slug, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    results.push({ slug: movie.slug, n: movie.n, t: movie.t || '', exists: false });
    continue;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');

  const hasAmazon  = /ouchidecinama-22/.test(html);
  const hasHulu    = /t\.afi-b\.com\/visit\.php\?a=G8792C/.test(html);
  const hasCrankin = /t\.afi-b\.com\/visit\.php\?a=Q16300l/.test(html);
  const hasWowow   = /9ERNZM\+5DFW/.test(html);
  const hasTsutaya = /9DKSS2\+47OU/.test(html);
  const hasAbema   = /9FD3LE\+4EKC/.test(html);

  const vodCount = [hasHulu, hasCrankin, hasWowow, hasTsutaya, hasAbema].filter(Boolean).length;

  // タグ不備検出
  const amazonNoTag       = /href="https:\/\/www\.amazon\.co\.jp/.test(html) && !hasAmazon;
  const huluNoTracking    = hasHulu    && !/t\.afi-b\.com\/lead\/G8792C/.test(html);
  const crankinNoTracking = hasCrankin && !/t\.afi-b\.com\/lead\/Q16300l/.test(html);

  results.push({
    slug: movie.slug, n: movie.n, t: movie.t || '',
    exists: true,
    amazon: hasAmazon, hulu: hasHulu, crankin: hasCrankin,
    wowow: hasWowow, tsutaya: hasTsutaya, abema: hasAbema,
    vodCount,
    amazonNoTag, huluNoTracking, crankinNoTracking,
  });
}

// ---- CSV 出力 ----
const csvLines = ['slug,n,amazon,hulu,crankin,wowow,tsutaya,abema'];
for (const r of results.filter(r => r.exists)) {
  csvLines.push([
    r.slug, r.n,
    r.amazon  ? 1 : 0, r.hulu    ? 1 : 0, r.crankin ? 1 : 0,
    r.wowow   ? 1 : 0, r.tsutaya ? 1 : 0, r.abema   ? 1 : 0,
  ].join(','));
}
fs.writeFileSync(path.join(ROOT, 'affiliate-matrix.csv'), csvLines.join('\n'), 'utf8');
process.stderr.write(`affiliate-matrix.csv 出力完了\n`);

// ---- レポート生成 ----
const valid        = results.filter(r => r.exists);
const noAmazon     = valid.filter(r => !r.amazon);
const noVod        = valid.filter(r => r.vodCount === 0);
const amzNoTag     = valid.filter(r => r.amazonNoTag);
const huluNoTr     = valid.filter(r => r.huluNoTracking);
const crankinNoTr  = valid.filter(r => r.crankinNoTracking);
const missingFile  = results.filter(r => !r.exists);

const pct = n => ((n / valid.length) * 100).toFixed(1);
const fmtList = arr => arr.length === 0
  ? '（なし）'
  : arr.map(r => `- n=${r.n} \`${r.slug}\``).join('\n');

const now = new Date().toISOString().slice(0, 10);
const report = `# アフィリエイト監査レポート

生成日: ${now}  
対象ページ数: ${valid.length}本（ファイル未存在: ${missingFile.length}本）

---

## サマリー

| チェック項目 | 件数 | 配備率 |
|------------|------|--------|
| Amazon あり | ${valid.filter(r => r.amazon).length} | ${pct(valid.filter(r => r.amazon).length)}% |
| Hulu あり | ${valid.filter(r => r.hulu).length} | ${pct(valid.filter(r => r.hulu).length)}% |
| クランクイン あり | ${valid.filter(r => r.crankin).length} | ${pct(valid.filter(r => r.crankin).length)}% |
| WOWOW あり | ${valid.filter(r => r.wowow).length} | ${pct(valid.filter(r => r.wowow).length)}% |
| TSUTAYA DISCAS あり | ${valid.filter(r => r.tsutaya).length} | ${pct(valid.filter(r => r.tsutaya).length)}% |
| ABEMA あり | ${valid.filter(r => r.abema).length} | ${pct(valid.filter(r => r.abema).length)}% |

---

## 1. Amazon リンクなし（最優先の穴） — ${noAmazon.length}件

${fmtList(noAmazon)}

---

## 2. VOD リンクゼロ（5サービスすべて未配備） — ${noVod.length}件

${fmtList(noVod)}

---

## 3. タグ不備

### 3-a. Amazon リンクあり・アソシエイトID欠落 — ${amzNoTag.length}件

${fmtList(amzNoTag)}

### 3-b. Hulu afbリンクあり・1x1計測画像なし — ${huluNoTr.length}件

${fmtList(huluNoTr)}

### 3-c. クランクイン afbリンクあり・1x1計測画像なし — ${crankinNoTr.length}件

${fmtList(crankinNoTr)}

---

## 4. ファイル未存在（publish_listにあるがHTMLなし） — ${missingFile.length}件

${missingFile.length === 0 ? '（なし）' : missingFile.map(r => `- n=${r.n} \`${r.slug}\``).join('\n')}

---

*affiliate-matrix.csv に全ページ×6サービスのマトリクスを出力済み*
`;

fs.writeFileSync(path.join(ROOT, 'affiliate-report.md'), report, 'utf8');
console.log(report);
```

---

## 出力ファイル

| ファイル | 内容 |
|---------|------|
| `affiliate-report.md` | 日本語監査レポート（ルートに上書き出力） |
| `affiliate-matrix.csv` | 全ページ×6種リンクのマトリクス（ルートに上書き出力） |

---

## 禁止事項

- `movies.json` への書き込み禁止
- 個別の HTML ページへの書き込み禁止
- `publish_list.json` への書き込み禁止
- 問題を自動修正しない（報告のみ・修正は `affiliate-insert` スキルで行う）
- Type B（数値URL・slug なし）ページのスキャンは対象外

---

## 定期実行の目安

- アフィリエイトリンクを変更したとき
- 新規ページを大量追加したとき（バッチ生成後）
- ASP 提携を新規追加したとき
