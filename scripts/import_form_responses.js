'use strict';
/**
 * scripts/import_form_responses.js
 *
 * Google Forms の回答CSV を movies.json に取り込む。
 *
 * 対応形式:
 *   【新形式・9列】タイムスタンプ / 映画タイトル / 公開年 / レビュー本文 /
 *                  監督 / 作曲家(劇伴) / 主題歌・挿入歌 / ジャンル / 備考
 *   【旧形式・3列】タイムスタンプ / 作品名(n=XXX可) / レビュー本文
 *
 * 使い方:
 *   node scripts/import_form_responses.js [--preview] [CSVファイルパス]
 *   --preview : プレビューのみ。movies.json・マスターへの書き込みをしない
 *   ファイルパス省略時: ./form_responses.csv
 */

const fs   = require('fs');
const path = require('path');
const rl   = require('readline');

const ROOT        = path.resolve(__dirname, '..');
const MOVIES_FILE = path.join(ROOT, 'movies.json');
const MASTERS_DIR = path.join(ROOT, 'data', 'masters');
const IMPORT_LOG  = path.join(ROOT, 'data', 'import-log.json');

const args        = process.argv.slice(2);
const PREVIEW     = args.includes('--preview');
const CSV_FILE    = args.find(a => !a.startsWith('-')) ||
                    path.join(ROOT, 'form_responses.csv');

// ── CSV パーサー (RFC 4180・BOM対応) ─────────────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let col = '', row = [], inQ = false;
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  if (!text.endsWith('\n')) text += '\n';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') { col += '"'; i++; }
      else if (ch === '"') inQ = false;
      else col += ch;
    } else {
      if      (ch === '"')                   inQ = true;
      else if (ch === ',')                   { row.push(col); col = ''; }
      else if (ch === '\r' && nx === '\n')   { row.push(col); col = ''; rows.push(row); row = []; i++; }
      else if (ch === '\n')                  { row.push(col); col = ''; rows.push(row); row = []; }
      else                                   col += ch;
    }
  }
  return rows.filter(r => r.some(c => c.trim()));
}

// ── フォーマット自動検出 ──────────────────────────────────────────────────────

function detectFormat(dataRows) {
  // dataRows[0] = 最初のデータ行(ヘッダースキップ済み)
  if (!dataRows.length) return 'unknown';
  const r = dataRows[0];
  // 新形式: col[2] が 4桁の年 かつ col数 >= 4
  if (r.length >= 4 && /^\d{4}$/.test((r[2] || '').trim())) return 'new';
  return 'legacy';
}

// ── 正規化・パース ────────────────────────────────────────────────────────────

