'use strict';
// movies/**/index.html 全件に GA4 計測タグを冪等的に挿入する
// 挿入位置の優先順:
//   1. <meta charset="..."> の直後（大文字小文字・引用符を問わず）
//   2. <head> の直後（フォールバック）
//   3. どちらも見つからない場合は挿入せず失敗リストに記録

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const MOVIES_DIR = path.join(ROOT, 'movies');
const GA_ID     = 'G-NQYTVV8D13';

const GA_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>`;

// movies/ 以下の index.html を再帰収集
function collectHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const sub = path.join(dir, entry.name);
      const candidate = path.join(sub, 'index.html');
      if (fs.existsSync(candidate)) results.push(candidate);
    }
  }
  return results;
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');

  // 既に挿入済みならスキップ
  if (raw.includes(GA_ID)) {
    return 'skipped';
  }

  // 挿入アンカー1: <meta charset="..."> / <meta charset='...'> / <meta charset=... > （大文字小文字を問わない）
  const charsetRe = /(<meta\s+charset\s*=\s*["']?[^"'\s>]+["']?\s*\/?>)/i;
  const charsetMatch = charsetRe.exec(raw);
  if (charsetMatch) {
    const insertPos = charsetMatch.index + charsetMatch[0].length;
    const updated = raw.slice(0, insertPos) + '\n' + GA_SNIPPET + raw.slice(insertPos);
    fs.writeFileSync(filePath, updated, 'utf8');
    return 'inserted_after_charset';
  }

  // フォールバック: <head> タグの直後
  const headRe = /(<head[^>]*>)/i;
  const headMatch = headRe.exec(raw);
  if (headMatch) {
    const insertPos = headMatch.index + headMatch[0].length;
    const updated = raw.slice(0, insertPos) + '\n' + GA_SNIPPET + raw.slice(insertPos);
    fs.writeFileSync(filePath, updated, 'utf8');
    return 'inserted_after_head';
  }

  return 'failed';
}

function main() {
  const files = collectHtmlFiles(MOVIES_DIR);
  console.log(`対象ファイル数: ${files.length}`);

  let inserted_charset = 0;
  let inserted_head    = 0;
  let skipped          = 0;
  const failed         = [];

  for (const f of files) {
    const result = processFile(f);
    if (result === 'inserted_after_charset') inserted_charset++;
    else if (result === 'inserted_after_head') inserted_head++;
    else if (result === 'skipped') skipped++;
    else failed.push(f);
  }

  console.log('\n=== 処理結果 ===');
  console.log(`charset直後に挿入: ${inserted_charset} 件`);
  console.log(`<head>直後に挿入 : ${inserted_head} 件`);
  console.log(`スキップ(既存)   : ${skipped} 件`);
  console.log(`挿入失敗         : ${failed.length} 件`);
  if (failed.length > 0) {
    console.log('\n--- 挿入できなかったファイル ---');
    for (const f of failed) console.log(' ', path.relative(ROOT, f));
  }
  console.log('\n合計処理: ' + files.length + ' 件');
}

main();
