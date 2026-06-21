/**
 * scripts/import_form_responses.js
 *
 * Google Formsの回答CSVをmovies.jsonのdフィールドに取り込む。
 *
 * 使い方:
 *   node scripts/import_form_responses.js [CSVファイルパス]
 *   ※ファイルパス省略時は ./form_responses.csv を使用
 *
 * CSV列構成 (Google Forms エクスポート形式):
 *   列1: タイムスタンプ
 *   列2: 作品名 (例: 「シン・ゴジラ(n=156)」または「シン・ゴジラ」)
 *   列3: レビュー本文
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const MOVIES_FILE = path.join(__dirname, '..', 'movies.json');
const CSV_FILE = process.argv[2] || path.join(__dirname, '..', 'form_responses.csv');
const PENDING_FILE = path.join(__dirname, '..', 'pending_for_form.txt');

// ── CSV パーサー (RFC 4180 準拠・改行・ダブルクォート対応) ──────────────────

function parseCsv(text) {
  const rows = [];
  let col = '';
  let row = [];
  let inQuote = false;

  // BOM除去
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  // 末尾に改行を保証
  if (!text.endsWith('\n')) text += '\n';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') {
        col += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        col += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        row.push(col);
        col = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(col);
        col = '';
        rows.push(row);
        row = [];
        i++;
      } else if (ch === '\n') {
        row.push(col);
        col = '';
        rows.push(row);
        row = [];
      } else {
        col += ch;
      }
    }
  }

  return rows.filter(r => r.some(c => c.trim() !== ''));
}

// ── nとタイトルの抽出 ───────────────────────────────────────────────────────

function parseMovieField(raw) {
  raw = raw.trim();
  // 「タイトル(n=XXX)」または「タイトル（n=XXX）」形式を検出
  const m = raw.match(/^(.+?)\s*[（(]n=(\d+)[）)]\s*$/);
  if (m) {
    return { title: m[1].trim(), n: parseInt(m[2], 10) };
  }
  return { title: raw, n: null };
}

// ── タイトルでmovies.jsonを検索 (前方一致・完全一致の順) ────────────────────

function findByTitle(arr, title) {
  const exact = arr.find(x => x.t === title);
  if (exact) return exact;

  // 部分一致（タイトルを含む）
  const partial = arr.filter(x => x.t && x.t.includes(title));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) return { __multi__: partial };

  return null;
}

// ── 確認プロンプト ───────────────────────────────────────────────────────────

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ── メイン ──────────────────────────────────────────────────────────────────

async function main() {
  // --- ファイル確認 ---
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`\nエラー: CSVファイルが見つかりません → ${CSV_FILE}`);
    console.error('Google スプレッドシートからダウンロードしたCSVをプロジェクトルートに');
    console.error('form_responses.csv という名前で置いてください。\n');
    process.exit(1);
  }

  if (!fs.existsSync(MOVIES_FILE)) {
    console.error(`\nエラー: movies.json が見つかりません → ${MOVIES_FILE}\n`);
    process.exit(1);
  }

  // --- データ読み込み ---
  const csvText = fs.readFileSync(CSV_FILE, 'utf8');
  const rows = parseCsv(csvText);

  if (rows.length === 0) {
    console.error('\nエラー: CSVが空です。\n');
    process.exit(1);
  }

  const arr = JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf8'));

  // --- ヘッダー行のスキップ判定 ---
  // 1行目の列2がタイムスタンプ的な文字列でなければデータ行
  const firstRow = rows[0];
  const headerKeywords = ['タイムスタンプ', 'Timestamp', '作品名', 'タイトル', 'レビュー'];
  const isHeader = headerKeywords.some(kw =>
    (firstRow[0] || '').includes(kw) || (firstRow[1] || '').includes(kw)
  );
  const dataRows = isHeader ? rows.slice(1) : rows;

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Google Forms インポーター`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`CSV: ${CSV_FILE}`);
  console.log(`データ行数: ${dataRows.length}`);
  console.log(`movies.json エントリ数: ${arr.length}\n`);

  // --- 各行を処理してプレビュー構築 ---
  const updates = [];   // 正常に解決できた更新
  const warnings = [];  // スキップ・要確認

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = (isHeader ? i + 2 : i + 1); // CSV上の行番号

    if (row.length < 3) {
      warnings.push(`行${rowNum}: 列が足りません (${row.length}列) → スキップ`);
      continue;
    }

    const rawTitle = row[1] || '';
    const reviewBody = row[2] || '';

    if (!rawTitle.trim()) {
      warnings.push(`行${rowNum}: 作品名が空 → スキップ`);
      continue;
    }
    if (!reviewBody.trim()) {
      warnings.push(`行${rowNum}: レビュー本文が空 → スキップ`);
      continue;
    }

    const { title, n } = parseMovieField(rawTitle);
    let entry = null;

    if (n !== null) {
      // n指定あり → IDで直接検索
      entry = arr.find(x => x.n === n);
      if (!entry) {
        warnings.push(`行${rowNum} [${rawTitle}]: n=${n} が movies.json に存在しない → スキップ`);
        continue;
      }
    } else {
      // nなし → タイトルで検索
      const found = findByTitle(arr, title);
      if (!found) {
        warnings.push(`行${rowNum} [${rawTitle}]: タイトル「${title}」が見つからない → スキップ`);
        continue;
      }
      if (found.__multi__) {
        warnings.push(
          `行${rowNum} [${rawTitle}]: タイトル「${title}」が${found.__multi__.length}件ヒット ` +
          `(n=${found.__multi__.map(x => x.n).join(', ')}) → スキップ (n=XXX形式で指定してください)`
        );
        continue;
      }
      entry = found;
    }

    const oldD = entry.d || '';
    const newD = reviewBody.trim();

    if (oldD === newD) {
      warnings.push(`行${rowNum} [n=${entry.n} ${entry.t}]: レビュー本文が同じ → スキップ`);
      continue;
    }

    updates.push({
      rowNum,
      rawTitle,
      n: entry.n,
      title: entry.t,
      oldD,
      newD,
      entry,
    });
  }

  // --- 警告表示 ---
  if (warnings.length > 0) {
    console.log('【スキップ・要確認】');
    warnings.forEach(w => console.log('  ⚠ ' + w));
    console.log('');
  }

  if (updates.length === 0) {
    console.log('更新対象が0件です。処理を終了します。\n');
    return;
  }

  // --- 更新プレビュー表示 ---
  console.log(`【更新プレビュー】 ${updates.length}件`);
  console.log('─────────────────────────────────────────');

  updates.forEach((u, idx) => {
    console.log(`\n[${idx + 1}/${updates.length}] CSV行${u.rowNum} → n=${u.n} 「${u.title}」`);

    const oldPreview = u.oldD
      ? (u.oldD.length > 80 ? u.oldD.slice(0, 80) + '…' : u.oldD)
      : '（空）';
    const newPreview = u.newD.length > 80 ? u.newD.slice(0, 80) + '…' : u.newD;

    console.log(`  現在: ${oldPreview}`);
    console.log(`  更新: ${newPreview}`);
  });

  console.log('\n─────────────────────────────────────────');
  console.log(`合計 ${updates.length}件を movies.json に書き込みます。`);

  // --- 確認プロンプト ---
  const answer = await confirm('\n実行しますか？ [y/N]: ');

  if (answer !== 'y' && answer !== 'yes') {
    console.log('\nキャンセルしました。movies.json は変更されていません。\n');
    return;
  }

  // --- 書き込み実行 ---
  for (const u of updates) {
    u.entry.d = u.newD;
  }

  fs.writeFileSync(MOVIES_FILE, JSON.stringify(arr, null, 2), 'utf8');

  console.log(`\n✓ movies.json を更新しました。(${updates.length}件)\n`);
  updates.forEach(u => {
    console.log(`  ✓ n=${u.n} 「${u.title}」`);
  });

  // --- HTML ページ再生成 ---
  const { generateHtml } = require('./generate_slug_pages');
  const MOVIES_DIR = path.join(__dirname, '..', 'movies');
  let htmlUpdated = 0;

  console.log('\n【HTML再生成】');
  for (const u of updates) {
    const slug = u.entry.slug;
    if (!slug) {
      console.log(`  ⚠ n=${u.n} 「${u.title}」: slug未設定 → スキップ`);
      continue;
    }
    const dir  = path.join(MOVIES_DIR, slug);
    const file = path.join(dir, 'index.html');
    if (!fs.existsSync(dir)) {
      console.log(`  ⚠ n=${u.n} 「${u.title}」: movies/${slug}/ が存在しない → スキップ`);
      continue;
    }
    fs.writeFileSync(file, generateHtml(u.entry), 'utf8');
    console.log(`  ✓ movies/${slug}/index.html を再生成`);
    htmlUpdated++;
  }
  console.log(`\n✓ ${htmlUpdated}件のHTMLページを再生成しました。`);

  // --- pending_for_form.txt を再生成 ---
  writePendingFile(arr);
}

// レビュー未入力の映画を pending_for_form.txt に書き出す
function writePendingFile(arr) {
  // d フィールドが空または空白のみのものを「未入力」とみなす
  const pending = arr
    .filter(x => x.t && !(x.d || '').trim())
    .sort((a, b) => a.n - b.n)
    .map(x => `${x.t}(n=${x.n})`);

  fs.writeFileSync(PENDING_FILE, pending.join('\n'), 'utf8');

  console.log(`\n✓ pending_for_form.txt を更新しました。(未入力 ${pending.length}件)`);
  console.log('  → git commit & push 後、スプレッドシートの');
  console.log('    「フォーム管理 → GitHub から同期」でドロップダウンを更新できます。\n');
}

main().catch(err => {
  console.error('\n予期しないエラー:', err.message);
  process.exit(1);
});
