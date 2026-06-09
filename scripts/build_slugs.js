// publish_list.json (804本) に english_title / slug を付与する
// Wikidata優先 → ローマ字フォールバック(漢字・ひらがな系) → needs_check(カタカナ系/未確定)
// インクリメンタル保存対応：50件ごとにmovies.jsonへ書き込み、再実行時はスキップ
'use strict';
const fs = require('fs');
const path = require('path');
const Kuroshiro = require('kuroshiro').default;
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

const ROOT = path.resolve(__dirname, '..');
const UA = 'ouchi-de-cinema-slug-builder/1.0 (https://ouchi-de-cinema.com; contact: nave23@gmail.com)';
const SAVE_INTERVAL = 50; // N件ごとにmovies.jsonへ書き込み

// 作品種別とみなすP31(instance of)のQID
const FILM_TYPE_QIDS = new Set([
  'Q11424',    // film
  'Q24869',    // feature film
  'Q24862',    // short film
  'Q202866',   // animated film
  'Q20650540', // anime film
  'Q506240',   // television film
  'Q5398426',  // television series
  'Q1259759',  // animated television series
  'Q93204',    // documentary film
  'Q581714',   // animated film (alt classification, kept defensively)
]);

// お手本6本：確定値
const CONFIRMED = {
  303:  { english_title: 'Whiplash',                slug: 'whiplash-2014' },
  101:  { english_title: 'Almost Famous',           slug: 'almost-famous-2000' },
  2176: { english_title: "David Byrne's American Utopia", slug: 'american-utopia-2020' },
  2719: { english_title: 'GOLDFISH',                slug: 'goldfish-2023' },
  1239: { english_title: 'Listen to the Universe',  slug: 'listen-to-the-universe-2019' },
  1100: { english_title: 'Little Love Song',        slug: 'little-love-song-2019' },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    if (attempt < 3) { await sleep(800 * attempt); return fetchJson(url, attempt + 1); }
    throw e;
  }
}

async function searchWikidata(title) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(title)}&language=ja&uselang=ja&type=item&format=json&limit=10`;
  const data = await fetchJson(url);
  return data.search || [];
}

async function getEntity(id) {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`;
  const data = await fetchJson(url);
  return data.entities[id];
}

function getP31Ids(entity) {
  const claims = (entity.claims && entity.claims.P31) || [];
  return claims.map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id).filter(Boolean);
}

function getYear(entity) {
  const claims = (entity.claims && entity.claims.P577) || [];
  for (const c of claims) {
    const dv = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
    if (dv && dv.time) {
      const m = /^[+-](\d{4})/.exec(dv.time);
      if (m) return m[1];
    }
  }
  return null;
}

function getEnglishTitle(entity) {
  if (entity.labels && entity.labels.en && entity.labels.en.value) return entity.labels.en.value;
  const claims = (entity.claims && entity.claims.P1476) || [];
  for (const c of claims) {
    const dv = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
    if (dv && dv.language === 'en' && dv.text) return dv.text;
  }
  return null;
}

function getJaLabel(entity) {
  return entity.labels && entity.labels.ja && entity.labels.ja.value;
}

// タイトルの文字種を判定: カタカナ主体 / 漢字・ひらがな含む / その他
function classifyScript(title) {
  const katakana = (title.match(/[゠-ヿㇰ-ㇿ]/g) || []).length;
  const kanjiHira = (title.match(/[一-鿿぀-ゟ]/g) || []).length;
  const total = katakana + kanjiHira;
  if (total === 0) return 'other';
  if (katakana > kanjiHira) return 'katakana';
  return 'kanji_hiragana';
}

