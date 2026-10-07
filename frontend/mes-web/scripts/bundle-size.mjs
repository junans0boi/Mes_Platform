// 빌드 산출물(dist/assets/*.js)의 raw·gzip 크기를 기록한다. 예산 검사는 FE-03 이후 Shell route 기준으로 추가한다.
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dir = new URL('../dist/assets/', import.meta.url).pathname;
const files = (await readdir(dir)).filter((f) => f.endsWith('.js'));
let total = 0;
const rows = [];
for (const f of files) {
  const buf = await readFile(join(dir, f));
  const gz = gzipSync(buf).length;
  total += gz;
  rows.push({ file: f, rawKB: +(buf.length / 1024).toFixed(1), gzipKB: +(gz / 1024).toFixed(1) });
}
rows.sort((a, b) => b.gzipKB - a.gzipKB);
console.table(rows);
console.log(`total JS gzip: ${(total / 1024).toFixed(1)} KB (${files.length} files)`);

// 초기 Shell route 예산: index.html이 로딩하는 JS(script, modulepreload)의 gzip 합계.
// lazy route chunk는 포함하지 않는다. 예산 300KB는 설계 §13.1의 초기 목표이며 benchmark 후 조정할 수 있다.
const budgetKB = 300;
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
let initialGzip = 0;
for (const f of initial) initialGzip += gzipSync(await readFile(join(dir, f))).length;
const initialKB = initialGzip / 1024;
console.log(
  `initial Shell JS gzip: ${initialKB.toFixed(1)} KB (${initial.length} files, budget ${budgetKB} KB)`,
);
if (initialKB > budgetKB) {
  console.error('초기 JS 예산을 초과했습니다.');
  process.exitCode = 1;
}
