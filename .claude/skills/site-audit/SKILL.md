---
name: site-audit
description: サイト全体の健康診断。ページ欠落・孤児ページ・リンク切れ・SEOタグ欠落を検出し audit-report.md に出力する。「監査して」「サイトチェック」「ヘルスチェック」「audit」と言われたら使う。movies.json本体・HTMLファイルへの書き込みは禁止。audit-report.md のみ出力可。
allowed-tools:
  - Bash
  - Write
---

# site-audit スキル — サイト健康診断

**完全読み取り専用。movies.json・HTMLファイルへの書き込み禁止。出力は audit-report.md のみ。**

## リポジトリの実構造（確認済み・2026-07-09時点）

- 映画ページ: `movies/{slug}/index.html`（1スラッグ1フォルダ）
- 内部リンク: 絶対URL形式 `https://ouchi-de-cinema.com/movies/{slug}/`
- movies/ フォルダ総数: 約878（slug版約803 + 数値レガシー約71 + episodeページ8）
- 除外対象: `episode` フィールドあり（iron-chef-brazil-s1e* 等）/ 数値フォルダ（legacy扱い）

## チェック項目と重大度分類

| 重大度 | 内容 |
|--------|------|
| 重大 | ページ欠落（slug→フォルダなし）、内部リンク切れ |
| 中 | SEOタグ欠落（title/description/OGP/canonical） |
| 軽微 | 孤児ページ、YouTube URL形式異常 |

## 監査スクリプト

以下のNode.jsスクリプトを実行する。すべてローカルfsのみで完結する。