function slugify(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // 濁点・マクロン等の結合分音記号を除去
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function romajiSlug(kuroshiro, title) {
  const r = await kuroshiro.convert(title, { to: 'romaji', mode: 'spaced', romajiSystem: 'hepburn' });
  return slugify(r);
}

// Wikidataで「日本語ラベル完全一致 かつ 作品種別」の候補が一意に定まるか判定
async function lookupWikidata(title) {
  let candidates;
  try {
    candidates = await searchWikidata(title);
  } catch (e) {
    return { status: 'error', error: String(e) };
  }
  const exactLabelMatches = candidates.filter(c => c.label === title);
  if (exactLabelMatches.length === 0) return { status: 'no_label_match' };

  const confirmed = [];
  for (const cand of exactLabelMatches.slice(0, 5)) {
    await sleep(250);
    let entity;
    try {
      entity = await getEntity(cand.id);
    } catch (e) {
      continue;
    }
    const p31s = getP31Ids(entity);
    if (p31s.some(q => FILM_TYPE_QIDS.has(q))) {
      const en = getEnglishTitle(entity);
      if (en) confirmed.push({ id: cand.id, english_title: en, year: getYear(entity) });
    }
  }
  if (confirmed.length === 1) return { status: 'ok', ...confirmed[0] };
  if (confirmed.length > 1) return { status: 'ambiguous', count: confirmed.length };
  return { status: 'no_film_type_match' };
}

async function main() {
  let publishList = JSON.parse(fs.readFileSync(path.join(ROOT, 'publish_list.json'), 'utf8'));
  if (process.env.SLUG_LIMIT) publishList = publishList.slice(0, Number(process.env.SLUG_LIMIT));
  if (process.env.SLUG_DRYRUN) process.stderr.write('*** DRY RUN: movies.json/needs_check.json は書き込みません ***\n');

  const movies = JSON.parse(fs.readFileSync(path.join(ROOT, 'movies.json'), 'utf8'));
  const movieByKey = new Map(movies.map(m => [`${m.n}_${m.t}`, m]));

  // 既存スラッグを読み込み（再実行時のスキップ用 + 重複回避用）
  const seenSlugs = new Map(); // slug -> true（重複解消用）
  const processedKeys = new Set(); // "n_t" -> スキップ判定用
  for (const m of movies) {
    if (m.slug) {
      seenSlugs.set(m.slug, true);
      processedKeys.add(`${m.n}_${m.t}`);
    }
  }
  const resumeCount = processedKeys.size;
  if (resumeCount > 0) {
    process.stderr.write(`*** 再開モード: ${resumeCount}本はスラッグ付与済みのためスキップ ***\n`);
  }

  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());

  const needsCheck = [];
  // 既存のneeds_check.jsonを読み込み（再実行時にマージ）
  const needsCheckPath = path.join(ROOT, process.env.SLUG_DRYRUN ? 'needs_check.dryrun.json' : 'needs_check.json');
  if (fs.existsSync(needsCheckPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(needsCheckPath, 'utf8'));
      needsCheck.push(...existing);
    } catch (_) {}
  }

  // ログファイル（追記モード）
  const logPath = path.join(ROOT, 'slug_build.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  let countWikidata = 0, countRomaji = 0, countNeedsCheck = 0, countConfirmed = 0;
  let newlyProcessed = 0;

  for (let i = 0; i < publishList.length; i++) {
    const entry = publishList[i];
    const { n, t } = entry;
    const key = `${n}_${t}`;

    // スキップ：既にスラッグが付与済み
    if (processedKeys.has(key)) continue;

    const logLine = `[${i + 1}/${publishList.length}] n=${n} ${t} ... `;
    process.stderr.write(logLine);

    if (CONFIRMED[n]) {
      const c = CONFIRMED[n];
      const m = movieByKey.get(key);
      if (m) { m.english_title = c.english_title; m.slug = c.slug; }
      seenSlugs.set(c.slug, true);
      countConfirmed++;
      newlyProcessed++;
      const line = logLine + `confirmed -> ${c.slug}\n`;
      logStream.write(line);
      process.stderr.write(`confirmed -> ${c.slug}\n`);
      continue;
    }

    const scriptType = classifyScript(t);
    let assigned = false;

    // 1. Wikidata
    await sleep(300);
    const wd = await lookupWikidata(t);
    if (wd.status === 'ok') {
      const base = slugify(wd.english_title);
      let withYear = wd.year ? `${base}-${wd.year}` : base;
      // 重複解消
      let final = withYear;
      let dup = 2;
      while (seenSlugs.has(final)) { final = `${withYear}-${dup}`; dup++; }
      seenSlugs.set(final, true);
      const m = movieByKey.get(key);
      if (m) { m.english_title = wd.english_title; m.slug = final; }
      processedKeys.add(key);
      countWikidata++;
      assigned = true;
      newlyProcessed++;
      const suffix = `wikidata -> ${wd.english_title} (${wd.year || '年不明'})\n`;
      logStream.write(logLine + suffix);
      process.stderr.write(suffix);
    }

    // 2. ローマ字フォールバック（漢字・ひらがな系のみ）
    if (!assigned && scriptType === 'kanji_hiragana') {
      let slug = await romajiSlug(kuroshiro, t);
      let final = slug;
      let dup = 2;
      while (seenSlugs.has(final)) { final = `${slug}-${dup}`; dup++; }
      seenSlugs.set(final, true);
      const m = movieByKey.get(key);
      if (m) { m.english_title = null; m.slug = final; }
      processedKeys.add(key);
      countRomaji++;
      assigned = true;
      newlyProcessed++;
      const suffix = `romaji -> ${final} (wikidata:${wd.status})\n`;
      logStream.write(logLine + suffix);
      process.stderr.write(suffix);
    }

    // 3. needs_check（カタカナ系の未確定 / その他）
    if (!assigned) {
      needsCheck.push({ n, t, reason: scriptType === 'katakana' ? 'カタカナ系・Wikidata未確定' : 'Wikidata未確定・分類困難', wikidata_status: wd.status });
      countNeedsCheck++;
      newlyProcessed++;
      const suffix = `needs_check (${wd.status})\n`;
      logStream.write(logLine + suffix);
      process.stderr.write(suffix);
    }

    // インクリメンタル保存
    if (!process.env.SLUG_DRYRUN && newlyProcessed % SAVE_INTERVAL === 0) {
      fs.writeFileSync(path.join(ROOT, 'movies.json'), JSON.stringify(movies, null, 2), 'utf8');
      fs.writeFileSync(needsCheckPath, JSON.stringify(needsCheck, null, 2), 'utf8');
      process.stderr.write(`  >>> ${newlyProcessed}件処理済み、中間保存完了\n`);
    }
  }

  logStream.end();

  // --- 最終保存 ---
  if (!process.env.SLUG_DRYRUN) {
    fs.writeFileSync(path.join(ROOT, 'movies.json'), JSON.stringify(movies, null, 2), 'utf8');
    fs.writeFileSync(needsCheckPath, JSON.stringify(needsCheck, null, 2), 'utf8');
  }

  // 全体集計（movies.json全体から算出）
  const allWithSlug = movies.filter(m => m.slug);
  const reportPath = path.join(ROOT, process.env.SLUG_DRYRUN ? 'slug_report.dryrun.json' : 'slug_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    total_publish_list: publishList.length,
    newly_processed: newlyProcessed,
    confirmed: countConfirmed,
    wikidata: countWikidata,
    romaji: countRomaji,
    needs_check: countNeedsCheck,
    total_movies_with_slug: allWithSlug.length,
  }, null, 2), 'utf8');

  console.log('\n=== 完了 ===');
  console.log('publish_list合計:', publishList.length);
  console.log('今回新規処理:', newlyProcessed);
  console.log('  お手本確定値:', countConfirmed);
  console.log('  Wikidata採用:', countWikidata);
  console.log('  ローマ字フォールバック:', countRomaji);
  console.log('  needs_check:', countNeedsCheck);
  console.log('movies.jsonスラッグ付与総数:', allWithSlug.length);
}

main().catch(e => { console.error(e); process.exit(1); });
