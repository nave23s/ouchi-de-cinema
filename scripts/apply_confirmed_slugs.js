'use strict';
// confirmed_slugs_final.json のうち、まだ slug が未設定の120本を movies.json に反映する
// (english_title / slug フィールドを追加)。実行前に movies.json をバックアップする。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function main() {
  const moviesPath = path.join(ROOT, 'movies.json');
  const movies = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
  const confirmed = JSON.parse(fs.readFileSync(path.join(ROOT, 'confirmed_slugs_final.json'), 'utf8'));

  // バックアップ
  const backupPath = path.join(ROOT, 'movies.json.backup-2026-06-12');
  fs.writeFileSync(backupPath, JSON.stringify(movies, null, 2), 'utf8');

  let updated = 0;
  let alreadySet = 0;
  const notFound = [];

  for (const c of confirmed) {
    const matches = movies.filter(m => m.n === c.n && m.t === c.t);
    if (matches.length === 0) { notFound.push(c); continue; }

    let target = matches[0];
    if (matches.length > 1) {
      // 同一(n,t)が複数存在する場合、レビュー本文(d)があるものを優先
      const withD = matches.find(m => m.d && m.d.trim());
      if (withD) target = withD;
    }

    if (target.slug) { alreadySet++; continue; }

    target.english_title = c.english_title;
    target.slug = c.slug;
    updated++;
  }

  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2), 'utf8');

  console.log(JSON.stringify({
    total_confirmed: confirmed.length,
    updated,
    already_set: alreadySet,
    not_found: notFound.length,
    backup: path.basename(backupPath),
  }, null, 2));
  if (notFound.length) console.log('NOT FOUND:', JSON.stringify(notFound.map(c => ({ n: c.n, t: c.t }))));
}
main();
