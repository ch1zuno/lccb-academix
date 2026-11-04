/* Bundle budget guard: production builds should not silently regress into a
 * single 1 MB entry chunk. Limits are gzip bytes. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const dir = path.resolve('dist/assets');
if (!fs.existsSync(dir)) {
  console.error('dist/assets not found — run npm run build first.');
  process.exit(1);
}
const js = fs.readdirSync(dir).filter((name) => name.endsWith('.js'));
const sizes = js.map((name) => {
  const raw = fs.readFileSync(path.join(dir, name));
  return { name, raw: raw.length, gzip: zlib.gzipSync(raw).length };
});
const main = sizes.find((file) => /^index-.*\.js$/.test(file.name));
const totalGzip = sizes.reduce((sum, file) => sum + file.gzip, 0);
const MAIN_BUDGET = 180 * 1024;
const TOTAL_BUDGET = 600 * 1024;
console.log(`main: ${main ? `${(main.gzip / 1024).toFixed(1)} KB gzip (${main.name})` : 'missing'}`);
console.log(`all JS: ${(totalGzip / 1024).toFixed(1)} KB gzip across ${sizes.length} chunks`);
if (!main) {
  console.error('No index-*.js entry chunk found.');
  process.exit(1);
}
if (main.gzip > MAIN_BUDGET) {
  console.error(`Entry chunk exceeds ${MAIN_BUDGET / 1024} KB gzip.`);
  process.exit(1);
}
if (totalGzip > TOTAL_BUDGET) {
  console.error(`Total JS exceeds ${TOTAL_BUDGET / 1024} KB gzip.`);
  process.exit(1);
}
console.log('Bundle budget passed.');
