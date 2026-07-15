'use strict';
const fs   = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function reviewLen(d) {
  if (!d) return 0;
  return d.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, '').length;
}

const movies = JSON.parse(fs.readFileSync(path.join(ROOT, 'movies.json'), 'utf8'));

// 1. B判定ページのnoindex確認
const B = movies.filter(m => m.slug && reviewLen(m.d) < 200);
let bNoindex = 0, bIndex = 0, bMissing = 0;
for (const m of B) {
  const p = path.join(ROOT, 'movies', m.slug, 'index.html');
  if (!fs.existsSync(p)) { bMissing++; continue; }
  const content = fs.readFileSync(p, 'utf8').slice(0, 800);
  if (content.includes('noindex')) bNoindex++;
  else bIndex++;
}
console.log('=== B判定ページ noindex確認 ===');
console.log('noindex済み:', bNoindex);
console.log('まだindex  :', bIndex, '← これが0でないと問題');
console.log('HTMLなし   :', bMissing);

// 2. A判定ページがnoindexになっていないか確認（サンプル）
const A = movies.filter(m => m.slug && reviewLen(m.d) >= 200);
let aNoindex = 0;
for (const m of A) {
  const p = path.join(ROOT, 'movies', m.slug, 'index.html');
  if (!fs.existsSync(p)) continue;
  const content = fs.readFileSync(p, 'utf8').slice(0, 800);
  if (content.includes('noindex')) aNoindex++;
}
console.log('\n=== A判定ページ（誤noindex確認）===');
console.log('誤ってnoindexになったA判定:', aNoindex, '← これが0でないと問題');

// 3. sitemapのURL数確認
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urlCount = (sitemap.match(/<url>/g) || []).length;
console.log('\n=== sitemap確認 ===');
console.log('sitemapに含まれるURL数:', urlCount);

// 4. ジャンルハブ内のリンク先がA判定のみか確認（サンプル: drama）
const dramaFile = path.join(ROOT, 'genres', 'drama', 'index.html');
if (fs.existsSync(dramaFile)) {
  const dramaHtml = fs.readFileSync(dramaFile, 'utf8');
  const links = dramaHtml.match(/href="https:\/\/ouchi-de-cinema\.com\/movies\/([^\/]+)\/"/g) || [];
  let hubBCount = 0;
  for (const link of links) {
    const slug = link.match(/movies\/([^\/]+)\//)?.[1];
    if (!slug) continue;
    const m = movies.find(x => x.slug === slug);
    if (m && reviewLen(m.d) < 200) hubBCount++;
  }
  console.log('\n=== ジャンルハブ(drama)確認 ===');
  console.log('リンク総数:', links.length, '/ うちB判定リンク:', hubBCount, '← これが0であること');
}

console.log('\n=== フィールド名確認 ===');
const sample = movies[0];
const requiredFields = ['n','t','d','s','y','yt','english_title','slug'];
const missingFields = requiredFields.filter(f => !(f in sample));
console.log('必須フィールド欠落:', missingFields.length === 0 ? 'なし（OK）' : missingFields.join(','));
