'use strict';
// B判定ページ（dフィールド200字未満）にnoindexを付与するワンショットスクリプト
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function reviewLen(d) {
  if (!d) return 0;
  return d.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, '').length;
}

const movies = JSON.parse(fs.readFileSync(path.join(ROOT, 'movies.json'), 'utf8'));
const SKIP_N = new Set([303, 101, 2176, 2719, 1239, 1100]);

const bPages = movies.filter(m =>
  m.slug && !SKIP_N.has(m.n) && reviewLen(m.d) < 200
);

let patched = 0, alreadyNoindex = 0, missing = 0;

for (const m of bPages) {
  const file = path.join(ROOT, 'movies', m.slug, 'index.html');
  if (!fs.existsSync(file)) { missing++; continue; }

  let html = fs.readFileSync(file, 'utf8');

  if (html.includes('noindex')) { alreadyNoindex++; continue; }

  // robots metaを noindex に差し替え
  html = html.replace(
    /<meta name="robots" content="index, follow[^"]*">/,
    '<meta name="robots" content="noindex, nofollow">'
  );

  fs.writeFileSync(file, html, 'utf8');
  patched++;
}

console.log(`noindexパッチ完了: ${patched}件 / 既にnoindex: ${alreadyNoindex}件 / HTMLなし: ${missing}件`);
console.log(`B判定合計: ${bPages.length}件`);
