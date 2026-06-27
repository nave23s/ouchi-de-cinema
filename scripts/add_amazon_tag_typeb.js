'use strict';
// Type B 旧テンプレートページ（65本）のAmazonリンクにアフィリタグを付与する
// 対象: movies/{n}/index.html の amazon.co.jp/s?k=... URL
// Type A（スラッグページ）・Type C（手書き6本）には一切触れない
const fs   = require('fs');
const path = require('path');

const AFFILIATE_ID = 'ouchidecinama-22';
const ROOT = path.resolve(__dirname, '..');

const TYPE_B_NUMS = [
  6, 58, 2595, 2597, 2599, 2600, 2601, 2602, 2603, 2604, 2606,
  2619, 2620, 2621, 2622, 2623, 2624, 2626, 2627, 2628, 2629, 2630,
  2631, 2632, 2635, 2641, 2642, 2650, 2651, 2654, 2655, 2656, 2657,
  2658, 2661, 2662, 2663, 2664, 2665, 2666, 2667, 2668, 2669, 2670,
  2680, 2681, 2682, 2683, 2686, 2689, 2690, 2692, 2695, 2697, 2698,
  2699, 2701, 2702, 2703, 2704, 2705, 2707, 2712, 2713, 2716,
];

let updatedFiles = 0;
let skippedFiles = 0;
let totalTagged  = 0;

for (const n of TYPE_B_NUMS) {
  const file = path.join(ROOT, 'movies', String(n), 'index.html');

  if (!fs.existsSync(file)) {
    console.log(`MISSING  n=${n}: ファイルなし`);
    continue;
  }

  const html = fs.readFileSync(file, 'utf8');

  // 冪等性: 既にタグがあればこのファイル全体をスキップ
  if (html.includes(`tag=${AFFILIATE_ID}`)) {
    skippedFiles++;
    console.log(`SKIP     n=${n}: 既にタグあり`);
    continue;
  }

  let changed = 0;
  const newHtml = html.replace(
    /href="(https?:\/\/[^"]*amazon\.co\.jp\/s\?k=[^"]+)"/g,
    (_, url) => {
      changed++;
      return `href="${url}&tag=${AFFILIATE_ID}"`;
    }
  );

  fs.writeFileSync(file, newHtml, 'utf8');
  updatedFiles++;
  totalTagged += changed;
  console.log(`UPDATED  n=${n}: ${changed}件`);
}

console.log('');
console.log('=== 完了 ===');
console.log(`更新ファイル: ${updatedFiles}本`);
console.log(`スキップ    : ${skippedFiles}本`);
console.log(`タグ付与    : ${totalTagged}件`);