```bash
node -e "
const fs = require('fs');
const path = require('path');

const movies = JSON.parse(fs.readFileSync('movies.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);

// 対象: slug付き・episodeなし（公開済み映画ページ）
const published = movies.filter(m => m.slug && !m.episode);

// 全フォルダリスト
const allFolders = new Set(
  fs.readdirSync('movies').filter(f =>
    fs.statSync('movies/' + f).isDirectory()
  )
);

// 全有効スラッグセット（episode含む）
const allSlugs = new Set(movies.filter(m => m.slug).map(m => m.slug));

// ── 1. ページ欠落チェック ───────────────────────
const missingPages = published.filter(m =>
  !allFolders.has(m.slug)
);

// ── 2. 孤児ページチェック ──────────────────────
// 数値フォルダはレガシー扱いで別集計
const orphanLegacy = [];
const orphanUnknown = [];
allFolders.forEach(folder => {
  if (allSlugs.has(folder)) return; // 正常
  if (/^\d+\$/.test(folder)) {
    orphanLegacy.push(folder); // 数値=旧レガシー
  } else {
    orphanUnknown.push(folder); // 不明な孤児
  }
});

// ── 3. SEOタグ + 内部リンクチェック ───────────────
const seoIssues = [];
const brokenLinks = [];
let checkedHtml = 0;

published.forEach(m => {
  const htmlPath = 'movies/' + m.slug + '/index.html';
  if (!fs.existsSync(htmlPath)) return;

  const html = fs.readFileSync(htmlPath, 'utf8');
  checkedHtml++;

  // SEOタグ確認
  const missing = [];
  if (!/<title>[^<]{2,}<\/title>/i.test(html))            missing.push('title');
  if (!/name=[\"']description[\"'].*content=[\"'][^\"']{5}/i.test(html) &&
      !/content=[\"'][^\"']{5}.*name=[\"']description[\"']/i.test(html)) missing.push('meta description');
  if (!/og:title/i.test(html))       missing.push('og:title');
  if (!/og:description/i.test(html)) missing.push('og:description');
  if (!/og:image/i.test(html))       missing.push('og:image');
  if (!/<link[^>]+canonical/i.test(html)) missing.push('canonical');

  if (missing.length > 0) {
    seoIssues.push({ n: m.n, t: m.t, slug: m.slug, missing });
  }

  // 内部リンク切れ確認（/movies/{slug}/形式）
  const linkMatches = [...html.matchAll(/href=\"https:\/\/ouchi-de-cinema\.com\/movies\/([^\/\"]+)\//g)];
  linkMatches.forEach(match => {
    const linkedSlug = match[1];
    // 自分自身・canonicalは除外
    if (linkedSlug === m.slug) return;
    if (!allFolders.has(linkedSlug)) {
      brokenLinks.push({ fromSlug: m.slug, fromN: m.n, toSlug: linkedSlug });
    }
  });
});

// ── 4. YouTube URL形式チェック ─────────────────
const ytIssues = [];
movies.filter(m => m.slug && !m.episode && m.y).forEach(m => {
  const url = m.y;
  const type = m.yt;
  if (type === 'd') {
    // 直接URLはyoutu.be/xxxまたはyoutube.com/watch?v=xxx形式であるべき
    if (!/youtu(\.be\/|be\.com\/watch\?v=)/.test(url)) {
      ytIssues.push({ n: m.n, t: m.t, yt: type, url });
    }
  } else if (type === 's') {
    // 検索URLはyoutube.com/results形式
    if (!/youtube\.com\/results/.test(url)) {
      ytIssues.push({ n: m.n, t: m.t, yt: type, url });
    }
  }
});

// ── レポート生成 ────────────────────────────────
const lines = [];
lines.push('# オウチ de CINEMA — サイト監査レポート');
lines.push('');
lines.push('生成日: ' + today);
lines.push('監査対象: 公開済み ' + published.length + '件');
lines.push('HTML確認済み: ' + checkedHtml + '件');
lines.push('');

// サマリー
lines.push('## サマリー');
lines.push('');
lines.push('| 重大度 | 項目 | 件数 |');
lines.push('|--------|------|------|');
lines.push('| 🔴 重大 | ページ欠落 | ' + missingPages.length + '件 |');
lines.push('| 🔴 重大 | 内部リンク切れ | ' + brokenLinks.length + '件 |');
lines.push('| 🟡 中 | SEOタグ欠落 | ' + seoIssues.length + '件 |');
lines.push('| ⚪ 軽微 | 孤児ページ(不明) | ' + orphanUnknown.length + '件 |');
lines.push('| ⚪ 軽微 | 旧レガシーページ | ' + orphanLegacy.length + '件 |');
lines.push('| ⚪ 軽微 | YouTube URL異常 | ' + ytIssues.length + '件 |');
lines.push('');

// 重大: ページ欠落
lines.push('## 🔴 重大: ページ欠落（' + missingPages.length + '件）');
lines.push('');
if (missingPages.length === 0) {
  lines.push('問題なし。');
} else {
  missingPages.forEach(m => lines.push('- n=' + m.n + ' | ' + m.t + ' | slug: ' + m.slug));
}
lines.push('');

// 重大: 内部リンク切れ
lines.push('## 🔴 重大: 内部リンク切れ（' + brokenLinks.length + '件）');
lines.push('');
if (brokenLinks.length === 0) {
  lines.push('問題なし。');
} else {
  const uniqueBroken = [...new Map(brokenLinks.map(b => [b.toSlug, b])).values()];
  uniqueBroken.forEach(b => lines.push('- 存在しないスラッグ: ' + b.toSlug + '（参照元: n=' + b.fromN + '）'));
}
lines.push('');

// 中: SEOタグ欠落
lines.push('## 🟡 中: SEOタグ欠落（' + seoIssues.length + '件）');
lines.push('');
if (seoIssues.length === 0) {
  lines.push('問題なし。');
} else {
  seoIssues.forEach(s => {
    lines.push('- n=' + s.n + ' | ' + s.t + ' | 欠落: ' + s.missing.join(', '));
  });
}
lines.push('');

// 軽微: 孤児ページ（不明）
lines.push('## ⚪ 軽微: 孤児ページ・不明フォルダ（' + orphanUnknown.length + '件）');
lines.push('');
if (orphanUnknown.length === 0) {
  lines.push('問題なし。');
} else {
  orphanUnknown.forEach(f => lines.push('- movies/' + f + '/'));
}
lines.push('');

// 軽微: レガシー数値ページ
lines.push('## ⚪ 軽微: 旧レガシーページ（数値URL）（' + orphanLegacy.length + '件）');
lines.push('');
lines.push('以下のフォルダは数値URLのレガシーページ。slug版が存在するものは重複コンテンツ。');
lines.push('');
orphanLegacy.forEach(f => {
  const m = movies.find(x => x.n === parseInt(f));
  const info = m ? (m.slug ? '⚠ slug版あり: ' + m.slug : 'slug未付与') : '対応エントリなし';
  lines.push('- movies/' + f + '/ ← ' + info);
});
lines.push('');

// 軽微: YouTube URL異常
lines.push('## ⚪ 軽微: YouTube URL形式異常（' + ytIssues.length + '件）');
lines.push('');
if (ytIssues.length === 0) {
  lines.push('問題なし。');
} else {
  ytIssues.forEach(y => lines.push('- n=' + y.n + ' | ' + y.t + ' | yt=' + y.yt + ' | ' + y.url));
}
lines.push('');

lines.push('---');
lines.push('*このレポートは自動生成されました（site-auditスキル）*');

fs.writeFileSync('audit-report.md', lines.join('\n'), 'utf8');
console.log('audit-report.md を出力しました');
console.log('重大:', missingPages.length + brokenLinks.length, '件 / 中:', seoIssues.length, '件 / 軽微:', orphanUnknown.length + orphanLegacy.length + ytIssues.length, '件');
"
```

## 使い方

「監査して」→ 上記スクリプトを実行し audit-report.md を生成  
「サイトチェック」「ヘルスチェック」でも同様  
レポート確認後、修正は各担当スキル（seo-fix / json-guard 等）に委ねる

## 注意事項

- 約800件のHTMLを読み込むため、実行に20〜40秒かかる場合がある
- `audit-report.md` は `.gitignore` 対象外（コミットしてもよい）
- 旧レガシー数値ページの削除はユーザー確認後に手動で実施する
- episode ページはシリーズナビリンクを持つため、内部リンクチェックの対象に含まれる