function normalizeTitle(s) {
  return (s || '').trim()
    .replace(/\s+/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .toLowerCase();
}

function parseGenres(raw, validGenres) {
  if (!raw || !raw.trim()) return [];
  const parsed = raw.split(',')
    .map(g => g.trim().replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
  const valid = [], invalid = [];
  for (const g of parsed) {
    if (validGenres.includes(g)) valid.push(g);
    else invalid.push(g);
  }
  return { valid, invalid };
}

function parseThemeSong(raw) {
  if (!raw || !raw.trim()) return [];
  // 複数曲はセミコロン区切りに対応
  return raw.split(';').map(item => {
    const parts = item.split('/');
    if (parts.length >= 2) {
      return { name: parts[0].trim(), song: parts.slice(1).join('/').trim(), role: '主題歌' };
    }
    return { name: item.trim(), song: null, role: '主題歌' };
  }).filter(a => a.name);
}

function parseComposers(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(/[,、]/).map(s => s.trim()).filter(Boolean);
}

function slugify(name) {
  const s = name.trim().toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  // 日本語等でスラッグが空になる場合は要手動設定のプレースホルダー
  return s || 'REQUIRES-MANUAL-SLUG';
}

// ── マスター操作 ──────────────────────────────────────────────────────────────

function loadMasters() {
  const read = (file, key) => {
    const p = path.join(MASTERS_DIR, file);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8'))[key] || [] : [];
  };
  return {
    composers: read('composers.json', 'entries'),
    artists:   read('artists.json',   'entries'),
    genres:    read('genres.json',    'genres'),
  };
}

function findInMaster(name, entries) {
  const n = s => (s || '').trim().toLowerCase().replace(/[\s　]+/g, '');
  return entries.find(e =>
    n(e.name) === n(name) ||
    n(e.name_en) === n(name) ||
    (e.aliases || []).some(a => n(a) === n(name))
  );
}

// ── インポートログ ────────────────────────────────────────────────────────────

function loadImportLog() {
  if (!fs.existsSync(IMPORT_LOG)) return { processed: [] };
  try { return JSON.parse(fs.readFileSync(IMPORT_LOG, 'utf8')); }
  catch { return { processed: [] }; }
}

function saveImportLog(log) {
  fs.mkdirSync(path.dirname(IMPORT_LOG), { recursive: true });
  fs.writeFileSync(IMPORT_LOG, JSON.stringify(log, null, 2), 'utf8');
}

// ── 重複チェック ──────────────────────────────────────────────────────────────

function checkDuplicate(title, year, movies) {
  const nt = normalizeTitle(title);
  const exact = movies.filter(e => normalizeTitle(e.t) === nt);
  if (exact.length) return { type: 'exact', entries: exact };
  // 部分一致
  const partial = movies.filter(e => e.t && (
    normalizeTitle(e.t).includes(nt) || nt.includes(normalizeTitle(e.t))
  ));
  if (partial.length) return { type: 'partial', entries: partial };
  return null;
}

// ── 対話プロンプト ────────────────────────────────────────────────────────────

function prompt(question) {
  const i = rl.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => i.question(question, a => { i.close(); r(a.trim()); }));
}

// ── メイン ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Google Forms インポーター' + (PREVIEW ? ' [プレビューモード]' : ''));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!fs.existsSync(CSV_FILE)) {
    console.error('エラー: CSVが見つかりません →', CSV_FILE); process.exit(1);
  }
  if (!fs.existsSync(MOVIES_FILE)) {
    console.error('エラー: movies.json が見つかりません'); process.exit(1);
  }

  const movies  = JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf8'));
  const masters = loadMasters();
  const log     = loadImportLog();
  const maxN    = Math.max(...movies.map(e => e.n));

  console.log(`movies.json: ${movies.length}件 / 最大n: ${maxN}`);
  console.log(`CSV: ${CSV_FILE}\n`);

  // CSV パース
  const csvText = fs.readFileSync(CSV_FILE, 'utf8');
  const rows    = parseCsv(csvText);
  if (!rows.length) { console.error('CSVが空です'); process.exit(1); }

  // ヘッダー行スキップ判定
  const headerKw = ['タイムスタンプ', 'Timestamp', '映画タイトル', '作品名'];
  const isHeader = headerKw.some(kw =>
    (rows[0][0] || '').includes(kw) || (rows[0][1] || '').includes(kw)
  );
  const dataRows = isHeader ? rows.slice(1) : rows;
  const format   = detectFormat(dataRows);

  console.log(`フォーマット検出: ${format === 'new' ? '新形式(9列)' : '旧形式(3列)'}`);
  console.log(`データ行数: ${dataRows.length}\n`);

  // 結果バケット
  const toAdd    = [];   // 新規追加
  const toUpdate = [];   // 既存更新候補（重複疑い）
  const skipped  = [];   // スキップ
  const newComposers = [], newArtists = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row    = dataRows[i];
    const rowNum = (isHeader ? i + 2 : i + 1);

    // インポート済みチェック
    const timestamp = (row[0] || '').trim();
    if (log.processed.includes(timestamp)) {
      skipped.push({ rowNum, reason: 'インポート済み', timestamp });
      continue;
    }

    let title, year, review, director, composerRaw, themeSongRaw, genreRaw, note;

    if (format === 'new') {
      title        = (row[1] || '').trim();
      year         = (row[2] || '').trim().replace(/[^0-9]/g, '');
      review       = (row[3] || '').trim();
      director     = (row[4] || '').trim();
      composerRaw  = (row[5] || '').trim();
      themeSongRaw = (row[6] || '').trim();
      genreRaw     = (row[7] || '').trim();
      note         = (row[8] || '').trim();
    } else {
      // 旧形式: col1 に「タイトル(n=XXX)」形式
      const m = (row[1] || '').match(/^(.+?)\s*[（(]n=(\d+)[）)]\s*$/);
      title  = m ? m[1].trim() : (row[1] || '').trim();
      year   = '';
      review = (row[2] || '').trim();
      director = composerRaw = themeSongRaw = genreRaw = note = '';
    }

    if (!title) { skipped.push({ rowNum, reason: 'タイトル空' }); continue; }
    if (!review) { skipped.push({ rowNum, reason: 'レビュー本文空' }); continue; }
    if (year && !/^\d{4}$/.test(year)) {
      skipped.push({ rowNum, reason: `公開年不正(${year})` }); continue;
    }

    // ジャンル処理
    const genreResult = parseGenres(genreRaw, masters.genres);
    const genres      = genreResult.valid;

    // 主題歌パース
    const artists = parseThemeSong(themeSongRaw);

    // 作曲家パース
    const composers = parseComposers(composerRaw);

    // マスター照合: 作曲家
    for (const cName of composers) {
      if (!cName) continue;
      const found = findInMaster(cName, masters.composers);
      if (!found && !newComposers.find(c => c.name === cName)) {
        const slug = slugify(cName);
        newComposers.push({ name: cName, name_en: cName, slug, aliases: [] });
      }
    }

    // マスター照合: アーティスト
    for (const a of artists) {
      if (!a.name) continue;
      const found = findInMaster(a.name, masters.artists);
      if (!found && !newArtists.find(x => x.name === a.name)) {
        const slug = slugify(a.name);
        newArtists.push({ name: a.name, name_en: a.name, slug, aliases: [] });
      }
    }

    // 重複チェック
    const dup = checkDuplicate(title, year, movies);
    if (dup) {
      toUpdate.push({
        rowNum, timestamp, title, year, review, director,
        composers, artists, genres,
        genreInvalid: genreResult.invalid,
        note, dup,
      });
      continue;
    }

    // 新規追加対象
    toAdd.push({
      rowNum, timestamp, title, year, review, director,
      composers, artists, genres,
      genreInvalid: genreResult.invalid,
      note,
    });
  }

  // ── プレビュー出力 ─────────────────────────────────────────────────────────

  // マスター追加案
  if (newComposers.length || newArtists.length) {
    console.log('【マスター新規追加案】');
    if (newComposers.length) {
      console.log('  composers.json:');
      newComposers.forEach(c =>
        console.log(`    ・${c.name}  slug案: ${c.slug}`)
      );
    }
    if (newArtists.length) {
      console.log('  artists.json:');
      newArtists.forEach(a =>
        console.log(`    ・${a.name}  slug案: ${a.slug}`)
      );
    }
    console.log();
  }

  // 重複疑いリスト
  if (toUpdate.length) {
    console.log(`【重複疑い】 ${toUpdate.length}件 → ユーザー判断が必要`);
    console.log('─────────────────────────────────────────────────');
    toUpdate.forEach((u, idx) => {
      const existingEntry = u.dup.entries[0];
      const existingD = (existingEntry.d || '');
      console.log(`\n[重複${idx+1}] CSV行${u.rowNum}: 「${u.title}」(${u.year})`);
      console.log(`  一致種別: ${u.dup.type === 'exact' ? '完全一致' : '部分一致'}`);
      console.log(`  既存エントリー: n=${existingEntry.n} / slug=${existingEntry.slug || 'なし'}`);
      console.log(`  既存dフィールド: ${existingD ? existingD.length + '字あり（' + existingD.substring(0,40) + '…）' : '空'}`);
      console.log(`  CSVレビュー冒頭: 「${u.review.substring(0, 60)}…」`);
      console.log(`  選択肢: [s]スキップ / [u]既存のdを更新 / [a]別エントリーとして追加`);
    });
    console.log();
  }

  // 新規追加プレビュー
  if (toAdd.length) {
    console.log(`【新規追加】 ${toAdd.length}件`);
    console.log('─────────────────────────────────────────────────');
    toAdd.forEach((item, idx) => {
      console.log(`\n[新規${idx+1}] CSV行${item.rowNum}`);
      console.log(`  タイトル: ${item.title} (${item.year})`);
      console.log(`  監督: ${item.director || '未入力'}`);
      console.log(`  作曲家: ${item.composers.join(', ') || '未入力'}`);
      console.log(`  主題歌: ${item.artists.map(a => a.name + (a.song ? ' / ' + a.song : '')).join('; ') || '未入力'}`);
      console.log(`  ジャンル: ${item.genres.join(', ') || '未入力'}${item.genreInvalid.length ? ' ⚠不明:' + item.genreInvalid.join(',') : ''}`);
      console.log(`  レビュー冒頭: 「${item.review.substring(0, 50)}…」(${item.review.length}字)`);
    });
    console.log();
  }

  // スキップ
  if (skipped.length) {
    console.log(`【スキップ】 ${skipped.length}件`);
    skipped.forEach(s => console.log(`  行${s.rowNum}: ${s.reason}`));
    console.log();
  }

  // サマリー
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  新規追加: ${toAdd.length}件 / 重複疑い: ${toUpdate.length}件 / スキップ: ${skipped.length}件`);
  console.log(`  マスター新規: 作曲家${newComposers.length}件・アーティスト${newArtists.length}件`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (PREVIEW) {
    console.log('\n[プレビューモード] movies.json・マスターへの書き込みは行いません。');
    console.log('書き込むには --preview を外して実行し、確認プロンプトに y を入力してください。\n');
    return;
  }

  // ── 書き込み（非プレビュー時）────────────────────────────────────────────

  if (!toAdd.length && !toUpdate.length) {
    console.log('\n更新対象が0件です。\n'); return;
  }

  // 重複疑いを対話処理
  const updateEntries = [];
  for (const u of toUpdate) {
    const ans = await prompt(`\n「${u.title}」の重複 [s]スキップ / [u]既存を更新 / [a]別途追加: `);
    if (ans === 'u') updateEntries.push(u);
    else if (ans === 'a') toAdd.push(u);
    // s またはその他 → スキップ
  }

  const ans = await prompt(`\n${toAdd.length}件追加・${updateEntries.length}件更新します。実行しますか？ [y/N]: `);
  if (ans.toLowerCase() !== 'y') {
    console.log('キャンセルしました。\n'); return;
  }

  let nextN = maxN + 1;

  // 新規追加
  for (const item of toAdd) {
    const entry = {
      n:    nextN++,
      t:    item.title,
      d:    item.review,
      s:    false,
      y:    `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + ' 予告')}`,
      yt:   's',
    };
    if (item.year)               entry.year_pub    = parseInt(item.year, 10);
    if (item.director)           entry.director    = item.director;
    if (item.composers.length)   entry.music = { composer: item.composers, artists: item.artists };
    else if (item.artists.length) entry.music = { composer: [], artists: item.artists };
    if (item.genres.length)      entry.genre       = item.genres;
    movies.push(entry);
    log.processed.push(item.timestamp);
    console.log(`✓ 追加: n=${entry.n} 「${entry.t}」`);
  }

  // 既存更新
  for (const u of updateEntries) {
    const target = movies.find(e => e.n === u.dup.entries[0].n);
    if (!target) continue;
    target.d = u.review;
    if (u.director)           target.director = u.director;
    if (u.composers.length || u.artists.length)
      target.music = { composer: u.composers, artists: u.artists };
    if (u.genres.length)      target.genre    = u.genres;
    log.processed.push(u.timestamp);
    console.log(`✓ 更新: n=${target.n} 「${target.t}」`);
  }

  // マスター更新
  if (newComposers.length) {
    const cp = path.join(MASTERS_DIR, 'composers.json');
    const data = JSON.parse(fs.readFileSync(cp, 'utf8'));
    data.entries.push(...newComposers);
    fs.writeFileSync(cp, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ composers.json に${newComposers.length}件追加`);
  }
  if (newArtists.length) {
    const ap = path.join(MASTERS_DIR, 'artists.json');
    const data = JSON.parse(fs.readFileSync(ap, 'utf8'));
    data.entries.push(...newArtists);
    fs.writeFileSync(ap, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ artists.json に${newArtists.length}件追加`);
  }

  // movies.json 書き込み
  fs.writeFileSync(MOVIES_FILE, JSON.stringify(movies, null, 2), 'utf8');
  saveImportLog(log);
  console.log(`\n✓ movies.json 更新完了 / import-log.json 更新完了`);

  // HTML再生成（slug付きエントリーのみ）
  try {
    const { generateHtml } = require('./generate_slug_pages');
    const MOVIES_DIR = path.join(ROOT, 'movies');
    let htmlCount = 0;
    for (const u of updateEntries) {
      const slug = u.dup.entries[0].slug;
      if (!slug) continue;
      const file = path.join(MOVIES_DIR, slug, 'index.html');
      if (!fs.existsSync(path.dirname(file))) continue;
      const entry = movies.find(e => e.n === u.dup.entries[0].n);
      fs.writeFileSync(file, generateHtml(entry), 'utf8');
      console.log(`✓ HTML再生成: movies/${slug}/index.html`);
      htmlCount++;
    }
    if (htmlCount) console.log(`✓ ${htmlCount}件のHTMLを再生成`);
  } catch (e) {
    console.log('⚠ HTML再生成スキップ（generate_slug_pages.js 読み込みエラー）');
  }

  console.log('\n完了。git commit & push をお忘れなく。\n');
}

main().catch(err => {
  console.error('予期しないエラー:', err.message, err.stack);
  process.exit(1);
});
