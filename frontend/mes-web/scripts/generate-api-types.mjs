// contracts/openapi.yaml에서 타입을 생성한다. 생성물은 손으로 고치지 않는다.
// --check: 커밋된 생성물과 다르면 실패한다(계약과 생성물의 drift 감지). 파일은 바꾸지 않는다.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = resolve(root, '../../contracts/openapi.yaml');
const committed = resolve(root, 'src/platform/api/generated/schema.d.ts');
const bin = resolve(root, 'node_modules/.bin/openapi-typescript');
const check = process.argv.includes('--check');

if (!check) {
  execFileSync(bin, [contract, '--output', committed], { stdio: 'inherit' });
} else {
  const dir = mkdtempSync(join(tmpdir(), 'mes-api-'));
  try {
    const fresh = join(dir, 'schema.d.ts');
    execFileSync(bin, [contract, '--output', fresh], { stdio: 'ignore' });
    if (readFileSync(fresh, 'utf8') !== readFileSync(committed, 'utf8')) {
      console.error('generated/schema.d.ts is out of date. Run `npm run api:generate` and commit.');
      process.exit(1);
    }
    console.log('generated/schema.d.ts matches contracts/openapi.yaml');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
